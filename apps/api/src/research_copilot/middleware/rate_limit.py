import time

from fastapi import Request
from redis import asyncio as aioredis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from research_copilot.core.config import get_settings


class RedisRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 180):
        super().__init__(app)
        settings = get_settings()
        self.redis = aioredis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
        self.requests_per_minute = requests_per_minute

    async def dispatch(self, request: Request, call_next):
        forwarded_for = request.headers.get("x-forwarded-for", "")
        client_host = forwarded_for.split(",")[0].strip() or (request.client.host if request.client else "unknown")
        window = int(time.time() // 60)
        key = f"rate_limit:{client_host}:{window}"

        try:
            count = await self.redis.incr(key)
            if count == 1:
                await self.redis.expire(key, 70)
            if count > self.requests_per_minute:
                return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded."})
        except Exception:
            # Fail-open for transient cache outages; availability wins over strict throttling.
            pass

        return await call_next(request)
