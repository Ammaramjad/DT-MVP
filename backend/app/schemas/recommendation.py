from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, field_validator


class RecommendationCategoryEnum(str, Enum):
    """Enum for recommendation categories."""

    COST_SAVING = "cost_saving"
    EFFICIENCY = "efficiency"
    QUALITY = "quality"
    INVENTORY = "inventory"


class RecommendationPriorityEnum(str, Enum):
    """Enum for recommendation priorities."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RecommendationBase(BaseModel):
    """Base recommendation schema with common attributes."""

    title: str = Field(
        ...,
        min_length=5,
        max_length=200,
        description="Recommendation title",
        examples=["Optimize production schedule to reduce peak energy costs"],
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Detailed recommendation description",
        examples=[
            "Analysis shows that shifting 20% of production to off-peak hours "
            "could reduce energy costs by $3,500 per month."
        ],
    )
    category: RecommendationCategoryEnum = Field(
        ...,
        description="Recommendation category",
        examples=["cost_saving"],
    )
    priority: RecommendationPriorityEnum = Field(
        ...,
        description="Recommendation priority level",
        examples=["high"],
    )
    impact_estimate: dict[str, float] = Field(
        ...,
        description="Estimated impact metrics (e.g., {'cost_savings_monthly': 3500.0})",
        examples=[{"cost_savings_monthly": 3500.0, "payback_period_months": 6}],
    )

    @field_validator("impact_estimate")
    @classmethod
    def validate_impact_estimate(cls, v: dict[str, float]) -> dict[str, float]:
        """Validate impact estimate contains at least one metric."""
        if not v:
            raise ValueError("impact_estimate must contain at least one metric")
        return v


class RecommendationCreate(RecommendationBase):
    """Schema for creating a new recommendation."""

    site_id: UUID = Field(
        ...,
        description="Site ID the recommendation is for",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    source: str = Field(
        default="ai_engine",
        max_length=100,
        description="Source of the recommendation (e.g., 'ai_engine', 'manual', 'simulation')",
        examples=["ai_engine"],
    )
    confidence_score: float = Field(
        ...,
        ge=0,
        le=1,
        description="Confidence score for the recommendation (0-1)",
        examples=[0.85],
    )
    implementation_steps: list[str] | None = Field(
        None,
        description="List of implementation steps",
        examples=[
            [
                "Analyze current production schedule",
                "Identify production lines suitable for off-peak operation",
                "Implement scheduling changes",
            ]
        ],
    )


class RecommendationResponse(RecommendationBase):
    """Schema for recommendation response."""

    id: UUID = Field(
        ...,
        description="Unique recommendation identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    site_id: UUID = Field(
        ...,
        description="Site ID the recommendation is for",
        examples=["123e4567-e89b-12d3-a456-426614174001"],
    )
    source: str = Field(
        ...,
        description="Source of the recommendation",
        examples=["ai_engine"],
    )
    confidence_score: float = Field(
        ...,
        ge=0,
        le=1,
        description="Confidence score for the recommendation",
        examples=[0.85],
    )
    implementation_steps: list[str] | None = Field(
        None,
        description="List of implementation steps",
        examples=[
            [
                "Analyze current production schedule",
                "Identify production lines suitable for off-peak operation",
            ]
        ],
    )
    status: str = Field(
        default="pending",
        description="Recommendation status",
        examples=["pending"],
    )
    created_at: datetime = Field(
        ...,
        description="Recommendation creation timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    updated_at: datetime = Field(
        ...,
        description="Recommendation last update timestamp",
        examples=["2024-01-20T15:45:00Z"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "site_id": "123e4567-e89b-12d3-a456-426614174001",
                "title": "Optimize production schedule to reduce peak energy costs",
                "description": "Analysis shows that shifting 20% of production to off-peak hours could reduce energy costs by $3,500 per month.",
                "category": "cost_saving",
                "priority": "high",
                "impact_estimate": {
                    "cost_savings_monthly": 3500.0,
                    "payback_period_months": 6,
                },
                "source": "ai_engine",
                "confidence_score": 0.85,
                "implementation_steps": [
                    "Analyze current production schedule",
                    "Identify production lines suitable for off-peak operation",
                    "Implement scheduling changes",
                ],
                "status": "pending",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-20T15:45:00Z",
            }
        },
    )
