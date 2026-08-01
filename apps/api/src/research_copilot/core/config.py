from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="Research Copilot API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_debug: bool = Field(default=False, alias="APP_DEBUG")
    api_prefix: str = Field(default="/v1", alias="API_PREFIX")

    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str = Field(alias="REDIS_URL")

    qdrant_url: str = Field(alias="QDRANT_URL")
    qdrant_collection: str = Field(default="paper_chunks", alias="QDRANT_COLLECTION")

    s3_endpoint_url: str = Field(alias="S3_ENDPOINT_URL")
    s3_access_key: str = Field(alias="S3_ACCESS_KEY")
    s3_secret_key: str = Field(alias="S3_SECRET_KEY")
    s3_region: str = Field(default="us-east-1", alias="S3_REGION")
    s3_bucket: str = Field(alias="S3_BUCKET")

    clerk_issuer: str | None = Field(default=None, alias="CLERK_ISSUER")
    clerk_jwks_url: str | None = Field(default=None, alias="CLERK_JWKS_URL")

    stripe_secret_key: str | None = Field(default=None, alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str | None = Field(default=None, alias="STRIPE_WEBHOOK_SECRET")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")
    deepseek_api_key: str | None = Field(default=None, alias="DEEPSEEK_API_KEY")

    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")


@lru_cache
def get_settings() -> Settings:
    return Settings()
