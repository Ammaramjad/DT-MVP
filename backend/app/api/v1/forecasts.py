"""
Forecast API endpoints that interact with ML service for predictions.
"""
from typing import Dict
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.project import Project
from app.models.forecast import Forecast, ForecastResult
from app.models.org_membership import OrgMembership, OrgRole
from app.schemas.forecast import (
    ForecastTrainRequest,
    ForecastResponse,
    ForecastMetrics,
    ForecastResult as ForecastResultSchema,
)
from app.config import settings

router = APIRouter(prefix="/forecasts", tags=["forecasts"])


@router.post("/train", response_model=Dict, status_code=status.HTTP_202_ACCEPTED)
async def train_forecast_model(
    train_request: ForecastTrainRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Train a forecast model for a site.
    
    Sends training request to ML service and returns job ID for tracking.
    
    Args:
        train_request: Forecast training parameters
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Training job information
        
    Raises:
        HTTPException: If site not found or user lacks access
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.id == train_request.site_id).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Check user membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == site.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site"
        )
    
    # Viewers cannot train models
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot train forecast models"
        )
    
    # Call ML service to train model
    try:
        async with httpx.AsyncClient() as client:
            ml_response = await client.post(
                f"{settings.ml_service_url}/api/v1/forecast/train",
                json={
                    "site_id": str(train_request.site_id),
                    "target_metric": train_request.target_metric,
                    "start_date": train_request.start_date.isoformat(),
                    "end_date": train_request.end_date.isoformat(),
                    "model_type": train_request.model_type,
                    "hyperparameters": train_request.hyperparameters or {}
                },
                timeout=30.0
            )
            
            if ml_response.status_code != 202:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="ML service unavailable or returned error"
                )
            
            ml_data = ml_response.json()
            
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to ML service: {str(e)}"
        )
    
    # Create forecast record (will be updated when training completes)
    forecast = Forecast(
        project_id=site.project_id,
        vertical=site.vertical,
        model_type=train_request.model_type,
        trained_at=datetime.utcnow(),
        metrics={},
        config={
            "site_id": str(train_request.site_id),
            "target_metric": train_request.target_metric,
            "start_date": train_request.start_date.isoformat(),
            "end_date": train_request.end_date.isoformat(),
        }
    )
    db.add(forecast)
    db.commit()
    db.refresh(forecast)
    
    return {
        "forecast_id": str(forecast.id),
        "job_id": ml_data.get("job_id"),
        "status": "training",
        "message": "Forecast model training started",
        "estimated_completion_time": ml_data.get("estimated_completion_time")
    }


@router.get("/{forecast_id}", response_model=Dict)
async def get_forecast(
    forecast_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get forecast model details.
    
    Args:
        forecast_id: Forecast ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Forecast model details
        
    Raises:
        HTTPException: If forecast not found or user lacks access
    """
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    
    if not forecast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forecast not found"
        )
    
    # Get project to check organization access
    project = db.query(Project).filter(Project.id == forecast.project_id).first()
    
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
            detail="You don't have access to this forecast"
        )
    
    return {
        "id": str(forecast.id),
        "project_id": str(forecast.project_id),
        "vertical": forecast.vertical.value,
        "model_type": forecast.model_type,
        "trained_at": forecast.trained_at.isoformat(),
        "metrics": forecast.metrics,
        "config": forecast.config,
        "created_at": forecast.created_at.isoformat(),
        "updated_at": forecast.updated_at.isoformat()
    }


@router.get("/{forecast_id}/results", response_model=ForecastResponse)
async def get_forecast_results(
    forecast_id: UUID,
    include_history: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ForecastResponse:
    """
    Get forecast prediction results.
    
    Returns the forecast data with confidence intervals and model metrics.
    
    Args:
        forecast_id: Forecast ID
        include_history: Include historical data in response
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Forecast results with predictions
        
    Raises:
        HTTPException: If forecast not found or user lacks access
    """
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    
    if not forecast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forecast not found"
        )
    
    # Get project to check organization access
    project = db.query(Project).filter(Project.id == forecast.project_id).first()
    
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
            detail="You don't have access to this forecast"
        )
    
    # Get forecast results
    results = db.query(ForecastResult).filter(
        ForecastResult.forecast_id == forecast_id
    ).order_by(ForecastResult.timestamp).all()
    
    if not results:
        # Try to fetch from ML service
        try:
            async with httpx.AsyncClient() as client:
                ml_response = await client.get(
                    f"{settings.ml_service_url}/api/v1/forecast/{forecast_id}/predict",
                    timeout=30.0
                )
                
                if ml_response.status_code == 200:
                    ml_data = ml_response.json()
                    
                    # Store results in database
                    for result_data in ml_data.get("predictions", []):
                        result = ForecastResult(
                            forecast_id=forecast_id,
                            timestamp=datetime.fromisoformat(result_data["timestamp"]),
                            predicted_value=result_data["predicted_value"],
                            lower_bound=result_data.get("lower_bound"),
                            upper_bound=result_data.get("upper_bound")
                        )
                        db.add(result)
                    
                    db.commit()
                    
                    # Re-query results
                    results = db.query(ForecastResult).filter(
                        ForecastResult.forecast_id == forecast_id
                    ).order_by(ForecastResult.timestamp).all()
                    
        except httpx.RequestError:
            pass
    
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No forecast results available yet. Model may still be training."
        )
    
    # Build response
    forecast_data = [
        ForecastResultSchema(
            timestamp=r.timestamp,
            predicted_value=r.predicted_value,
            lower_bound=r.lower_bound or r.predicted_value * 0.9,
            upper_bound=r.upper_bound or r.predicted_value * 1.1
        )
        for r in results
    ]
    
    metrics = ForecastMetrics(
        mae=forecast.metrics.get("mae", 0.0),
        rmse=forecast.metrics.get("rmse", 0.0),
        mape=forecast.metrics.get("mape", 0.0),
        r2_score=forecast.metrics.get("r2_score", 0.0)
    )
    
    site_id = forecast.config.get("site_id")
    target_metric = forecast.config.get("target_metric", "unknown")
    
    return ForecastResponse(
        site_id=UUID(site_id) if site_id else project.sites[0].id,
        target_metric=target_metric,
        model_type=forecast.model_type,
        forecast_data=forecast_data,
        metrics=metrics,
        trained_at=forecast.trained_at,
        forecast_generated_at=datetime.utcnow(),
        historical_data=None  # Could fetch from time-series tables if needed
    )
