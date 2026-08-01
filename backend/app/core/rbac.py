"""
Role-Based Access Control (RBAC) utilities.
Defines user roles and permission checking.
"""
from enum import Enum
from typing import List
from fastapi import HTTPException, status


class UserRole(str, Enum):
    """User roles in the system."""
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"


class Permission(str, Enum):
    """Permission types."""
    # Organization permissions
    ORG_READ = "org:read"
    ORG_WRITE = "org:write"
    ORG_DELETE = "org:delete"
    ORG_MANAGE_USERS = "org:manage_users"
    
    # Project permissions
    PROJECT_READ = "project:read"
    PROJECT_WRITE = "project:write"
    PROJECT_DELETE = "project:delete"
    
    # Site permissions
    SITE_READ = "site:read"
    SITE_WRITE = "site:write"
    SITE_DELETE = "site:delete"
    
    # Data permissions
    DATA_READ = "data:read"
    DATA_WRITE = "data:write"
    DATA_DELETE = "data:delete"
    
    # Simulation permissions
    SIMULATION_READ = "simulation:read"
    SIMULATION_RUN = "simulation:run"
    SIMULATION_DELETE = "simulation:delete"
    
    # Recommendation permissions
    RECOMMENDATION_READ = "recommendation:read"
    RECOMMENDATION_UPDATE = "recommendation:update"


# Role to permissions mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        # Full access to everything
        Permission.ORG_READ, Permission.ORG_WRITE, Permission.ORG_DELETE, Permission.ORG_MANAGE_USERS,
        Permission.PROJECT_READ, Permission.PROJECT_WRITE, Permission.PROJECT_DELETE,
        Permission.SITE_READ, Permission.SITE_WRITE, Permission.SITE_DELETE,
        Permission.DATA_READ, Permission.DATA_WRITE, Permission.DATA_DELETE,
        Permission.SIMULATION_READ, Permission.SIMULATION_RUN, Permission.SIMULATION_DELETE,
        Permission.RECOMMENDATION_READ, Permission.RECOMMENDATION_UPDATE,
    ],
    UserRole.OPERATOR: [
        # Read/write access except org management
        Permission.ORG_READ,
        Permission.PROJECT_READ, Permission.PROJECT_WRITE,
        Permission.SITE_READ, Permission.SITE_WRITE,
        Permission.DATA_READ, Permission.DATA_WRITE,
        Permission.SIMULATION_READ, Permission.SIMULATION_RUN,
        Permission.RECOMMENDATION_READ, Permission.RECOMMENDATION_UPDATE,
    ],
    UserRole.VIEWER: [
        # Read-only access
        Permission.ORG_READ,
        Permission.PROJECT_READ,
        Permission.SITE_READ,
        Permission.DATA_READ,
        Permission.SIMULATION_READ,
        Permission.RECOMMENDATION_READ,
    ],
}


def get_role_permissions(role: UserRole) -> List[Permission]:
    """
    Get all permissions for a given role.
    
    Args:
        role: User role
        
    Returns:
        List of permissions
    """
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(user_role: UserRole, required_permission: Permission) -> bool:
    """
    Check if a user role has a specific permission.
    
    Args:
        user_role: User's role
        required_permission: Permission to check
        
    Returns:
        True if user has permission, False otherwise
    """
    role_perms = get_role_permissions(user_role)
    return required_permission in role_perms


def require_permission(user_role: UserRole, required_permission: Permission):
    """
    Raise exception if user doesn't have required permission.
    
    Args:
        user_role: User's role
        required_permission: Required permission
        
    Raises:
        HTTPException: If user lacks permission
    """
    if not has_permission(user_role, required_permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required permission: {required_permission.value}"
        )


def require_any_permission(user_role: UserRole, required_permissions: List[Permission]):
    """
    Raise exception if user doesn't have at least one of the required permissions.
    
    Args:
        user_role: User's role
        required_permissions: List of acceptable permissions
        
    Raises:
        HTTPException: If user lacks all permissions
    """
    for perm in required_permissions:
        if has_permission(user_role, perm):
            return
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Permission denied. You don't have any of the required permissions."
    )


def require_role(user_role: UserRole, required_roles: List[UserRole]):
    """
    Raise exception if user doesn't have one of the required roles.
    
    Args:
        user_role: User's role
        required_roles: List of acceptable roles
        
    Raises:
        HTTPException: If user doesn't have required role
    """
    if user_role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required roles: {[r.value for r in required_roles]}"
        )
