"""
Pytest configuration and fixtures for AI Digital Twin SaaS Platform tests.
Provides database, authentication, and sample data fixtures.
"""
import os
import pytest
from typing import Generator, Dict, Any
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.organization import Organization, PlanType
from app.models.org_membership import OrgMembership, OrgRole
from app.models.project import Project, VerticalType
from app.models.site import Site
from app.core.security import get_password_hash, create_access_token


# Test database engine - SQLite in-memory for speed
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test.
    Tables are created before test and dropped after.
    """
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """
    Create a FastAPI test client with database session override.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


# ============================================================================
# User Fixtures
# ============================================================================

@pytest.fixture
def test_password() -> str:
    """Standard test password for all test users."""
    return "TestPass123!"


@pytest.fixture
def test_user(db: Session, test_password: str) -> User:
    """
    Create a basic test user without organization.
    """
    user = User(
        email="testuser@example.com",
        hashed_password=get_password_hash(test_password),
        full_name="Test User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db: Session, test_password: str) -> User:
    """
    Create an admin user.
    """
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash(test_password),
        full_name="Admin User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def viewer_user(db: Session, test_password: str) -> User:
    """
    Create a viewer user.
    """
    user = User(
        email="viewer@example.com",
        hashed_password=get_password_hash(test_password),
        full_name="Viewer User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def inactive_user(db: Session, test_password: str) -> User:
    """
    Create an inactive user for testing access denial.
    """
    user = User(
        email="inactive@example.com",
        hashed_password=get_password_hash(test_password),
        full_name="Inactive User",
        is_active=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ============================================================================
# Organization Fixtures
# ============================================================================

@pytest.fixture
def test_org(db: Session) -> Organization:
    """
    Create a test organization.
    """
    org = Organization(
        name="Test Organization",
        slug="test-org",
        plan_type=PlanType.PROFESSIONAL,
        settings={"features": ["manufacturing", "energy", "retail"]}
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@pytest.fixture
def second_org(db: Session) -> Organization:
    """
    Create a second organization for multi-tenant isolation tests.
    """
    org = Organization(
        name="Second Organization",
        slug="second-org",
        plan_type=PlanType.STARTER,
        settings={}
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


# ============================================================================
# Organization Membership Fixtures
# ============================================================================

@pytest.fixture
def admin_membership(db: Session, admin_user: User, test_org: Organization) -> OrgMembership:
    """
    Create admin membership linking admin_user to test_org.
    """
    membership = OrgMembership(
        user_id=admin_user.id,
        org_id=test_org.id,
        role=OrgRole.ADMIN
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@pytest.fixture
def member_membership(db: Session, test_user: User, test_org: Organization) -> OrgMembership:
    """
    Create member membership linking test_user to test_org.
    """
    membership = OrgMembership(
        user_id=test_user.id,
        org_id=test_org.id,
        role=OrgRole.MEMBER
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@pytest.fixture
def viewer_membership(db: Session, viewer_user: User, test_org: Organization) -> OrgMembership:
    """
    Create viewer membership linking viewer_user to test_org.
    """
    membership = OrgMembership(
        user_id=viewer_user.id,
        org_id=test_org.id,
        role=OrgRole.VIEWER
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


# ============================================================================
# Project Fixtures
# ============================================================================

@pytest.fixture
def manufacturing_project(db: Session, test_org: Organization) -> Project:
    """
    Create a manufacturing project.
    """
    project = Project(
        org_id=test_org.id,
        name="Manufacturing Project",
        description="Test manufacturing project",
        vertical=VerticalType.MANUFACTURING
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def energy_project(db: Session, test_org: Organization) -> Project:
    """
    Create an energy project.
    """
    project = Project(
        org_id=test_org.id,
        name="Energy Project",
        description="Test energy project",
        vertical=VerticalType.ENERGY
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def retail_project(db: Session, test_org: Organization) -> Project:
    """
    Create a retail project.
    """
    project = Project(
        org_id=test_org.id,
        name="Retail Project",
        description="Test retail project",
        vertical=VerticalType.RETAIL
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


# ============================================================================
# Site Fixtures
# ============================================================================

@pytest.fixture
def manufacturing_site(db: Session, test_org: Organization, manufacturing_project: Project) -> Site:
    """
    Create a manufacturing site.
    """
    site = Site(
        org_id=test_org.id,
        project_id=manufacturing_project.id,
        name="Factory A",
        location="Detroit, MI",
        vertical=VerticalType.MANUFACTURING,
        config={"line_count": 3, "shift_hours": 24}
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@pytest.fixture
def energy_site(db: Session, test_org: Organization, energy_project: Project) -> Site:
    """
    Create an energy site.
    """
    site = Site(
        org_id=test_org.id,
        project_id=energy_project.id,
        name="Solar Plant A",
        location="Phoenix, AZ",
        vertical=VerticalType.ENERGY,
        config={"capacity_kw": 5000, "panels": 15000}
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@pytest.fixture
def retail_site(db: Session, test_org: Organization, retail_project: Project) -> Site:
    """
    Create a retail site.
    """
    site = Site(
        org_id=test_org.id,
        project_id=retail_project.id,
        name="Store #101",
        location="New York, NY",
        vertical=VerticalType.RETAIL,
        config={"square_feet": 10000, "sku_count": 5000}
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


# ============================================================================
# Authentication Token Fixtures
# ============================================================================

@pytest.fixture
def auth_headers(test_user: User) -> Dict[str, str]:
    """
    Create authentication headers for test_user.
    """
    token = create_access_token({"sub": str(test_user.id), "email": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(admin_user: User) -> Dict[str, str]:
    """
    Create authentication headers for admin_user.
    """
    token = create_access_token({"sub": str(admin_user.id), "email": admin_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def viewer_auth_headers(viewer_user: User) -> Dict[str, str]:
    """
    Create authentication headers for viewer_user.
    """
    token = create_access_token({"sub": str(viewer_user.id), "email": viewer_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def inactive_auth_headers(inactive_user: User) -> Dict[str, str]:
    """
    Create authentication headers for inactive_user.
    """
    token = create_access_token({"sub": str(inactive_user.id), "email": inactive_user.email})
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_manufacturing_data() -> Dict[str, Any]:
    """
    Sample manufacturing sensor data for ingestion tests.
    """
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "machine_id": "MACHINE-001",
        "production_count": 150,
        "target_count": 200,
        "downtime_minutes": 45,
        "defect_count": 3,
        "cycle_time_seconds": 120.5,
        "temperature_celsius": 85.2,
        "pressure_psi": 150.0,
        "vibration_hz": 60.5
    }


@pytest.fixture
def sample_energy_data() -> Dict[str, Any]:
    """
    Sample energy consumption data for ingestion tests.
    """
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "meter_id": "METER-001",
        "consumption_kwh": 1250.5,
        "generation_kwh": 800.0,
        "grid_import_kwh": 450.5,
        "grid_export_kwh": 0.0,
        "cost_usd": 125.50,
        "power_factor": 0.95,
        "voltage": 240.0,
        "frequency": 60.0
    }


@pytest.fixture
def sample_retail_data() -> Dict[str, Any]:
    """
    Sample retail transaction data for ingestion tests.
    """
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "transaction_id": "TXN-001",
        "sku": "SKU-12345",
        "quantity": 2,
        "unit_price": 49.99,
        "total_price": 99.98,
        "cost": 30.00,
        "category": "Electronics",
        "store_id": "STORE-101"
    }


# ============================================================================
# Mock ML Service Fixtures
# ============================================================================

@pytest.fixture
def mock_ml_forecast_response() -> Dict[str, Any]:
    """
    Mock ML service forecast response.
    """
    return {
        "forecast_id": "forecast-123",
        "predictions": [
            {"timestamp": "2024-01-01T00:00:00Z", "value": 125.5, "confidence": 0.85},
            {"timestamp": "2024-01-02T00:00:00Z", "value": 130.2, "confidence": 0.82},
            {"timestamp": "2024-01-03T00:00:00Z", "value": 128.7, "confidence": 0.80}
        ],
        "model": "prophet",
        "metrics": {"mae": 5.2, "rmse": 7.8, "mape": 4.5}
    }


@pytest.fixture
def mock_ml_anomaly_response() -> Dict[str, Any]:
    """
    Mock ML service anomaly detection response.
    """
    return {
        "anomalies": [
            {
                "timestamp": "2024-01-01T14:30:00Z",
                "metric": "temperature",
                "value": 125.5,
                "expected": 85.0,
                "severity": "high",
                "confidence": 0.92
            }
        ],
        "model": "isolation_forest"
    }


# ============================================================================
# Utility Functions
# ============================================================================

@pytest.fixture
def cleanup_db(db: Session):
    """
    Fixture that provides a function to cleanup specific tables.
    """
    def _cleanup(*table_names):
        for table_name in table_names:
            db.execute(f"DELETE FROM {table_name}")
        db.commit()
    
    return _cleanup
