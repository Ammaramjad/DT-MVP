"""
Authentication API endpoints for login, register, token refresh, and logout.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import uuid4

from app.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.core.rbac import UserRole
from app.models.user import User
from app.models.organization import Organization
from app.models.org_membership import OrgMembership, OrgRole
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserRegister,
)
from app.schemas.user import UserResponse
from app.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
) -> UserResponse:
    """
    Register a new user account.
    
    Creates a new user and optionally creates an organization if organization_name is provided.
    The user becomes the owner of the created organization.
    
    Args:
        user_data: User registration data
        db: Database session
        
    Returns:
        Created user details
        
    Raises:
        HTTPException: If email already exists
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    new_user = User(
        email=user_data.email.lower(),
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        is_active=True
    )
    db.add(new_user)
    db.flush()
    
    # Create organization if provided
    if user_data.organization_name:
        org_slug = user_data.organization_name.lower().replace(" ", "-").replace("_", "-")
        org_slug = f"{org_slug}-{str(uuid4())[:8]}"
        
        new_org = Organization(
            name=user_data.organization_name,
            slug=org_slug,
            settings={}
        )
        db.add(new_org)
        db.flush()
        
        # Create membership with owner role
        membership = OrgMembership(
            user_id=new_user.id,
            org_id=new_org.id,
            role=OrgRole.OWNER
        )
        db.add(membership)
    
    db.commit()
    db.refresh(new_user)
    
    return UserResponse.model_validate(new_user)


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """
    Authenticate user and return JWT tokens.
    
    Args:
        credentials: User login credentials
        db: Database session
        
    Returns:
        Access and refresh tokens
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create tokens
    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """
    Refresh access token using valid refresh token.
    
    Args:
        refresh_data: Refresh token request data
        db: Database session
        
    Returns:
        New access and refresh tokens
        
    Raises:
        HTTPException: If refresh token is invalid
    """
    # Verify refresh token
    payload = verify_token(refresh_data.refresh_token, token_type="refresh")
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Verify user still exists and is active
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> None:
    """
    Logout user (client-side token invalidation).
    
    Since we're using stateless JWT tokens, logout is handled on the client side
    by removing the tokens from storage. This endpoint exists for API consistency
    and future server-side token blacklisting if needed.
    
    Returns:
        No content
    """
    # In a production system, you might want to add the token to a blacklist here
    # For now, client should remove the tokens from storage
    return None
