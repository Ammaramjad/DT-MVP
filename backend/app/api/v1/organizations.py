"""
Organization API endpoints with RBAC for multi-tenant management.
"""
from typing import List
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.org_membership import OrgMembership, OrgRole
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/orgs", tags=["organizations"])


@router.get("", response_model=List[OrganizationResponse])
async def list_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[OrganizationResponse]:
    """
    List all organizations the current user has access to.
    
    Args:
        current_user: Authenticated user
        db: Database session
        
    Returns:
        List of organizations
    """
    # Get user's organization memberships
    memberships = db.query(OrgMembership).filter(
        OrgMembership.user_id == current_user.id
    ).all()
    
    org_ids = [m.org_id for m in memberships]
    
    organizations = db.query(Organization).filter(
        Organization.id.in_(org_ids)
    ).all()
    
    return [OrganizationResponse.model_validate(org) for org in organizations]


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> OrganizationResponse:
    """
    Create a new organization.
    
    The current user becomes the owner of the created organization.
    
    Args:
        org_data: Organization creation data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Created organization details
    """
    # Generate unique slug
    base_slug = org_data.name.lower().replace(" ", "-").replace("_", "-")
    org_slug = f"{base_slug}-{str(uuid4())[:8]}"
    
    # Create organization
    new_org = Organization(
        name=org_data.name,
        slug=org_slug,
        settings={}
    )
    db.add(new_org)
    db.flush()
    
    # Add current user as owner
    membership = OrgMembership(
        user_id=current_user.id,
        org_id=new_org.id,
        role=OrgRole.OWNER
    )
    db.add(membership)
    
    db.commit()
    db.refresh(new_org)
    
    return OrganizationResponse.model_validate(new_org)


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> OrganizationResponse:
    """
    Get organization details by ID.
    
    Args:
        org_id: Organization ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Organization details
        
    Raises:
        HTTPException: If organization not found or user lacks access
    """
    # Check user membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization"
        )
    
    organization = db.query(Organization).filter(Organization.id == org_id).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return OrganizationResponse.model_validate(organization)


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    org_data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> OrganizationResponse:
    """
    Update organization details.
    
    Only organization owners and admins can update organizations.
    
    Args:
        org_id: Organization ID
        org_data: Organization update data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Updated organization details
        
    Raises:
        HTTPException: If organization not found or user lacks permission
    """
    # Check user membership and role
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization"
        )
    
    if membership.role not in [OrgRole.OWNER, OrgRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can update organizations"
        )
    
    organization = db.query(Organization).filter(Organization.id == org_id).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Update fields
    update_data = org_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)
    
    db.commit()
    db.refresh(organization)
    
    return OrganizationResponse.model_validate(organization)


@router.get("/{org_id}/users", response_model=List[UserResponse])
async def list_organization_users(
    org_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[UserResponse]:
    """
    List all users in an organization.
    
    Args:
        org_id: Organization ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        List of users in the organization
        
    Raises:
        HTTPException: If organization not found or user lacks access
    """
    # Check user membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization"
        )
    
    # Get all memberships for this organization
    memberships = db.query(OrgMembership).filter(
        OrgMembership.org_id == org_id
    ).all()
    
    user_ids = [m.user_id for m in memberships]
    
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    
    return [UserResponse.model_validate(user) for user in users]


@router.post("/{org_id}/users/invite", status_code=status.HTTP_201_CREATED)
async def invite_user_to_organization(
    org_id: UUID,
    email: str,
    role: OrgRole = OrgRole.MEMBER,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Invite a user to join an organization.
    
    Only owners and admins can invite users. If user doesn't exist, they need to register first.
    
    Args:
        org_id: Organization ID
        email: Email of user to invite
        role: Role to assign (default: MEMBER)
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Invitation status message
        
    Raises:
        HTTPException: If organization not found or user lacks permission
    """
    # Check user membership and role
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization"
        )
    
    if membership.role not in [OrgRole.OWNER, OrgRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can invite users"
        )
    
    # Find user by email
    invite_user = db.query(User).filter(User.email == email.lower()).first()
    
    if not invite_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. User must register first."
        )
    
    # Check if user is already a member
    existing_membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == org_id,
        OrgMembership.user_id == invite_user.id
    ).first()
    
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this organization"
        )
    
    # Create membership
    new_membership = OrgMembership(
        user_id=invite_user.id,
        org_id=org_id,
        role=role
    )
    db.add(new_membership)
    db.commit()
    
    return {
        "message": f"User {email} successfully added to organization",
        "user_id": str(invite_user.id),
        "role": role.value
    }
