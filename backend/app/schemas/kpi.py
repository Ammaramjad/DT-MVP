from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ManufacturingKPI(BaseModel):
    """KPI schema for manufacturing vertical."""

    site_id: UUID = Field(
        ...,
        description="Site identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    timestamp: datetime = Field(
        ...,
        description="KPI calculation timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    oee: float = Field(
        ...,
        ge=0,
        le=100,
        description="Overall Equipment Effectiveness percentage",
        examples=[85.5],
    )
    availability: float = Field(
        ...,
        ge=0,
        le=100,
        description="Machine availability percentage",
        examples=[92.3],
    )
    performance: float = Field(
        ...,
        ge=0,
        le=100,
        description="Machine performance percentage",
        examples=[95.7],
    )
    quality: float = Field(
        ...,
        ge=0,
        le=100,
        description="Quality percentage (good units / total units)",
        examples=[97.1],
    )
    mtbf: float = Field(
        ...,
        ge=0,
        description="Mean Time Between Failures in hours",
        examples=[120.5],
    )
    mttr: float = Field(
        ...,
        ge=0,
        description="Mean Time To Repair in hours",
        examples=[2.5],
    )
    first_pass_yield: float = Field(
        ...,
        ge=0,
        le=100,
        description="First pass yield percentage",
        examples=[94.8],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "timestamp": "2024-01-15T10:30:00Z",
                "oee": 85.5,
                "availability": 92.3,
                "performance": 95.7,
                "quality": 97.1,
                "mtbf": 120.5,
                "mttr": 2.5,
                "first_pass_yield": 94.8,
            }
        },
    )


class EnergyKPI(BaseModel):
    """KPI schema for energy vertical."""

    site_id: UUID = Field(
        ...,
        description="Site identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    timestamp: datetime = Field(
        ...,
        description="KPI calculation timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    total_cost: float = Field(
        ...,
        ge=0,
        description="Total energy cost in currency units",
        examples=[15420.50],
    )
    peak_demand_cost: float = Field(
        ...,
        ge=0,
        description="Peak demand cost in currency units",
        examples=[3250.00],
    )
    energy_intensity: float = Field(
        ...,
        ge=0,
        description="Energy intensity (kWh per unit of output)",
        examples=[0.85],
    )
    solar_contribution_pct: float = Field(
        ...,
        ge=0,
        le=100,
        description="Solar generation contribution percentage",
        examples=[25.5],
    )
    load_factor: float = Field(
        ...,
        ge=0,
        le=1,
        description="Load factor (average load / peak load)",
        examples=[0.72],
    )
    carbon_emissions: float = Field(
        ...,
        ge=0,
        description="Carbon emissions in kg CO2",
        examples=[8500.0],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "timestamp": "2024-01-15T10:30:00Z",
                "total_cost": 15420.50,
                "peak_demand_cost": 3250.00,
                "energy_intensity": 0.85,
                "solar_contribution_pct": 25.5,
                "load_factor": 0.72,
                "carbon_emissions": 8500.0,
            }
        },
    )


class RetailKPI(BaseModel):
    """KPI schema for retail vertical."""

    site_id: UUID = Field(
        ...,
        description="Site identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    timestamp: datetime = Field(
        ...,
        description="KPI calculation timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    sales_velocity: float = Field(
        ...,
        ge=0,
        description="Average daily sales units",
        examples=[1250.5],
    )
    margin_pct: float = Field(
        ...,
        ge=0,
        le=100,
        description="Profit margin percentage",
        examples=[35.5],
    )
    inventory_turnover: float = Field(
        ...,
        ge=0,
        description="Inventory turnover ratio",
        examples=[8.5],
    )
    stockout_rate: float = Field(
        ...,
        ge=0,
        le=100,
        description="Stockout rate percentage",
        examples=[2.5],
    )
    promo_effectiveness: float = Field(
        ...,
        ge=0,
        description="Promotion effectiveness score (revenue lift multiplier)",
        examples=[1.45],
    )
    conversion_rate: float = Field(
        ...,
        ge=0,
        le=100,
        description="Conversion rate percentage (sales / footfall)",
        examples=[12.5],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "timestamp": "2024-01-15T10:30:00Z",
                "sales_velocity": 1250.5,
                "margin_pct": 35.5,
                "inventory_turnover": 8.5,
                "stockout_rate": 2.5,
                "promo_effectiveness": 1.45,
                "conversion_rate": 12.5,
            }
        },
    )
