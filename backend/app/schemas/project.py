from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class VerticalEnum(str, Enum):
    """Enum for industry verticals."""

    MANUFACTURING = "manufacturing"
    ENERGY = "energy"
    RETAIL = "retail"


class ProjectBase(BaseModel):
    """Base project schema with common attributes."""

    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Project name",
        examples=["Smart Factory Initiative"],
    )
    description: str | None = Field(
        None,
        max_length=1000,
        description="Project description",
        examples=["Digital twin implementation for production line optimization"],
    )
    vertical: VerticalEnum = Field(
        ...,
        description="Industry vertical for the project",
        examples=["manufacturing"],
    )


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""

    organization_id: UUID = Field(
        ...,
        description="Organization ID the project belongs to",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""

    name: str | None = Field(
        None,
        min_length=2,
        max_length=100,
        description="Project name",
        examples=["Updated Project Name"],
    )
    description: str | None = Field(
        None,
        max_length=1000,
        description="Project description",
        examples=["Updated description"],
    )
    vertical: VerticalEnum | None = Field(
        None,
        description="Industry vertical for the project",
        examples=["energy"],
    )


class ProjectResponse(ProjectBase):
    """Schema for project response."""

    id: UUID = Field(
        ...,
        description="Unique project identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    organization_id: UUID = Field(
        ...,
        description="Organization ID the project belongs to",
        examples=["123e4567-e89b-12d3-a456-426614174001"],
    )
    created_at: datetime = Field(
        ...,
        description="Project creation timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    updated_at: datetime = Field(
        ...,
        description="Project last update timestamp",
        examples=["2024-01-20T15:45:00Z"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "name": "Smart Factory Initiative",
                "description": "Digital twin implementation for production line optimization",
                "vertical": "manufacturing",
                "organization_id": "123e4567-e89b-12d3-a456-426614174001",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-20T15:45:00Z",
            }
        },
    )
