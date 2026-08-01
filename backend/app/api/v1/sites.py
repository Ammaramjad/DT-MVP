"""
Site API endpoints with organization isolation.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.project import Project
from app.models.org_membership import OrgMembership, OrgRole
from app.schemas.site import (
    SiteCreate,
    SiteUpdate,
    SiteResponse,
)

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("", response_model=List[SiteResponse])
async def list_sites(
    project_id: UUID = None,
    org_id: UUID = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[SiteResponse]:
    """
    List all sites accessible to the current user.
    
    Optionally filter by project ID or organization ID.
    
    Args:
        project_id: Optional project ID filter
        org_id: Optional organization ID filter
        current_user: Authenticated user
        db: Database session
        
    Returns:
        List of sites
    """
    # Get user's organization memberships
    memberships = db.query(OrgMembership).filter(
        OrgMembership.user_id == current_user.id
    ).all()
    
    org_ids = [m.org_id for m in memberships]
    
    # Build query
    query = db.query(Site).filter(Site.org_id.in_(org_ids))
    
    if org_id:
        # Verify user has access to this org
        if org_id not in org_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this organization"
            )
        query = query.filter(Site.org_id == org_id)
    
    if project_id:
        # Verify project belongs to accessible organization
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project or project.org_id not in org_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )
        query = query.filter(Site.project_id == project_id)
    
    sites = query.all()
    
    return [SiteResponse.model_validate(site) for site in sites]


@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    site_data: SiteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SiteResponse:
    """
    Create a new site within a project.
    
    User must be a member of the organization with appropriate permissions.
    
    Args:
        site_data: Site creation data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Created site details
        
    Raises:
        HTTPException: If user lacks access or permission
    """
    # Get project and verify access
    project = db.query(Project).filter(Project.id == site_data.project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check user membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == project.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization"
        )
    
    # Only admins, owners, and members can create sites
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot create sites"
        )
    
    # Create site
    new_site = Site(
        org_id=project.org_id,
        project_id=site_data.project_id,
        name=site_data.name,
        location=site_data.location,
        vertical=site_data.vertical,
        site_type=site_data.site_type.value if site_data.site_type else None,
        site_metadata={
            "latitude": site_data.latitude,
            "longitude": site_data.longitude
        }
    )
    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    
    return SiteResponse.model_validate(new_site)


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SiteResponse:
    """
    Get site details by ID.
    
    Args:
        site_id: Site ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Site details
        
    Raises:
        HTTPException: If site not found or user lacks access
    """
    site = db.query(Site).filter(Site.id == site_id).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Check user membership in site's organization
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == site.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site"
        )
    
    return SiteResponse.model_validate(site)


@router.patch("/{site_id}", response_model=SiteResponse)
async def update_site(
    site_id: UUID,
    site_data: SiteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SiteResponse:
    """
    Update site details.
    
    User must have appropriate permissions in the organization.
    
    Args:
        site_id: Site ID
        site_data: Site update data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Updated site details
        
    Raises:
        HTTPException: If site not found or user lacks permission
    """
    site = db.query(Site).filter(Site.id == site_id).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Check user membership and role
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == site.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site"
        )
    
    # Viewers cannot update
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot update sites"
        )
    
    # Update fields
    update_data = site_data.model_dump(exclude_unset=True)
    
    # Handle metadata fields separately
    if "latitude" in update_data or "longitude" in update_data:
        site_metadata = site.site_metadata.copy()
        if "latitude" in update_data:
            site_metadata["latitude"] = update_data.pop("latitude")
        if "longitude" in update_data:
            site_metadata["longitude"] = update_data.pop("longitude")
        site.site_metadata = site_metadata
    
    # Handle site_type enum
    if "site_type" in update_data and update_data["site_type"] is not None:
        update_data["site_type"] = update_data["site_type"].value
    
    for field, value in update_data.items():
        setattr(site, field, value)
    
    db.commit()
    db.refresh(site)
    
    return SiteResponse.model_validate(site)


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> None:
    """
    Delete a site.
    
    Only organization owners and admins can delete sites.
    This will cascade delete all associated data.
    
    Args:
        site_id: Site ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        No content
        
    Raises:
        HTTPException: If site not found or user lacks permission
    """
    site = db.query(Site).filter(Site.id == site_id).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Check user membership and role
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == site.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site"
        )
    
    # Only owners and admins can delete
    if membership.role not in [OrgRole.OWNER, OrgRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can delete sites"
        )
    
    db.delete(site)
    db.commit()
    
    return None
