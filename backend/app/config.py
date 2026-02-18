"""
Configuration settings for the AI Digital Twin SaaS Platform.
Uses pydantic-settings for environment variable management.
"""
from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Application
    app_name: str = "AI Digital Twin SaaS"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    
    # Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "digital_twin"
    postgres_user: str = "dtuser"
    postgres_password: str = "changeme"
    database_url: Optional[str] = None
    
    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info) -> str:
        """Assemble database URL from components if not provided."""
        if v:
            return v
        values = info.data
        return (
            f"postgresql://{values.get('postgres_user')}:"
            f"{values.get('postgres_password')}@"
            f"{values.get('postgres_host')}:"
            f"{values.get('postgres_port')}/"
            f"{values.get('postgres_db')}"
        )
    
    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_url: Optional[str] = None
    
    @field_validator("redis_url", mode="before")
    @classmethod
    def assemble_redis_connection(cls, v: Optional[str], info) -> str:
        """Assemble Redis URL from components if not provided."""
        if v:
            return v
        values = info.data
        password = values.get('redis_password')
        password_part = f":{password}@" if password else ""
        return (
            f"redis://{password_part}"
            f"{values.get('redis_host')}:"
            f"{values.get('redis_port')}/0"
        )
    
    # Celery
    celery_broker_url: Optional[str] = None
    celery_result_backend: Optional[str] = None
    
    @field_validator("celery_broker_url", mode="before")
    @classmethod
    def get_celery_broker(cls, v: Optional[str], info) -> str:
        """Use Redis URL for Celery broker if not specified."""
        return v or info.data.get('redis_url')
    
    @field_validator("celery_result_backend", mode="before")
    @classmethod
    def get_celery_backend(cls, v: Optional[str], info) -> str:
        """Use Redis URL for Celery result backend if not specified."""
        return v or info.data.get('redis_url')
    
    # Security
    secret_key: str = "your-secret-key-change-in-production-min-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # ML Service
    ml_service_url: str = "http://localhost:8001"
    ml_model_path: str = "/app/models"
    
    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_enabled: bool = False
    
    # Monitoring
    log_level: str = "INFO"
    request_id_header: str = "X-Request-ID"
    
    # Rate Limiting
    rate_limit_per_minute: int = 60
    
    # TimescaleDB
    timescaledb_retention_days: int = 365


# Global settings instance
settings = Settings()
