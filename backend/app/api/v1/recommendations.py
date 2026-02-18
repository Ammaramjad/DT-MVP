"""
Recommendations API endpoints for AI-generated insights.
"""
from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.project import Project
from app.models.recommendation import Recommendation
from app.models.org_membership import OrgMembership, OrgRole

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def recommendation_to_dict(rec: Recommendation) -> Dict[str, Any]:
    """Convert recommendation model to response dict."""
    return {
        "id": rec.id,
        "project_id": rec.project_id,
        "title": rec.title,
        "description": rec.description,
        "category": rec.category.value,
        "priority": rec.priority.value,
        "confidence_score": rec.confidence_score,
        "impact_estimate": {},  # Not in model, would be calculated
        "source": "ai_engine",
        "implementation_steps": rec.actions if isinstance(rec.actions, list) else [],
        "status": rec.status.value,
        "vertical": rec.vertical.value,
        "created_at": rec.created_at.isoformat(),
        "updated_at": rec.updated_at.isoformat()
    }


@router.get("/", response_model=List[Dict])
async def list_recommendations(
    site_id: UUID = Query(None, description="Filter by site ID"),
    project_id: UUID = Query(None, description="Filter by project ID"),
    status: str = Query(None, description="Filter by status (pending, in_progress, completed, rejected)"),
    priority: str = Query(None, description="Filter by priority (high, medium, low)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[RecommendationResponse]:
    """
    List recommendations accessible to the current user.
    
    Supports filtering by site, project, status, and priority.
    
    Args:
        site_id: Optional site ID filter
        project_id: Optional project ID filter
        status: Optional status filter
        priority: Optional priority filter
        current_user: Authenticated user
        db: Database session
        
    Returns:
        List of recommendations
    """
    # Get user's organization memberships
    memberships = db.query(OrgMembership).filter(
        OrgMembership.user_id == current_user.id
    ).all()
    
    org_ids = [m.org_id for m in memberships]
    
    # Build query - get projects from accessible organizations
    query = db.query(Recommendation).join(
        Project, Recommendation.project_id == Project.id
    ).filter(
        Project.org_id.in_(org_ids)
    )
    
    # Apply filters
    if project_id:
        # Verify project belongs to accessible organization
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project or project.org_id not in org_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )
        query = query.filter(Recommendation.project_id == project_id)
    
    if site_id:
        # Verify site belongs to accessible organization
        site = db.query(Site).filter(Site.id == site_id).first()
        if not site or site.org_id not in org_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this site"
            )
        # Filter by recommendations for projects containing this site
        query = query.filter(Recommendation.project_id == site.project_id)
    
    if status:
        query = query.filter(Recommendation.status == status)
    
    if priority:
        query = query.filter(Recommendation.priority == priority)
    
    recommendations = query.order_by(Recommendation.created_at.desc()).all()
    
    return [recommendation_to_dict(rec) for rec in recommendations]


@router.get("/{recommendation_id}", response_model=Dict)
async def get_recommendation(
    recommendation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> RecommendationResponse:
    """
    Get recommendation details by ID.
    
    Args:
        recommendation_id: Recommendation ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Recommendation details
        
    Raises:
        HTTPException: If recommendation not found or user lacks access
    """
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id
    ).first()
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    # Get project to check organization access
    project = db.query(Project).filter(Project.id == recommendation.project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated project not found"
        )
    
    # Check user membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == project.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this recommendation"
        )
    
    return recommendation_to_dict(recommendation)


@router.patch("/{recommendation_id}/status", response_model=Dict)
async def update_recommendation_status(
    recommendation_id: UUID,
    new_status: str = Query(..., description="New status (pending, in_progress, completed, rejected)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> RecommendationResponse:
    """
    Update recommendation status.
    
    Allows users to track the implementation status of recommendations.
    
    Args:
        recommendation_id: Recommendation ID
        new_status: New status value
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Updated recommendation details
        
    Raises:
        HTTPException: If recommendation not found or user lacks permission
    """
    # Validate status
    valid_statuses = ["pending", "in_progress", "completed", "rejected"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id
    ).first()
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    # Get project to check organization access
    project = db.query(Project).filter(Project.id == recommendation.project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated project not found"
        )
    
    # Check user membership and role
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == project.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this recommendation"
        )
    
    # Viewers cannot update status
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot update recommendation status"
        )
    
    # Update status
    recommendation.status = new_status
    db.commit()
    db.refresh(recommendation)
    
    return recommendation_to_dict(recommendation)
