from datetime import datetime
from enum import Enum
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class PeriodTypeEnum(str, Enum):
    """Enum for energy tariff period types."""

    PEAK = "peak"
    OFF_PEAK = "off_peak"
    STANDARD = "standard"


class ManufacturingDataPoint(BaseModel):
    """Data point schema for manufacturing vertical."""

    machine_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique machine identifier",
        examples=["MACH-001"],
    )
    timestamp: datetime = Field(
        ...,
        description="Data point timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    uptime_minutes: float = Field(
        ...,
        ge=0,
        description="Machine uptime in minutes",
        examples=[450.5],
    )
    throughput_units: int = Field(
        ...,
        ge=0,
        description="Number of units produced",
        examples=[1250],
    )
    defect_count: int = Field(
        ...,
        ge=0,
        description="Number of defective units",
        examples=[5],
    )
    downtime_events: list[dict] = Field(
        default_factory=list,
        description="List of downtime events with reason and duration",
        examples=[[{"reason": "maintenance", "duration_minutes": 30}]],
    )
    cycle_time_seconds: float = Field(
        ...,
        ge=0,
        description="Average cycle time per unit in seconds",
        examples=[45.2],
    )
    quality_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Quality score percentage",
        examples=[98.5],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "machine_id": "MACH-001",
                "timestamp": "2024-01-15T10:30:00Z",
                "uptime_minutes": 450.5,
                "throughput_units": 1250,
                "defect_count": 5,
                "downtime_events": [{"reason": "maintenance", "duration_minutes": 30}],
                "cycle_time_seconds": 45.2,
                "quality_score": 98.5,
            }
        }
    )


class EnergyDataPoint(BaseModel):
    """Data point schema for energy vertical."""

    meter_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique meter identifier",
        examples=["METER-001"],
    )
    timestamp: datetime = Field(
        ...,
        description="Data point timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    kwh_consumed: float = Field(
        ...,
        ge=0,
        description="Energy consumed in kilowatt-hours",
        examples=[125.5],
    )
    tariff_rate: float = Field(
        ...,
        ge=0,
        description="Tariff rate per kWh",
        examples=[0.15],
    )
    period_type: PeriodTypeEnum = Field(
        ...,
        description="Tariff period type",
        examples=["peak"],
    )
    solar_generation_kwh: float | None = Field(
        None,
        ge=0,
        description="Solar generation in kilowatt-hours (optional)",
        examples=[45.3],
    )
    load_shedding_event: bool = Field(
        default=False,
        description="Whether a load shedding event occurred",
        examples=[False],
    )
    power_factor: float = Field(
        ...,
        ge=0,
        le=1,
        description="Power factor (0-1)",
        examples=[0.95],
    )
    demand_kw: float = Field(
        ...,
        ge=0,
        description="Power demand in kilowatts",
        examples=[250.0],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meter_id": "METER-001",
                "timestamp": "2024-01-15T10:30:00Z",
                "kwh_consumed": 125.5,
                "tariff_rate": 0.15,
                "period_type": "peak",
                "solar_generation_kwh": 45.3,
                "load_shedding_event": False,
                "power_factor": 0.95,
                "demand_kw": 250.0,
            }
        }
    )


