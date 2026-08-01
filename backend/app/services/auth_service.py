"""
Authentication service for user authentication and registration.
"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.models.organization import Organization
from app.models.org_membership import OrgMembership, OrgRole
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.core.exceptions import AuthenticationError, ValidationError
from app.schemas.auth import UserRegister


def authenticate_user(email: str, password: str, db: Session) -> Optional[User]:
    """
    Authenticate a user with email and password.
    
    Args:
        email: User email address
        password: Plain text password
        db: Database session
        
    Returns:
        User object if authentication successful, None otherwise
        
    Raises:
        AuthenticationError: If credentials are invalid or user is inactive
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise AuthenticationError("Invalid email or password")
    
    if not user.is_active:
        raise AuthenticationError("User account is inactive")
    
    if not verify_password(password, user.hashed_password):
        raise AuthenticationError("Invalid email or password")
    
    return user


def create_user_with_password(user_data: UserRegister, db: Session) -> User:
    """
    Create a new user with hashed password and optionally create organization.
    
    Args:
        user_data: User registration data including email, password, full_name
        db: Database session
        
    Returns:
        Created User object
        
    Raises:
        ValidationError: If email already exists or data is invalid
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise ValidationError("Email already registered")
    
    # Validate password strength
    if not validate_credentials(user_data.email, user_data.password):
        raise ValidationError("Password does not meet security requirements")
    
    try:
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        new_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            is_active=True
        )
        db.add(new_user)
        db.flush()  # Get user ID without committing
        
        # Create organization if provided
        if user_data.organization_name:
            organization = Organization(
                name=user_data.organization_name,
                owner_id=new_user.id
            )
            db.add(organization)
            db.flush()
            
            # Create membership linking user to organization as admin
            membership = OrgMembership(
                user_id=new_user.id,
                org_id=organization.id,
                role=OrgRole.ADMIN
            )
            db.add(membership)
        
        db.commit()
        db.refresh(new_user)
        return new_user
        
    except IntegrityError as e:
        db.rollback()
        raise ValidationError(f"Database integrity error: {str(e)}")


def validate_credentials(email: str, password: str) -> bool:
    """
    Validate email and password meet security requirements.
    
    Args:
        email: Email address to validate
        password: Password to validate
        
    Returns:
        True if credentials are valid, False otherwise
    """
    # Email validation (basic)
    if not email or "@" not in email or len(email) < 5:
        return False
    
    # Password validation
    if len(password) < 8:
        return False
    
    # Check for at least one uppercase, one lowercase, and one digit
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    
    return has_upper and has_lower and has_digit


def generate_tokens(user: User) -> dict[str, str]:
    """
    Generate access and refresh tokens for authenticated user.
    
    Args:
        user: Authenticated user object
        
    Returns:
        Dictionary with access_token and refresh_token
    """
    token_data = {
        "sub": str(user.id),
        "email": user.email
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }
