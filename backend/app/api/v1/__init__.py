"""
API v1 router configuration.
"""
from fastapi import APIRouter
from app.api.v1 import (
    auth,
    organizations,
    projects,
    sites,
    ingest,
    kpis,
    forecasts,
    simulations,
    recommendations
)

api_router = APIRouter()

# Register all route modules
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(projects.router)
api_router.include_router(sites.router)
api_router.include_router(ingest.router)
api_router.include_router(kpis.router)
api_router.include_router(forecasts.router)
api_router.include_router(simulations.router)
api_router.include_router(recommendations.router)
