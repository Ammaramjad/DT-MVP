from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class VerticalEnum(str, Enum):
    """Enum for industry verticals."""

    MANUFACTURING = "manufacturing"
    ENERGY = "energy"
    RETAIL = "retail"


class SiteTypeEnum(str, Enum):
    """Enum for site types."""

    FACTORY = "factory"
    WAREHOUSE = "warehouse"
    PLANT = "plant"
    SUBSTATION = "substation"
    DISTRIBUTION_CENTER = "distribution_center"
    STORE = "store"
    OFFICE = "office"


class SiteBase(BaseModel):
    """Base site schema with common attributes."""

    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Site name",
        examples=["Factory Building A"],
    )
    location: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Site location address",
        examples=["123 Industrial Blvd, Manufacturing City, ST 12345"],
    )
    vertical: VerticalEnum = Field(
        ...,
        description="Industry vertical for the site",
        examples=["manufacturing"],
    )
    site_type: SiteTypeEnum = Field(
        ...,
        description="Type of site",
        examples=["factory"],
    )
    latitude: float | None = Field(
        None,
        ge=-90,
        le=90,
        description="Site latitude coordinate",
        examples=[37.7749],
    )
    longitude: float | None = Field(
        None,
        ge=-180,
        le=180,
        description="Site longitude coordinate",
        examples=[-122.4194],
    )


class SiteCreate(SiteBase):
    """Schema for creating a new site."""

    project_id: UUID = Field(
        ...,
        description="Project ID the site belongs to",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )


class SiteUpdate(BaseModel):
    """Schema for updating a site."""

    name: str | None = Field(
        None,
        min_length=2,
        max_length=100,
        description="Site name",
        examples=["Updated Site Name"],
    )
    location: str | None = Field(
        None,
        min_length=2,
        max_length=200,
        description="Site location address",
        examples=["Updated address"],
    )
    vertical: VerticalEnum | None = Field(
        None,
        description="Industry vertical for the site",
        examples=["energy"],
    )
    site_type: SiteTypeEnum | None = Field(
        None,
        description="Type of site",
        examples=["plant"],
    )
    latitude: float | None = Field(
        None,
        ge=-90,
        le=90,
        description="Site latitude coordinate",
        examples=[37.7749],
    )
    longitude: float | None = Field(
        None,
        ge=-180,
        le=180,
        description="Site longitude coordinate",
        examples=[-122.4194],
    )


class SiteResponse(SiteBase):
    """Schema for site response."""

    id: UUID = Field(
        ...,
        description="Unique site identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    project_id: UUID = Field(
        ...,
        description="Project ID the site belongs to",
        examples=["123e4567-e89b-12d3-a456-426614174001"],
    )
    created_at: datetime = Field(
        ...,
        description="Site creation timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    updated_at: datetime = Field(
        ...,
        description="Site last update timestamp",
        examples=["2024-01-20T15:45:00Z"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "name": "Factory Building A",
                "location": "123 Industrial Blvd, Manufacturing City, ST 12345",
                "vertical": "manufacturing",
                "site_type": "factory",
                "latitude": 37.7749,
                "longitude": -122.4194,
                "project_id": "123e4567-e89b-12d3-a456-426614174001",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-20T15:45:00Z",
            }
        },
    )
