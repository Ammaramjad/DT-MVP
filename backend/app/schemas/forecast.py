from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ForecastTrainRequest(BaseModel):
    """Request schema for training a forecast model."""

    site_id: UUID = Field(
        ...,
        description="Site ID for forecast training",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    target_metric: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Target metric to forecast (e.g., 'oee', 'total_cost', 'sales_velocity')",
        examples=["oee"],
    )
    start_date: date = Field(
        ...,
        description="Training data start date",
        examples=["2024-01-01"],
    )
    end_date: date = Field(
        ...,
        description="Training data end date",
        examples=["2024-03-31"],
    )
    model_type: str = Field(
        default="auto",
        description="Model type to use (auto, arima, prophet, lstm)",
        examples=["auto"],
    )
    hyperparameters: dict | None = Field(
        None,
        description="Optional model hyperparameters",
        examples=[{"seasonality_mode": "multiplicative"}],
    )

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, v: date, info) -> date:
        """Ensure end_date is after start_date."""
        if "start_date" in info.data and v <= info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "target_metric": "oee",
                "start_date": "2024-01-01",
                "end_date": "2024-03-31",
                "model_type": "auto",
                "hyperparameters": {"seasonality_mode": "multiplicative"},
            }
        }
    )


class ForecastPredictRequest(BaseModel):
    """Request schema for generating forecast predictions."""

    site_id: UUID = Field(
        ...,
        description="Site ID for forecast prediction",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    target_metric: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Target metric to forecast",
        examples=["oee"],
    )
    forecast_horizon: int = Field(
        ...,
        ge=1,
        le=365,
        description="Number of time periods to forecast (1-365 days)",
        examples=[30],
    )
    confidence_level: float = Field(
        default=0.95,
        ge=0.5,
        le=0.99,
        description="Confidence level for prediction intervals",
        examples=[0.95],
    )
    include_history: bool = Field(
        default=False,
        description="Include historical data in response",
        examples=[False],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "target_metric": "oee",
                "forecast_horizon": 30,
                "confidence_level": 0.95,
                "include_history": False,
            }
        }
    )


class ForecastMetrics(BaseModel):
    """Model performance metrics schema."""

    mae: float = Field(
        ...,
        ge=0,
        description="Mean Absolute Error",
        examples=[2.5],
    )
    rmse: float = Field(
        ...,
        ge=0,
        description="Root Mean Squared Error",
        examples=[3.2],
    )
    mape: float = Field(
        ...,
        ge=0,
        le=100,
        description="Mean Absolute Percentage Error",
        examples=[5.5],
    )
    r2_score: float = Field(
        ...,
        le=1,
        description="R-squared score (negative values indicate model performs worse than mean prediction)",
        examples=[0.85, -0.15],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "mae": 2.5,
                "rmse": 3.2,
                "mape": 5.5,
                "r2_score": 0.85,
            }
        },
    )


class ForecastResult(BaseModel):
    """Individual forecast result data point."""

    timestamp: datetime = Field(
        ...,
        description="Forecast timestamp",
        examples=["2024-04-01T00:00:00Z"],
    )
    predicted_value: float = Field(
        ...,
        description="Predicted value",
        examples=[87.5],
    )
    lower_bound: float = Field(
        ...,
        description="Lower confidence interval bound",
        examples=[82.3],
    )
    upper_bound: float = Field(
        ...,
        description="Upper confidence interval bound",
        examples=[92.7],
    )

    @field_validator("upper_bound")
    @classmethod
    def validate_bounds(cls, v: float, info) -> float:
        """Ensure upper_bound is greater than lower_bound."""
        if "lower_bound" in info.data and v < info.data["lower_bound"]:
            raise ValueError("upper_bound must be greater than lower_bound")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "timestamp": "2024-04-01T00:00:00Z",
                "predicted_value": 87.5,
                "lower_bound": 82.3,
                "upper_bound": 92.7,
            }
        }
    )


class ForecastResponse(BaseModel):
    """Response schema for forecast predictions."""

    site_id: UUID = Field(
        ...,
        description="Site identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    target_metric: str = Field(
        ...,
        description="Target metric forecasted",
        examples=["oee"],
    )
    model_type: str = Field(
        ...,
        description="Model type used",
        examples=["prophet"],
    )
    forecast_data: list[ForecastResult] = Field(
        ...,
        description="List of forecast results",
    )
    metrics: ForecastMetrics = Field(
        ...,
        description="Model performance metrics",
    )
    trained_at: datetime = Field(
        ...,
        description="Model training timestamp",
        examples=["2024-03-31T12:00:00Z"],
    )
    forecast_generated_at: datetime = Field(
        ...,
        description="Forecast generation timestamp",
        examples=["2024-04-01T08:00:00Z"],
    )
    historical_data: list[dict] | None = Field(
        None,
        description="Historical data (if requested)",
        examples=[[{"timestamp": "2024-03-01T00:00:00Z", "value": 85.5}]],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "target_metric": "oee",
                "model_type": "prophet",
                "forecast_data": [
                    {
                        "timestamp": "2024-04-01T00:00:00Z",
                        "predicted_value": 87.5,
                        "lower_bound": 82.3,
                        "upper_bound": 92.7,
                    }
                ],
                "metrics": {
                    "mae": 2.5,
                    "rmse": 3.2,
                    "mape": 5.5,
                    "r2_score": 0.85,
                },
                "trained_at": "2024-03-31T12:00:00Z",
                "forecast_generated_at": "2024-04-01T08:00:00Z",
            }
        },
    )
