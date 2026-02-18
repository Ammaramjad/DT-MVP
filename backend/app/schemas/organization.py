from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class OrganizationBase(BaseModel):
    """Base organization schema with common attributes."""

    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Organization name",
        examples=["Acme Corporation"],
    )
    description: str | None = Field(
        None,
        max_length=500,
        description="Organization description",
        examples=["Leading manufacturing company specializing in automotive parts"],
    )


class OrganizationCreate(OrganizationBase):
    """Schema for creating a new organization."""

    pass


class OrganizationUpdate(BaseModel):
    """Schema for updating an organization."""

    name: str | None = Field(
        None,
        min_length=2,
        max_length=100,
        description="Organization name",
        examples=["Acme Corporation Updated"],
    )
    description: str | None = Field(
        None,
        max_length=500,
        description="Organization description",
        examples=["Updated description"],
    )


class OrganizationResponse(OrganizationBase):
    """Schema for organization response."""

    id: UUID = Field(
        ...,
        description="Unique organization identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    created_at: datetime = Field(
        ...,
        description="Organization creation timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    updated_at: datetime = Field(
        ...,
        description="Organization last update timestamp",
        examples=["2024-01-20T15:45:00Z"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "name": "Acme Corporation",
                "description": "Leading manufacturing company",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-20T15:45:00Z",
            }
        },
    )


class OrganizationInDB(OrganizationResponse):
    """Schema for organization in database (includes internal fields)."""

    model_config = ConfigDict(from_attributes=True)
