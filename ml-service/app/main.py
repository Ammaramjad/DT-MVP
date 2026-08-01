"""
ML Service FastAPI Application

Main entry point for the ML service providing forecasting, anomaly detection,
and simulation capabilities.
"""
import logging
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api import forecast, anomaly, simulation


# Configure structured logging
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer() if settings.log_json
        else structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, settings.log_level)
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info(
        "ml_service_starting",
        environment=settings.environment,
        model_storage_path=str(settings.model_storage_path),
    )
    
    # Startup: Ensure model storage directory exists
    settings.model_storage_path.mkdir(parents=True, exist_ok=True)
    
    yield
    
    # Shutdown
    logger.info("ml_service_shutting_down")


# Create FastAPI application
app = FastAPI(
    title="AI Digital Twin ML Service",
    description="Machine Learning service for forecasting, anomaly detection, and simulation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=f"{settings.api_v1_prefix}/docs",
    redoc_url=f"{settings.api_v1_prefix}/redoc",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API routers
app.include_router(
    forecast.router,
    prefix=f"{settings.api_v1_prefix}/forecast",
    tags=["Forecasting"],
)
app.include_router(
    anomaly.router,
    prefix=f"{settings.api_v1_prefix}/anomaly",
    tags=["Anomaly Detection"],
)
app.include_router(
    simulation.router,
    prefix=f"{settings.api_v1_prefix}/simulation",
    tags=["Simulation"],
)


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Health status with service information
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "service": settings.service_name,
            "environment": settings.environment,
            "version": "1.0.0",
        }
    )


@app.get(f"{settings.api_v1_prefix}/status", status_code=status.HTTP_200_OK)
async def service_status():
    """
    Service status endpoint with detailed information.
    
    Returns:
        Detailed service status including configuration
    """
    return JSONResponse(
        content={
            "status": "operational",
            "service": settings.service_name,
            "environment": settings.environment,
            "model_storage": str(settings.model_storage_path),
            "capabilities": {
                "forecasting": ["prophet", "arima"],
                "anomaly_detection": ["isolation_forest"],
                "simulation": ["elastic_net"],
            },
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled errors.
    
    Args:
        request: The request that caused the exception
        exc: The exception that was raised
        
    Returns:
        JSON error response
    """
    logger.error(
        "unhandled_exception",
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path,
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.debug else "An unexpected error occurred",
            "type": type(exc).__name__,
        },
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