class RetailDataPoint(BaseModel):
    """Data point schema for retail vertical."""

    store_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique store identifier",
        examples=["STORE-001"],
    )
    date: datetime = Field(
        ...,
        description="Transaction date",
        examples=["2024-01-15T00:00:00Z"],
    )
    sku: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Stock keeping unit identifier",
        examples=["SKU-12345"],
    )
    daily_sales_units: int = Field(
        ...,
        ge=0,
        description="Number of units sold",
        examples=[150],
    )
    daily_revenue: float = Field(
        ...,
        ge=0,
        description="Daily revenue in currency units",
        examples=[4500.50],
    )
    inventory_level: int = Field(
        ...,
        ge=0,
        description="Current inventory level",
        examples=[500],
    )
    promo_active: bool = Field(
        default=False,
        description="Whether a promotion is active",
        examples=[True],
    )
    promo_discount_pct: float | None = Field(
        None,
        ge=0,
        le=100,
        description="Promotion discount percentage (optional)",
        examples=[20.0],
    )
    footfall_count: int = Field(
        ...,
        ge=0,
        description="Store footfall count",
        examples=[1200],
    )
    weather_condition: str | None = Field(
        None,
        max_length=50,
        description="Weather condition (optional)",
        examples=["sunny"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "store_id": "STORE-001",
                "date": "2024-01-15T00:00:00Z",
                "sku": "SKU-12345",
                "daily_sales_units": 150,
                "daily_revenue": 4500.50,
                "inventory_level": 500,
                "promo_active": True,
                "promo_discount_pct": 20.0,
                "footfall_count": 1200,
                "weather_condition": "sunny",
            }
        }
    )


class ManufacturingBatchIngestionRequest(BaseModel):
    """Batch ingestion request for manufacturing data."""

    site_id: UUID = Field(
        ...,
        description="Site ID for data ingestion",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    data_points: list[ManufacturingDataPoint] = Field(
        ...,
        min_length=1,
        description="List of manufacturing data points",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "data_points": [
                    {
                        "machine_id": "MACH-001",
                        "timestamp": "2024-01-15T10:30:00Z",
                        "uptime_minutes": 450.5,
                        "throughput_units": 1250,
                        "defect_count": 5,
                        "downtime_events": [{"reason": "maintenance", "duration_minutes": 30}],
                        "cycle_time_seconds": 45.2,
                        "quality_score": 98.5,
                    }
                ],
            }
        }
    )


class EnergyBatchIngestionRequest(BaseModel):
    """Batch ingestion request for energy data."""

    site_id: UUID = Field(
        ...,
        description="Site ID for data ingestion",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    data_points: list[EnergyDataPoint] = Field(
        ...,
        min_length=1,
        description="List of energy data points",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "data_points": [
                    {
                        "meter_id": "METER-001",
                        "timestamp": "2024-01-15T10:30:00Z",
                        "kwh_consumed": 125.5,
                        "tariff_rate": 0.15,
                        "period_type": "peak",
                        "solar_generation_kwh": 45.3,
                        "load_shedding_event": False,
                        "power_factor": 0.95,
                        "demand_kw": 250.0,
                    }
                ],
            }
        }
    )


class RetailBatchIngestionRequest(BaseModel):
    """Batch ingestion request for retail data."""

    site_id: UUID = Field(
        ...,
        description="Site ID for data ingestion",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    data_points: list[RetailDataPoint] = Field(
        ...,
        min_length=1,
        description="List of retail data points",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "data_points": [
                    {
                        "store_id": "STORE-001",
                        "date": "2024-01-15T00:00:00Z",
                        "sku": "SKU-12345",
                        "daily_sales_units": 150,
                        "daily_revenue": 4500.50,
                        "inventory_level": 500,
                        "promo_active": True,
                        "promo_discount_pct": 20.0,
                        "footfall_count": 1200,
                        "weather_condition": "sunny",
                    }
                ],
            }
        }
    )


class IngestionResponse(BaseModel):
    """Response schema for data ingestion."""

    success: bool = Field(
        ...,
        description="Whether ingestion was successful",
        examples=[True],
    )
    records_processed: int = Field(
        ...,
        ge=0,
        description="Number of records processed",
        examples=[100],
    )
    records_failed: int = Field(
        default=0,
        ge=0,
        description="Number of records that failed validation",
        examples=[0],
    )
    validation_results: list[dict] = Field(
        default_factory=list,
        description="Validation results for failed records",
        examples=[[{"record_index": 5, "errors": ["Invalid timestamp"]}]],
    )
    ingestion_id: UUID | None = Field(
        None,
        description="Unique ingestion batch identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "records_processed": 100,
                "records_failed": 0,
                "validation_results": [],
                "ingestion_id": "123e4567-e89b-12d3-a456-426614174000",
            }
        }
    )
