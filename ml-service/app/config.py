"""
ML Service Configuration

Provides configuration settings for model storage, training parameters,
and service settings.
"""
import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """ML Service configuration settings."""
    
    # Service settings
    service_name: str = "ml-service"
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")
    
    # API settings
    api_v1_prefix: str = "/api/v1"
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8001, env="PORT")
    
    # Model storage
    model_storage_path: Path = Field(
        default=Path("/tmp/ml-models"),
        env="MODEL_STORAGE_PATH"
    )
    model_max_versions: int = Field(default=5, env="MODEL_MAX_VERSIONS")
    
    # Prophet settings
    prophet_changepoint_prior_scale: float = Field(
        default=0.05,
        env="PROPHET_CHANGEPOINT_PRIOR_SCALE"
    )
    prophet_seasonality_prior_scale: float = Field(
        default=10.0,
        env="PROPHET_SEASONALITY_PRIOR_SCALE"
    )
    prophet_seasonality_mode: str = Field(
        default="multiplicative",
        env="PROPHET_SEASONALITY_MODE"
    )
    prophet_yearly_seasonality: bool = Field(
        default=True,
        env="PROPHET_YEARLY_SEASONALITY"
    )
    prophet_weekly_seasonality: bool = Field(
        default=True,
        env="PROPHET_WEEKLY_SEASONALITY"
    )
    prophet_daily_seasonality: bool = Field(
        default=True,
        env="PROPHET_DAILY_SEASONALITY"
    )
    prophet_interval_width: float = Field(
        default=0.95,
        env="PROPHET_INTERVAL_WIDTH"
    )
    
    # ARIMA settings
    arima_max_p: int = Field(default=5, env="ARIMA_MAX_P")
    arima_max_d: int = Field(default=2, env="ARIMA_MAX_D")
    arima_max_q: int = Field(default=5, env="ARIMA_MAX_Q")
    arima_seasonal: bool = Field(default=True, env="ARIMA_SEASONAL")
    arima_seasonal_period: int = Field(default=24, env="ARIMA_SEASONAL_PERIOD")
    
    # Anomaly detection settings
    isolation_forest_contamination: float = Field(
        default=0.1,
        env="ISOLATION_FOREST_CONTAMINATION"
    )
    isolation_forest_n_estimators: int = Field(
        default=100,
        env="ISOLATION_FOREST_N_ESTIMATORS"
    )
    isolation_forest_max_samples: str = Field(
        default="auto",
        env="ISOLATION_FOREST_MAX_SAMPLES"
    )
    anomaly_alert_threshold: float = Field(
        default=-0.5,
        env="ANOMALY_ALERT_THRESHOLD"
    )
    
    # Simulation settings
    simulation_alpha: float = Field(default=0.5, env="SIMULATION_ALPHA")
    simulation_l1_ratio: float = Field(default=0.5, env="SIMULATION_L1_RATIO")
    simulation_max_iter: int = Field(default=1000, env="SIMULATION_MAX_ITER")
    simulation_confidence_threshold: float = Field(
        default=0.7,
        env="SIMULATION_CONFIDENCE_THRESHOLD"
    )
    
    # Training settings
    min_training_samples: int = Field(default=100, env="MIN_TRAINING_SAMPLES")
    max_training_time: int = Field(default=300, env="MAX_TRAINING_TIME")  # seconds
    training_batch_size: int = Field(default=1000, env="TRAINING_BATCH_SIZE")
    
    # Data preprocessing
    missing_value_strategy: str = Field(
        default="interpolate",
        env="MISSING_VALUE_STRATEGY"
    )
    outlier_std_threshold: float = Field(
        default=3.0,
        env="OUTLIER_STD_THRESHOLD"
    )
    resampling_frequency: str = Field(
        default="1H",
        env="RESAMPLING_FREQUENCY"
    )
    
    # Evaluation settings
    test_split_ratio: float = Field(default=0.2, env="TEST_SPLIT_RATIO")
    cross_validation_folds: int = Field(default=5, env="CROSS_VALIDATION_FOLDS")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_json: bool = Field(default=True, env="LOG_JSON")
    
    # External services
    backend_url: Optional[str] = Field(default=None, env="BACKEND_URL")
    redis_url: Optional[str] = Field(default=None, env="REDIS_URL")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure model storage path exists
        self.model_storage_path.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()
