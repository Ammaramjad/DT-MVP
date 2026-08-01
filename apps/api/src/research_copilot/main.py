from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from research_copilot.api.routes.admin import router as admin_router
from research_copilot.api.routes.health import router as health_router
from research_copilot.api.routes.intelligence import router as intelligence_router
from research_copilot.api.routes.papers import router as papers_router
from research_copilot.api.routes.projects import router as projects_router
from research_copilot.core.config import get_settings
from research_copilot.db.session import Base, engine
from research_copilot.middleware.rate_limit import RedisRateLimitMiddleware

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.app_debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RedisRateLimitMiddleware, requests_per_minute=240)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(projects_router, prefix=settings.api_prefix)
app.include_router(papers_router, prefix=settings.api_prefix)
app.include_router(intelligence_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
