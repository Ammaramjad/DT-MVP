"""
Project API endpoints with organization isolation.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.org_membership import OrgMembership, OrgRole
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    org_id: UUID = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[ProjectResponse]:
    """
    List all projects accessible to the current user.
    
    Optionally filter by organization ID.
    
    Args:
        org_id: Optional organization ID filter
        current_user: Authenticated user
        db: Database session
        
    Returns:
        List of projects
    """
    # Get user's organization memberships
    memberships = db.query(OrgMembership).filter(
        OrgMembership.user_id == current_user.id
    ).all()
    
    org_ids = [m.org_id for m in memberships]
    
    # Build query
    query = db.query(Project).filter(Project.org_id.in_(org_ids))
    
    if org_id:
        # Verify user has access to this org
        if org_id not in org_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this organization"
            )
        query = query.filter(Project.org_id == org_id)
    
    projects = query.all()
    
    return [ProjectResponse.model_validate(project) for project in projects]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProjectResponse:
    """
    Create a new project within an organization.
    
    User must be a member of the organization with appropriate permissions.
    
    Args:
        project_data: Project creation data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Created project details
        
    Raises:
        HTTPException: If user lacks access or permission
    """
    # Check user membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == project_data.organization_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization"
        )
    
    # Only admins and owners can create projects
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot create projects"
        )
    
    # Create project
    new_project = Project(
        org_id=project_data.organization_id,
        name=project_data.name,
        description=project_data.description,
        vertical=project_data.vertical
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return ProjectResponse.model_validate(new_project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProjectResponse:
    """
    Get project details by ID.
    
    Args:
        project_id: Project ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Project details
        
    Raises:
        HTTPException: If project not found or user lacks access
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check user membership in project's organization
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == project.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    return ProjectResponse.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProjectResponse:
    """
    Update project details.
    
    User must have appropriate permissions in the organization.
    
    Args:
        project_id: Project ID
        project_data: Project update data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Updated project details
        
    Raises:
        HTTPException: If project not found or user lacks permission
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check user membership and role
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == project.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    # Viewers cannot update
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot update projects"
        )
    
    # Update fields
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> None:
    """
    Delete a project.
    
    Only organization owners and admins can delete projects.
    This will cascade delete all associated sites and data.
    
    Args:
        project_id: Project ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        No content
        
    Raises:
        HTTPException: If project not found or user lacks permission
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check user membership and role
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == project.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    # Only owners and admins can delete
    if membership.role not in [OrgRole.OWNER, OrgRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can delete projects"
        )
    
    db.delete(project)
    db.commit()
    
    return None
