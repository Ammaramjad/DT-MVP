"""
Unit tests for authentication service.
Tests user authentication, registration, password hashing, and token generation.
"""
import pytest
from sqlalchemy.orm import Session

from app.services.auth_service import (
    authenticate_user,
    create_user_with_password,
    validate_credentials,
    generate_tokens
)
from app.core.security import verify_password, verify_token
from app.core.exceptions import AuthenticationError, ValidationError
from app.models.user import User
from app.models.organization import Organization
from app.models.org_membership import OrgMembership, OrgRole
from app.schemas.auth import UserRegister


@pytest.mark.unit
@pytest.mark.auth
class TestAuthService:
    """Test authentication service functions."""
    
    def test_authenticate_user_success(self, db: Session, test_user: User, test_password: str):
        """Test successful user authentication with correct credentials."""
        user = authenticate_user(test_user.email, test_password, db)
        
        assert user is not None
        assert user.id == test_user.id
        assert user.email == test_user.email
    
    def test_authenticate_user_invalid_email(self, db: Session):
        """Test authentication fails with non-existent email."""
        with pytest.raises(AuthenticationError) as exc_info:
            authenticate_user("nonexistent@example.com", "TestPass123!", db)
        
        assert "invalid email or password" in str(exc_info.value).lower()
    
    def test_authenticate_user_invalid_password(self, db: Session, test_user: User):
        """Test authentication fails with incorrect password."""
        with pytest.raises(AuthenticationError) as exc_info:
            authenticate_user(test_user.email, "WrongPassword123!", db)
        
        assert "invalid email or password" in str(exc_info.value).lower()
    
    def test_authenticate_inactive_user(self, db: Session, inactive_user: User, test_password: str):
        """Test authentication fails for inactive user."""
        with pytest.raises(AuthenticationError) as exc_info:
            authenticate_user(inactive_user.email, test_password, db)
        
        assert "inactive" in str(exc_info.value).lower()


@pytest.mark.unit
@pytest.mark.auth
class TestUserRegistration:
    """Test user registration functionality."""
    
    def test_create_user_success(self, db: Session):
        """Test creating a new user successfully."""
        user_data = UserRegister(
            email="newuser@example.com",
            password="SecurePass123!",
            full_name="New User"
        )
        
        user = create_user_with_password(user_data, db)
        
        assert user.id is not None
        assert user.email == "newuser@example.com"
        assert user.full_name == "New User"
        assert user.is_active is True
        assert verify_password("SecurePass123!", user.hashed_password)
    
    def test_create_user_with_organization(self, db: Session):
        """Test creating user with organization automatically creates org and membership."""
        user_data = UserRegister(
            email="orgcreator@example.com",
            password="SecurePass123!",
            full_name="Org Creator",
            organization_name="New Organization"
        )
        
        user = create_user_with_password(user_data, db)
        
        assert user.id is not None
        
        # Check that membership was created
        memberships = db.query(OrgMembership).filter(
            OrgMembership.user_id == user.id
        ).all()
        
        assert len(memberships) == 1
        assert memberships[0].role == OrgRole.ADMIN
        
        # Check organization was created
        org = memberships[0].organization
        assert org.name == "New Organization"
    
    def test_create_user_duplicate_email(self, db: Session, test_user: User):
        """Test creating user with duplicate email raises error."""
        user_data = UserRegister(
            email=test_user.email,
            password="SecurePass123!",
            full_name="Duplicate User"
        )
        
        with pytest.raises(ValidationError) as exc_info:
            create_user_with_password(user_data, db)
        
        assert "already registered" in str(exc_info.value).lower()
    
    def test_create_user_weak_password(self, db: Session):
        """Test creating user with weak password raises error."""
        user_data = UserRegister(
            email="weakpass@example.com",
            password="weak",
            full_name="Weak Password User"
        )
        
        with pytest.raises(ValidationError) as exc_info:
            create_user_with_password(user_data, db)
        
        assert "security requirements" in str(exc_info.value).lower()


@pytest.mark.unit
@pytest.mark.auth
class TestPasswordValidation:
    """Test password and credential validation."""
    
    @pytest.mark.parametrize("email,password,expected", [
        ("valid@example.com", "StrongPass123!", True),
        ("valid@example.com", "Pass1234", True),
        ("valid@example.com", "short1A", False),  # Too short
        ("valid@example.com", "nouppercase123!", False),  # No uppercase
        ("valid@example.com", "NOLOWERCASE123!", False),  # No lowercase
        ("valid@example.com", "NoDigitsHere!", False),  # No digits
        ("", "StrongPass123!", False),  # Empty email
        ("invalidemail", "StrongPass123!", False),  # Invalid email format
        ("a@b.c", "StrongPass123!", True),  # Minimal valid email
    ])
    def test_validate_credentials(self, email: str, password: str, expected: bool):
        """Test credential validation with various inputs."""
        result = validate_credentials(email, password)
        assert result == expected
    
    def test_password_length_requirement(self):
        """Test password must be at least 8 characters."""
        assert validate_credentials("test@example.com", "Short1A") is False
        assert validate_credentials("test@example.com", "LongPass1") is True
    
    def test_password_complexity_requirements(self):
        """Test password must have uppercase, lowercase, and digit."""
        # Missing uppercase
        assert validate_credentials("test@example.com", "lowercase123") is False
        
        # Missing lowercase
        assert validate_credentials("test@example.com", "UPPERCASE123") is False
        
        # Missing digit
        assert validate_credentials("test@example.com", "NoDigitsHere") is False
        
        # All requirements met
        assert validate_credentials("test@example.com", "ValidPass123") is True


