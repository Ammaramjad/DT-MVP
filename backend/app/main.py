"""
Main FastAPI application for AI Digital Twin SaaS Platform.
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import time
import uuid
import structlog

from app.config import settings
from app.api.v1 import auth, organizations, projects, sites, ingest, kpis, forecasts, simulations, recommendations

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Multi-tenant AI Digital Twin SaaS Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID to each request for tracing."""
    request_id = request.headers.get(settings.request_id_header) or str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers[settings.request_id_header] = request_id
    response.headers["X-Process-Time"] = str(process_time)
    
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time=process_time,
        request_id=request_id
    )
    
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for validation errors."""
    logger.error(
        "validation_error",
        path=request.url.path,
        errors=exc.errors(),
        request_id=getattr(request.state, "request_id", None)
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "request_id": getattr(request.state, "request_id", None)
        }
    )


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.app_env
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "AI Digital Twin SaaS Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# Include API routers
app.include_router(
    auth.router,
    prefix=f"{settings.api_v1_prefix}/auth",
    tags=["Authentication"]
)

app.include_router(
    organizations.router,
    prefix=f"{settings.api_v1_prefix}/orgs",
    tags=["Organizations"]
)

app.include_router(
    projects.router,
    prefix=f"{settings.api_v1_prefix}/projects",
    tags=["Projects"]
)

app.include_router(
    sites.router,
    prefix=f"{settings.api_v1_prefix}/sites",
    tags=["Sites"]
)

app.include_router(
    ingest.router,
    prefix=f"{settings.api_v1_prefix}/ingest",
    tags=["Data Ingestion"]
)

app.include_router(
    kpis.router,
    prefix=f"{settings.api_v1_prefix}/kpis",
    tags=["KPIs"]
)

app.include_router(
    forecasts.router,
    prefix=f"{settings.api_v1_prefix}/forecasts",
    tags=["Forecasts"]
)

app.include_router(
    simulations.router,
    prefix=f"{settings.api_v1_prefix}/simulations",
    tags=["Simulations"]
)

app.include_router(
    recommendations.router,
    prefix=f"{settings.api_v1_prefix}/recommendations",
    tags=["Recommendations"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
