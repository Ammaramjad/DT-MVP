"""
Helper functions for common test operations.
"""
from typing import Dict, Any, Optional
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project
from app.models.site import Site
from app.core.security import create_access_token


def get_auth_headers(user: User) -> Dict[str, str]:
    """
    Generate authentication headers for a user.
    
    Args:
        user: User object to generate token for
        
    Returns:
        Dictionary with Authorization header
    """
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"Authorization": f"Bearer {token}"}


def assert_error_response(response, status_code: int, detail: Optional[str] = None):
    """
    Assert that a response is an error with expected status code and optional detail.
    
    Args:
        response: Response object from test client
        status_code: Expected HTTP status code
        detail: Optional expected error detail message
    """
    assert response.status_code == status_code
    if detail:
        data = response.json()
        assert "detail" in data
        assert detail.lower() in data["detail"].lower()


def assert_success_response(response, status_code: int = 200):
    """
    Assert that a response is successful with expected status code.
    
    Args:
        response: Response object from test client
        status_code: Expected HTTP status code (default 200)
    """
    assert response.status_code == status_code


def create_test_hierarchy(
    db: Session,
    user: User,
    org: Organization,
    project: Project,
    site: Site
) -> Dict[str, Any]:
    """
    Create a complete test hierarchy with user, org, project, and site.
    
    Args:
        db: Database session
        user: User object
        org: Organization object
        project: Project object
        site: Site object
        
    Returns:
        Dictionary with all created objects
    """
    return {
        "user": user,
        "org": org,
        "project": project,
        "site": site,
        "auth_headers": get_auth_headers(user)
    }


def extract_id_from_response(response) -> str:
    """
    Extract ID from a successful creation response.
    
    Args:
        response: Response object from test client
        
    Returns:
        ID string from response
    """
    assert response.status_code in [200, 201]
    data = response.json()
    assert "id" in data
    return data["id"]


def assert_pagination_response(
    response,
    expected_total: Optional[int] = None,
    expected_page: int = 1,
    expected_per_page: int = 20
):
    """
    Assert that a response has correct pagination structure.
    
    Args:
        response: Response object from test client
        expected_total: Expected total count (optional)
        expected_page: Expected current page number
        expected_per_page: Expected items per page
    """
    assert response.status_code == 200
    data = response.json()
    
    # Check for required pagination fields
    assert "items" in data or "data" in data
    assert "total" in data
    assert "page" in data
    assert "per_page" in data or "page_size" in data
    
    # Verify pagination values
    assert data["page"] == expected_page
    
    if expected_total is not None:
        assert data["total"] == expected_total


def assert_field_in_response(response, *fields):
    """
    Assert that specified fields exist in response JSON.
    
    Args:
        response: Response object from test client
        fields: Field names to check
    """
    data = response.json()
    for field in fields:
        assert field in data, f"Field '{field}' not found in response"


def assert_fields_not_in_response(response, *fields):
    """
    Assert that specified fields do NOT exist in response JSON.
    
    Args:
        response: Response object from test client
        fields: Field names that should not be present
    """
    data = response.json()
    for field in fields:
        assert field not in data, f"Field '{field}' should not be in response"


def assert_timestamp_format(timestamp_str: str):
    """
    Assert that a timestamp string is in ISO format.
    
    Args:
        timestamp_str: Timestamp string to validate
    """
    from datetime import datetime
    try:
        datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except ValueError:
        assert False, f"Invalid timestamp format: {timestamp_str}"


def assert_uuid_format(uuid_str: str):
    """
    Assert that a string is a valid UUID.
    
    Args:
        uuid_str: UUID string to validate
    """
    import uuid
    try:
        uuid.UUID(uuid_str)
    except ValueError:
        assert False, f"Invalid UUID format: {uuid_str}"


def compare_dicts_subset(expected: Dict, actual: Dict):
    """
    Assert that actual dict contains all key-value pairs from expected dict.
    
    Args:
        expected: Dictionary with expected key-value pairs
        actual: Actual dictionary to check
    """
    for key, value in expected.items():
        assert key in actual, f"Key '{key}' not found in actual dict"
        assert actual[key] == value, f"Value mismatch for key '{key}': expected {value}, got {actual[key]}"


def login_user(client: TestClient, email: str, password: str) -> Dict[str, str]:
    """
    Helper to login a user and return auth headers.
    
    Args:
        client: FastAPI test client
        email: User email
        password: User password
        
    Returns:
        Dictionary with Authorization header
    """
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password}
    )
    assert response.status_code == 200
    data = response.json()
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}


def register_user(
    client: TestClient,
    email: str,
    password: str,
    full_name: str,
    organization_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Helper to register a new user.
    
    Args:
        client: FastAPI test client
        email: User email
        password: User password
        full_name: User full name
        organization_name: Optional organization name
        
    Returns:
        Response data dictionary
    """
    payload = {
        "email": email,
        "password": password,
        "full_name": full_name
    }
    if organization_name:
        payload["organization_name"] = organization_name
    
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    return response.json()


def create_project_via_api(
    client: TestClient,
    auth_headers: Dict[str, str],
    org_id: str,
    name: str,
    vertical: str,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Helper to create a project via API.
    
    Args:
        client: FastAPI test client
        auth_headers: Authentication headers
        org_id: Organization ID
        name: Project name
        vertical: Vertical type
        description: Optional description
        
    Returns:
        Created project data
    """
    payload = {
        "name": name,
        "vertical": vertical,
        "description": description or f"Test {vertical} project"
    }
    response = client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json=payload,
        headers=auth_headers
    )
    assert response.status_code == 201
    return response.json()


def create_site_via_api(
    client: TestClient,
    auth_headers: Dict[str, str],
    org_id: str,
    project_id: str,
    name: str,
    location: str,
    vertical: str
) -> Dict[str, Any]:
    """
    Helper to create a site via API.
    
    Args:
        client: FastAPI test client
        auth_headers: Authentication headers
        org_id: Organization ID
        project_id: Project ID
        name: Site name
        location: Site location
        vertical: Vertical type
        
    Returns:
        Created site data
    """
    payload = {
        "project_id": project_id,
        "name": name,
        "location": location,
        "vertical": vertical,
        "config": {}
    }
    response = client.post(
        f"/api/v1/organizations/{org_id}/sites",
        json=payload,
        headers=auth_headers
    )
    assert response.status_code == 201
    return response.json()
