from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator


class UserBase(BaseModel):
    """Base user schema with common attributes."""

    email: EmailStr = Field(
        ...,
        description="User email address",
        examples=["user@example.com"],
    )
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="User's full name",
        examples=["John Doe"],
    )
    is_active: bool = Field(
        default=True,
        description="Whether the user account is active",
        examples=[True],
    )

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        """Validate email format and normalize to lowercase."""
        return v.lower().strip()


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    email: EmailStr = Field(
        ...,
        description="User email address",
        examples=["newuser@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="User password (8-100 characters)",
        examples=["SecureP@ssw0rd123"],
    )
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="User's full name",
        examples=["John Doe"],
    )
    organization_id: UUID | None = Field(
        None,
        description="Organization ID to associate user with",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    role: str = Field(
        default="user",
        description="User role in the system",
        examples=["user", "admin", "viewer"],
    )

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        """Validate email format and normalize to lowercase."""
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password strength."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    email: EmailStr | None = Field(
        None,
        description="User email address",
        examples=["updated@example.com"],
    )
    full_name: str | None = Field(
        None,
        min_length=2,
        max_length=100,
        description="User's full name",
        examples=["John Doe Updated"],
    )
    password: str | None = Field(
        None,
        min_length=8,
        max_length=100,
        description="New password (8-100 characters)",
        examples=["NewSecureP@ssw0rd123"],
    )
    is_active: bool | None = Field(
        None,
        description="Whether the user account is active",
        examples=[False],
    )
    role: str | None = Field(
        None,
        description="User role in the system",
        examples=["admin"],
    )

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str | None) -> str | None:
        """Validate email format and normalize to lowercase."""
        if v is not None:
            return v.lower().strip()
        return v

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str | None) -> str | None:
        """Validate password strength."""
        if v is not None:
            if not any(c.isupper() for c in v):
                raise ValueError("Password must contain at least one uppercase letter")
            if not any(c.islower() for c in v):
                raise ValueError("Password must contain at least one lowercase letter")
            if not any(c.isdigit() for c in v):
                raise ValueError("Password must contain at least one digit")
        return v


class UserResponse(UserBase):
    """Schema for user response."""

    id: UUID = Field(
        ...,
        description="Unique user identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
    )
    organization_id: UUID | None = Field(
        None,
        description="Organization ID the user belongs to",
        examples=["123e4567-e89b-12d3-a456-426614174001"],
    )
    role: str = Field(
        ...,
        description="User role in the system",
        examples=["user"],
    )
    created_at: datetime = Field(
        ...,
        description="User creation timestamp",
        examples=["2024-01-15T10:30:00Z"],
    )
    updated_at: datetime = Field(
        ...,
        description="User last update timestamp",
        examples=["2024-01-20T15:45:00Z"],
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "full_name": "John Doe",
                "is_active": True,
                "organization_id": "123e4567-e89b-12d3-a456-426614174001",
                "role": "user",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-20T15:45:00Z",
            }
        },
    )


class UserInDB(UserResponse):
    """Schema for user in database (includes internal fields)."""

    hashed_password: str = Field(
        ...,
        description="Hashed password (never exposed in API)",
    )

    model_config = ConfigDict(from_attributes=True)