@pytest.mark.unit
@pytest.mark.auth
class TestTokenGeneration:
    """Test JWT token generation and validation."""
    
    def test_generate_tokens(self, test_user: User):
        """Test generating access and refresh tokens."""
        tokens = generate_tokens(test_user)
        
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert isinstance(tokens["access_token"], str)
        assert isinstance(tokens["refresh_token"], str)
        assert len(tokens["access_token"]) > 20
        assert len(tokens["refresh_token"]) > 20
    
    def test_access_token_valid(self, test_user: User):
        """Test that generated access token is valid."""
        tokens = generate_tokens(test_user)
        access_token = tokens["access_token"]
        
        payload = verify_token(access_token, token_type="access")
        
        assert payload is not None
        assert payload["sub"] == str(test_user.id)
        assert payload["email"] == test_user.email
        assert payload["type"] == "access"
    
    def test_refresh_token_valid(self, test_user: User):
        """Test that generated refresh token is valid."""
        tokens = generate_tokens(test_user)
        refresh_token = tokens["refresh_token"]
        
        payload = verify_token(refresh_token, token_type="refresh")
        
        assert payload is not None
        assert payload["sub"] == str(test_user.id)
        assert payload["email"] == test_user.email
        assert payload["type"] == "refresh"
    
    def test_token_contains_user_info(self, test_user: User):
        """Test that tokens contain necessary user information."""
        tokens = generate_tokens(test_user)
        
        # Verify access token payload
        access_payload = verify_token(tokens["access_token"], token_type="access")
        assert access_payload["sub"] == str(test_user.id)
        assert access_payload["email"] == test_user.email
        
        # Verify refresh token payload
        refresh_payload = verify_token(tokens["refresh_token"], token_type="refresh")
        assert refresh_payload["sub"] == str(test_user.id)
        assert refresh_payload["email"] == test_user.email
    
    def test_access_token_wrong_type(self, test_user: User):
        """Test that access token fails validation as refresh token."""
        tokens = generate_tokens(test_user)
        access_token = tokens["access_token"]
        
        payload = verify_token(access_token, token_type="refresh")
        assert payload is None
    
    def test_refresh_token_wrong_type(self, test_user: User):
        """Test that refresh token fails validation as access token."""
        tokens = generate_tokens(test_user)
        refresh_token = tokens["refresh_token"]
        
        payload = verify_token(refresh_token, token_type="access")
        assert payload is None


@pytest.mark.unit
@pytest.mark.auth
class TestPasswordHashing:
    """Test password hashing security."""
    
    def test_password_hashed_not_plain(self, db: Session):
        """Test that stored password is hashed, not plain text."""
        user_data = UserRegister(
            email="hashtest@example.com",
            password="PlainPassword123!",
            full_name="Hash Test"
        )
        
        user = create_user_with_password(user_data, db)
        
        # Hashed password should not match plain password
        assert user.hashed_password != "PlainPassword123!"
        # Hashed password should be significantly longer
        assert len(user.hashed_password) > len("PlainPassword123!")
    
    def test_same_password_different_hashes(self, db: Session):
        """Test that same password generates different hashes (bcrypt salt)."""
        password = "SamePassword123!"
        
        user1_data = UserRegister(
            email="user1@example.com",
            password=password,
            full_name="User 1"
        )
        user1 = create_user_with_password(user1_data, db)
        
        user2_data = UserRegister(
            email="user2@example.com",
            password=password,
            full_name="User 2"
        )
        user2 = create_user_with_password(user2_data, db)
        
        # Hashes should be different due to salt
        assert user1.hashed_password != user2.hashed_password
        
        # But both should verify correctly
        assert verify_password(password, user1.hashed_password)
        assert verify_password(password, user2.hashed_password)
    
    def test_password_verification(self):
        """Test password verification with hashed password."""
        from app.core.security import get_password_hash
        
        plain_password = "TestPassword123!"
        hashed = get_password_hash(plain_password)
        
        # Correct password should verify
        assert verify_password(plain_password, hashed) is True
        
        # Incorrect password should not verify
        assert verify_password("WrongPassword123!", hashed) is False
