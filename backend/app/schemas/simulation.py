from datetime import date
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


class SimulationRequest(BaseModel):
    """Request schema for running what-if simulations."""

    site_id: UUID = Field(
        ...,
        description="Site ID for simulation",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    scenario_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Name of the simulation scenario",
        examples=["Increase production speed by 10%"],
    )
    base_period: tuple[date, date] = Field(
        ...,
        description="Base period for comparison (start_date, end_date)",
        examples=[("2024-01-01", "2024-03-31")],
    )
    forecast_period: tuple[date, date] = Field(
        ...,
        description="Forecast period for simulation (start_date, end_date)",
        examples=[("2024-04-01", "2024-06-30")],
    )
    variable_overrides: dict[str, float] = Field(
        ...,
        description="Variables to override with new values (e.g., {'throughput_multiplier': 1.1})",
        examples=[{"throughput_multiplier": 1.1, "quality_target": 98.0}],
    )

    @field_validator("base_period", "forecast_period")
    @classmethod
    def validate_period_tuple(cls, v: tuple[date, date]) -> tuple[date, date]:
        """Validate period tuple has exactly 2 dates."""
        if not isinstance(v, tuple) or len(v) != 2:
            raise ValueError("Period must be a tuple of exactly 2 dates (start_date, end_date)")
        return v

    @field_validator("base_period")
    @classmethod
    def validate_base_period(cls, v: tuple[date, date]) -> tuple[date, date]:
        """Ensure base period dates are valid."""
        start_date, end_date = v
        if end_date <= start_date:
            raise ValueError("base_period end_date must be after start_date")
        return v

    @field_validator("forecast_period")
    @classmethod
    def validate_forecast_period(cls, v: tuple[date, date]) -> tuple[date, date]:
        """Ensure forecast period dates are valid."""
        start_date, end_date = v
        if end_date <= start_date:
            raise ValueError("forecast_period end_date must be after start_date")
        return v

    @field_validator("variable_overrides")
    @classmethod
    def validate_variable_overrides(cls, v: dict[str, float]) -> dict[str, float]:
        """Ensure variable overrides are not empty."""
        if not v:
            raise ValueError("variable_overrides must contain at least one variable")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "scenario_name": "Increase production speed by 10%",
                "base_period": ["2024-01-01", "2024-03-31"],
                "forecast_period": ["2024-04-01", "2024-06-30"],
                "variable_overrides": {
                    "throughput_multiplier": 1.1,
                    "quality_target": 98.0,
                },
            }
        }
    )


class SimulationResponse(BaseModel):
    """Response schema for simulation results."""

    site_id: UUID = Field(
        ...,
        description="Site identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    scenario_name: str = Field(
        ...,
        description="Simulation scenario name",
        examples=["Increase production speed by 10%"],
    )
    baseline_kpis: dict[str, float] = Field(
        ...,
        description="Baseline KPIs from base period",
        examples=[{"oee": 85.5, "throughput": 1200.0, "quality": 96.5}],
    )
    simulated_kpis: dict[str, float] = Field(
        ...,
        description="Simulated KPIs with variable overrides",
        examples=[{"oee": 88.2, "throughput": 1320.0, "quality": 98.0}],
    )
    deltas: dict[str, dict[str, float]] = Field(
        ...,
        description="Absolute and percentage changes between baseline and simulated",
        examples=[
            {
                "oee": {"absolute": 2.7, "percentage": 3.16},
                "throughput": {"absolute": 120.0, "percentage": 10.0},
            }
        ],
    )
    timeseries: list[dict] = Field(
        ...,
        description="Time series data comparing baseline and simulated values",
        examples=[
            [
                {
                    "timestamp": "2024-04-01T00:00:00Z",
                    "baseline_oee": 85.5,
                    "simulated_oee": 88.2,
                }
            ]
        ],
    )
    confidence_score: float = Field(
        ...,
        ge=0,
        le=1,
        description="Confidence score for simulation accuracy (0-1)",
        examples=[0.87],
    )
    simulation_notes: str | None = Field(
        None,
        max_length=1000,
        description="Additional notes or warnings about the simulation",
        examples=["Simulation assumes constant quality during increased throughput"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "scenario_name": "Increase production speed by 10%",
                "baseline_kpis": {
                    "oee": 85.5,
                    "throughput": 1200.0,
                    "quality": 96.5,
                },
                "simulated_kpis": {
                    "oee": 88.2,
                    "throughput": 1320.0,
                    "quality": 98.0,
                },
                "deltas": {
                    "oee": {"absolute": 2.7, "percentage": 3.16},
                    "throughput": {"absolute": 120.0, "percentage": 10.0},
                    "quality": {"absolute": 1.5, "percentage": 1.55},
                },
                "timeseries": [
                    {
                        "timestamp": "2024-04-01T00:00:00Z",
                        "baseline_oee": 85.5,
                        "simulated_oee": 88.2,
                    }
                ],
                "confidence_score": 0.87,
                "simulation_notes": "Simulation assumes constant quality during increased throughput",
            }
        },
    )
