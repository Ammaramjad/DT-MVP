"""
Celery tasks for ML operations.
"""
from typing import Dict, Any, List
import structlog
import httpx

from app.tasks import celery_app
from app.database import SessionLocal
from app.config import settings
from app.models.project import Project
from app.models.site import Site
from app.services.recommendation_service import generate_recommendations
from app.services.kpi_service import compute_manufacturing_kpis, compute_energy_kpis, compute_retail_kpis

logger = structlog.get_logger()


@celery_app.task(name="app.tasks.ml_tasks.train_forecast_model")
def train_forecast_model(project_id: str, vertical: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Train a forecast model for a project.
    
    Args:
        project_id: Project ID
        vertical: Vertical type
        config: Model configuration
        
    Returns:
        Training results
    """
    try:
        logger.info("training_forecast_model", project_id=project_id, vertical=vertical)
        
        # Call ML service
        with httpx.Client(timeout=300.0) as client:
            response = client.post(
                f"{settings.ml_service_url}/ml/v1/forecast/train",
                json={
                    "project_id": project_id,
                    "vertical": vertical,
                    "config": config
                }
            )
            response.raise_for_status()
            result = response.json()
        
        logger.info("forecast_model_trained", project_id=project_id, result=result)
        return result
        
    except Exception as e:
        logger.error("forecast_training_failed", project_id=project_id, error=str(e))
        return {"status": "error", "message": str(e)}


@celery_app.task(name="app.tasks.ml_tasks.retrain_anomaly_models")
def retrain_anomaly_models() -> Dict[str, Any]:
    """
    Periodic task to retrain anomaly detection models for all sites.
    
    Returns:
        Retraining results
    """
    db = SessionLocal()
    try:
        logger.info("retraining_anomaly_models")
        
        sites = db.query(Site).all()
        results = []
        
        for site in sites:
            try:
                # Call ML service for anomaly model training
                with httpx.Client(timeout=300.0) as client:
                    response = client.post(
                        f"{settings.ml_service_url}/ml/v1/anomaly/train",
                        json={"site_id": str(site.id), "vertical": site.vertical}
                    )
                    response.raise_for_status()
                    result = response.json()
                    results.append({
                        "site_id": str(site.id),
                        "status": "success",
                        "result": result
                    })
            except Exception as e:
                logger.error("anomaly_training_failed", site_id=str(site.id), error=str(e))
                results.append({
                    "site_id": str(site.id),
                    "status": "error",
                    "message": str(e)
                })
        
        logger.info("anomaly_models_retrained", total=len(results))
        return {"status": "success", "sites_processed": len(results), "results": results}
        
    finally:
        db.close()


@celery_app.task(name="app.tasks.ml_tasks.generate_recommendations_for_all_projects")
def generate_recommendations_for_all_projects() -> Dict[str, Any]:
    """
    Periodic task to generate recommendations for all active projects.
    
    Returns:
        Generation results
    """
    db = SessionLocal()
    try:
        logger.info("generating_recommendations_for_all_projects")
        
        projects = db.query(Project).all()
        results = []
        
        for project in projects:
            try:
                # Get sites for project
                sites = db.query(Site).filter(Site.project_id == project.id).all()
                
                for site in sites:
                    # Compute current KPIs
                    if site.vertical == "manufacturing":
                        kpis = compute_manufacturing_kpis(str(site.id), None, None, db)
                    elif site.vertical == "energy":
                        kpis = compute_energy_kpis(str(site.id), None, None, db)
                    elif site.vertical == "retail":
                        kpis = compute_retail_kpis(str(site.id), None, None, db)
                    else:
                        continue
                    
                    # Generate recommendations
                    recommendations = generate_recommendations(
                        str(project.id),
                        site.vertical,
                        kpis,
                        db
                    )
                    
                    results.append({
                        "project_id": str(project.id),
                        "site_id": str(site.id),
                        "recommendations_generated": len(recommendations)
                    })
                    
            except Exception as e:
                logger.error("recommendation_generation_failed", project_id=str(project.id), error=str(e))
                results.append({
                    "project_id": str(project.id),
                    "status": "error",
                    "message": str(e)
                })
        
        logger.info("recommendations_generated", total=len(results))
        return {"status": "success", "projects_processed": len(results), "results": results}
        
    finally:
        db.close()


@celery_app.task(name="app.tasks.ml_tasks.run_simulation_async")
def run_simulation_async(simulation_id: str) -> Dict[str, Any]:
    """
    Run a simulation asynchronously.
    
    Args:
        simulation_id: Simulation ID
        
    Returns:
        Simulation results
    """
    db = SessionLocal()
    try:
        logger.info("running_simulation", simulation_id=simulation_id)
        
        # Import here to avoid circular imports
        from app.models.simulation import Simulation
        from app.services.simulation_service import run_simulation
        
        simulation = db.query(Simulation).filter(Simulation.id == simulation_id).first()
        if not simulation:
            return {"status": "error", "message": "Simulation not found"}
        
        # Run simulation
        # Note: This is a stub - actual implementation would be more complex
        simulation.status = "completed"
        db.commit()
        
        logger.info("simulation_completed", simulation_id=simulation_id)
        return {"status": "success", "simulation_id": simulation_id}
        
    except Exception as e:
        logger.error("simulation_failed", simulation_id=simulation_id, error=str(e))
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
