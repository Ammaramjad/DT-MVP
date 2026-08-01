"""
Integration tests for authentication API endpoints.
Tests /auth endpoints: login, register, refresh, logout.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from tests.test_utils.helpers import assert_error_response, assert_field_in_response


@pytest.mark.integration
@pytest.mark.auth
class TestAuthRegister:
    """Test user registration endpoint."""
    
    def test_register_user_success(self, client: TestClient, db: Session):
        """Test successful user registration."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "SecurePass123!",
                "full_name": "New User"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert_field_in_response(response, "id", "email", "full_name")
        assert data["email"] == "newuser@example.com"
        assert "hashed_password" not in data
    
    def test_register_with_organization(self, client: TestClient):
        """Test registration with automatic organization creation."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "orgowner@example.com",
                "password": "SecurePass123!",
                "full_name": "Org Owner",
                "organization_name": "Test Organization"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "orgowner@example.com"
    
    def test_register_duplicate_email(self, client: TestClient, test_user: User):
        """Test registration fails with duplicate email."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "password": "SecurePass123!",
                "full_name": "Duplicate"
            }
        )
        
        assert_error_response(response, 400, "already registered")
    
    def test_register_weak_password(self, client: TestClient):
        """Test registration fails with weak password."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@example.com",
                "password": "weak",
                "full_name": "Weak Password"
            }
        )
        
        assert_error_response(response, 400)


@pytest.mark.integration
@pytest.mark.auth
class TestAuthLogin:
    """Test user login endpoint."""
    
    def test_login_success(self, client: TestClient, test_user: User, test_password: str):
        """Test successful login."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": test_password
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_email(self, client: TestClient):
        """Test login fails with non-existent email."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "TestPass123!"
            }
        )
        
        assert_error_response(response, 401)
    
    def test_login_invalid_password(self, client: TestClient, test_user: User):
        """Test login fails with wrong password."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "WrongPassword123!"
            }
        )
        
        assert_error_response(response, 401)
    
    def test_login_inactive_user(self, client: TestClient, inactive_user: User, test_password: str):
        """Test login fails for inactive user."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": inactive_user.email,
                "password": test_password
            }
        )
        
        assert_error_response(response, 401, "inactive")


@pytest.mark.integration
@pytest.mark.auth
class TestAuthProtectedEndpoint:
    """Test accessing protected endpoints with authentication."""
    
    def test_access_with_valid_token(self, client: TestClient, auth_headers: dict):
        """Test accessing protected endpoint with valid token."""
        # Try to access organizations endpoint (requires auth)
        response = client.get("/api/v1/organizations", headers=auth_headers)
        assert response.status_code in [200, 404]  # 200 if orgs exist, 404 if not
    
    def test_access_without_token(self, client: TestClient):
        """Test accessing protected endpoint without token fails."""
        response = client.get("/api/v1/organizations")
        assert response.status_code == 403
    
    def test_access_with_invalid_token(self, client: TestClient):
        """Test accessing protected endpoint with invalid token fails."""
        response = client.get(
            "/api/v1/organizations",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
