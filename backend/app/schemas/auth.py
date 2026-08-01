from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class LoginRequest(BaseModel):
    """Login request schema with email and password."""

    email: EmailStr = Field(
        ...,
        description="User email address",
        examples=["user@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        description="User password (minimum 8 characters)",
        examples=["SecureP@ssw0rd"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "password": "SecureP@ssw0rd",
            }
        }
    )


class TokenResponse(BaseModel):
    """Token response schema with access and refresh tokens."""

    access_token: str = Field(
        ...,
        description="JWT access token for authentication",
        examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
    )
    refresh_token: str = Field(
        ...,
        description="JWT refresh token for obtaining new access tokens",
        examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
    )
    token_type: str = Field(
        default="bearer",
        description="Token type (always bearer)",
        examples=["bearer"],
    )
    expires_in: int = Field(
        ...,
        description="Access token expiration time in seconds",
        examples=[3600],
        gt=0,
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 3600,
            }
        }
    )


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""

    refresh_token: str = Field(
        ...,
        description="Valid refresh token",
        examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            }
        }
    )


class UserRegister(BaseModel):
    """User registration schema."""

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
    organization_name: str | None = Field(
        None,
        min_length=2,
        max_length=100,
        description="Organization name (will be created if provided)",
        examples=["Acme Corporation"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "newuser@example.com",
                "password": "SecureP@ssw0rd123",
                "full_name": "John Doe",
                "organization_name": "Acme Corporation",
            }
        }
    )
