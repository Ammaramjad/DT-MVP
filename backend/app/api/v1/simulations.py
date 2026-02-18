"""
Simulation API endpoints for what-if scenario analysis.
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
from app.models.simulation import Simulation
from app.models.org_membership import OrgMembership, OrgRole
from app.schemas.simulation import SimulationRequest, SimulationResponse
from app.config import settings

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.post("/run", response_model=Dict, status_code=status.HTTP_202_ACCEPTED)
async def run_simulation(
    sim_request: SimulationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Run a what-if simulation scenario.
    
    Sends simulation request to ML service for processing.
    
    Args:
        sim_request: Simulation parameters and variable overrides
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Simulation job information
        
    Raises:
        HTTPException: If site not found or user lacks access
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.id == sim_request.site_id).first()
    
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
    
    # Viewers cannot run simulations
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot run simulations"
        )
    
    # Call ML service to run simulation
    try:
        async with httpx.AsyncClient() as client:
            ml_response = await client.post(
                f"{settings.ml_service_url}/api/v1/simulation/run",
                json={
                    "site_id": str(sim_request.site_id),
                    "scenario_name": sim_request.scenario_name,
                    "base_period": [
                        sim_request.base_period[0].isoformat(),
                        sim_request.base_period[1].isoformat()
                    ],
                    "forecast_period": [
                        sim_request.forecast_period[0].isoformat(),
                        sim_request.forecast_period[1].isoformat()
                    ],
                    "variable_overrides": sim_request.variable_overrides
                },
                timeout=60.0
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
    
    # Create simulation record
    simulation = Simulation(
        project_id=site.project_id,
        name=sim_request.scenario_name,
        parameters={
            "site_id": str(sim_request.site_id),
            "base_period": [
                sim_request.base_period[0].isoformat(),
                sim_request.base_period[1].isoformat()
            ],
            "forecast_period": [
                sim_request.forecast_period[0].isoformat(),
                sim_request.forecast_period[1].isoformat()
            ],
            "variable_overrides": sim_request.variable_overrides
        },
        results={}
    )
    db.add(simulation)
    db.commit()
    db.refresh(simulation)
    
    return {
        "simulation_id": str(simulation.id),
        "job_id": ml_data.get("job_id"),
        "status": "running",
        "message": "Simulation started",
        "estimated_completion_time": ml_data.get("estimated_completion_time")
    }


@router.get("/{simulation_id}", response_model=Dict)
async def get_simulation(
    simulation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get simulation details.
    
    Args:
        simulation_id: Simulation ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Simulation details
        
    Raises:
        HTTPException: If simulation not found or user lacks access
    """
    simulation = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    
    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found"
        )
    
    # Get project to check organization access
    project = db.query(Project).filter(Project.id == simulation.project_id).first()
    
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
            detail="You don't have access to this simulation"
        )
    
    return {
        "id": str(simulation.id),
        "project_id": str(simulation.project_id),
        "scenario_name": simulation.name,
        "status": simulation.status.value,
        "parameters": simulation.parameters,
        "results": simulation.results,
        "created_at": simulation.created_at.isoformat(),
        "updated_at": simulation.updated_at.isoformat()
    }


@router.get("/{simulation_id}/results", response_model=SimulationResponse)
async def get_simulation_results(
    simulation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SimulationResponse:
    """
    Get simulation results.
    
    Returns the what-if scenario analysis with baseline and simulated KPIs.
    
    Args:
        simulation_id: Simulation ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Simulation results with comparison data
        
    Raises:
        HTTPException: If simulation not found or user lacks access
    """
    simulation = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    
    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found"
        )
    
    # Get project to check organization access
    project = db.query(Project).filter(Project.id == simulation.project_id).first()
    
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
            detail="You don't have access to this simulation"
        )
    
    # Check if results are available
    if not simulation.results or not simulation.results.get("completed"):
        # Try to fetch from ML service
        try:
            async with httpx.AsyncClient() as client:
                ml_response = await client.get(
                    f"{settings.ml_service_url}/api/v1/simulation/{simulation_id}/results",
                    timeout=30.0
                )
                
                if ml_response.status_code == 200:
                    ml_data = ml_response.json()
                    
                    # Update simulation results
                    simulation.results = ml_data
                    db.commit()
                    
        except httpx.RequestError:
            pass
    
    if not simulation.results or not simulation.results.get("completed"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation results not available yet. Simulation may still be running."
        )
    
    # Build response
    results = simulation.results
    site_id_str = simulation.parameters.get("site_id")
    
    return SimulationResponse(
        site_id=UUID(site_id_str) if site_id_str else simulation.project.sites[0].id,
        scenario_name=simulation.name,
        baseline_kpis=results.get("baseline_kpis", {}),
        simulated_kpis=results.get("simulated_kpis", {}),
        deltas=results.get("deltas", {}),
        timeseries=results.get("timeseries", []),
        confidence_score=results.get("confidence_score", 0.85),
        simulation_notes=results.get("notes")
    )
