"""
FastAPI dependencies for authentication and database.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import verify_token
from app.core.rbac import UserRole
from app.core.exceptions import UnauthorizedException
from app.models.user import User
from app.models.org_membership import OrgMembership

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        credentials: Bearer token from request header
        db: Database session
        
    Returns:
        Authenticated User object
        
    Raises:
        UnauthorizedException: If token is invalid or user not found
    """
    token = credentials.credentials
    payload = verify_token(token, token_type="access")
    
    if payload is None:
        raise UnauthorizedException("Invalid or expired token")
    
    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException("Invalid token payload")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise UnauthorizedException("User not found")
    
    if not user.is_active:
        raise UnauthorizedException("User account is inactive")
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure current user is active.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Active User object
        
    Raises:
        UnauthorizedException: If user is inactive
    """
    if not current_user.is_active:
        raise UnauthorizedException("User account is inactive")
    return current_user


def get_user_org_membership(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> OrgMembership:
    """
    Get user's membership in a specific organization.
    
    Args:
        org_id: Organization ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        OrgMembership object
        
    Raises:
        HTTPException: If user is not a member of the organization
    """
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization"
        )
    
    return membership


def require_org_role(required_roles: list[UserRole]):
    """
    Dependency factory to require specific organization role(s).
    
    Args:
        required_roles: List of acceptable roles
        
    Returns:
        Dependency function
    """
    async def role_checker(
        org_id: str,
        membership: OrgMembership = Depends(get_user_org_membership)
    ) -> OrgMembership:
        if membership.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {[r.value for r in required_roles]}"
            )
        return membership
    
    return role_checker


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependency to optionally get the current user.
    Returns None if no valid token is provided.
    
    Args:
        credentials: Optional bearer token
        db: Database session
        
    Returns:
        User object or None
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = verify_token(token, token_type="access")
        
        if payload is None:
            return None
        
        user_id = payload.get("sub")
        if user_id is None:
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except Exception:
        return None
