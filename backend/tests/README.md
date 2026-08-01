# AI Digital Twin SaaS Platform - Test Suite

Comprehensive pytest test suite for the backend API with 80%+ code coverage.

## 📁 Test Structure

```
tests/
├── conftest.py                 # Shared fixtures and configuration
├── test_models/               # Unit tests for SQLAlchemy models
│   └── test_models.py         # Model creation, relationships, constraints
├── test_services/             # Unit tests for business logic services
│   ├── test_auth_service.py           # Authentication & registration
│   ├── test_ingestion_service.py      # Data ingestion & validation
│   ├── test_kpi_service.py            # KPI calculations (all verticals)
│   ├── test_simulation_service.py     # Simulation engine
│   └── test_recommendation_service.py # Recommendation generation
├── test_api/                  # Integration tests for API endpoints
│   ├── test_auth_api.py              # /auth endpoints
│   ├── test_organizations_api.py     # Organization CRUD
│   ├── test_projects_api.py          # Project management
│   ├── test_sites_api.py             # Site management
│   ├── test_ingest_api.py            # Data ingestion endpoints
│   ├── test_kpis_api.py              # KPI computation endpoints
│   ├── test_forecasts_api.py         # Forecast generation (ML service)
│   ├── test_simulations_api.py       # Simulation execution
│   └── test_recommendations_api.py   # Recommendation retrieval
├── test_e2e/                  # End-to-end workflow tests
│   └── test_full_workflow.py  # Complete user journeys
└── test_utils/                # Test utilities and helpers
    ├── factories.py            # Data factories for test objects
    ├── helpers.py              # Common test helper functions
    └── mock_ml_service.py      # Mock ML service responses
```

## 🚀 Quick Start

### Prerequisites

```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Run All Tests

```bash
# Run all tests with coverage
pytest

# Run with verbose output
pytest -v

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m e2e           # End-to-end tests only
```

### Run Specific Test Files

```bash
# Test authentication
pytest tests/test_services/test_auth_service.py -v

# Test KPI calculations
pytest tests/test_services/test_kpi_service.py -v

# Test API endpoints
pytest tests/test_api/ -v

# Test complete workflows
pytest tests/test_e2e/test_full_workflow.py -v
```

## 📊 Coverage

Generate and view coverage reports:

```bash
# Run tests with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing

# Open HTML coverage report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

**Target: 80%+ code coverage**

## 🏷️ Test Markers

Tests are organized with markers for easy filtering:

```bash
# By test type
pytest -m unit              # Unit tests
pytest -m integration       # Integration tests
pytest -m e2e               # End-to-end tests

# By feature
pytest -m auth              # Authentication tests
pytest -m rbac              # Role-based access control
pytest -m multitenant       # Multi-tenant isolation
pytest -m database          # Database tests

# By vertical
pytest -m manufacturing     # Manufacturing vertical
pytest -m energy            # Energy vertical
pytest -m retail            # Retail vertical

# By speed
pytest -m "not slow"        # Skip slow tests (for quick feedback)
pytest -m slow              # Only slow tests

# By external dependencies
pytest -m ml_service        # Tests that mock ML service
```

## 🧪 Test Categories

### 1. Unit Tests (`test_models/`, `test_services/`)

Test individual components in isolation:
- **Models**: SQLAlchemy model creation, relationships, constraints
- **Services**: Business logic, calculations, validation
- **Fast execution**: No external dependencies
- **High coverage**: 90%+ for critical business logic

### 2. Integration Tests (`test_api/`)

Test API endpoints with database:
- **CRUD operations**: Create, Read, Update, Delete
- **Authorization**: Admin, Member, Viewer permissions
- **Multi-tenant isolation**: Organization-level data segregation
- **Input validation**: Required fields, data types, business rules
- **Error handling**: 4xx/5xx responses

### 3. End-to-End Tests (`test_e2e/`)

Test complete user workflows:
- **Full journeys**: Registration → Data Ingestion → KPIs → Forecasts → Simulations → Recommendations
- **Multi-user collaboration**: Admin/Viewer interactions
- **Cross-vertical scenarios**: Manufacturing, Energy, Retail
- **Real-world use cases**: Production-like scenarios

## 🔧 Fixtures

Key fixtures available in `conftest.py`:

### Database
- `db` - Fresh database session (isolated per test)
- `client` - FastAPI TestClient with DB override

### Users
- `test_user` - Basic user
- `admin_user` - Admin user
- `viewer_user` - Viewer user
- `inactive_user` - Inactive user

### Organizations
- `test_org` - Primary test organization
- `second_org` - For multi-tenant tests

### Memberships
- `admin_membership` - Admin role
- `member_membership` - Member role
- `viewer_membership` - Viewer role

### Projects
- `manufacturing_project` - Manufacturing vertical
- `energy_project` - Energy vertical
- `retail_project` - Retail vertical

### Sites
- `manufacturing_site` - Factory site
- `energy_site` - Solar plant site
- `retail_site` - Store site

### Authentication
- `auth_headers` - Auth headers for test_user
- `admin_auth_headers` - Auth headers for admin_user
- `viewer_auth_headers` - Auth headers for viewer_user

### Sample Data
- `sample_manufacturing_data` - Manufacturing sensor data
- `sample_energy_data` - Energy consumption data
- `sample_retail_data` - Retail transaction data

## 🏭 Factories

Use factories to create test data (in `test_utils/factories.py`):

```python
from tests.test_utils.factories import (
    UserFactory,
    OrganizationFactory,
    ProjectFactory,
    SiteFactory,
    ManufacturingDataFactory,
    EnergyDataFactory,
    RetailDataFactory
)

# Create test objects
user = UserFactory.create(email="test@example.com")
org = OrganizationFactory.create(name="Test Org")
project = ProjectFactory.create(org_id=org.id, vertical="manufacturing")

# Create batch data
manufacturing_data = ManufacturingDataFactory.create_batch(count=100)
energy_data = EnergyDataFactory.create_batch(count=50)
```

## 🤝 Helper Functions

Common helpers in `test_utils/helpers.py`:

```python
from tests.test_utils.helpers import (
    get_auth_headers,
    assert_error_response,
    assert_success_response,
    login_user,
    register_user,
    create_project_via_api,
    create_site_via_api
)

# Use helpers in tests
auth_headers = get_auth_headers(user)
assert_error_response(response, 400, "invalid")
user_data = register_user(client, "user@example.com", "Pass123!")
```

## 🎭 Mocking External Services

Mock ML service calls in tests:

```python
from unittest.mock import patch, Mock
from tests.test_utils.mock_ml_service import get_mock_forecast

@patch('httpx.AsyncClient.post')
def test_forecast_generation(mock_post, client, auth_headers, site):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = get_mock_forecast(str(site.id), "metric")
    mock_post.return_value = mock_response
    
    response = client.post(f"/api/v1/sites/{site.id}/forecasts", ...)
    assert response.status_code == 200
```

## 🔐 Testing RBAC

Test role-based access control:

```python
def test_viewer_cannot_delete(client, viewer_auth_headers, project):
    """Viewers should not be able to delete projects."""
    response = client.delete(
        f"/api/v1/projects/{project.id}",
        headers=viewer_auth_headers
    )
    assert response.status_code == 403
```

## 🏢 Testing Multi-Tenant Isolation

Ensure organization data isolation:

```python
def test_cross_org_access_denied(client, test_org, second_org):
    """Users cannot access other organization's data."""
    # User 1 creates project in org 1
    project = create_project_via_api(client, user1_headers, test_org.id, ...)
    
    # User 2 (from org 2) tries to access it
    response = client.get(f"/api/v1/projects/{project.id}", headers=user2_headers)
    assert response.status_code in [403, 404]
```

## 🐛 Debugging Failed Tests

```bash
# Show detailed output
pytest -vv

# Stop at first failure
pytest -x

# Show local variables on failure
pytest -l

# Drop into debugger on failure
pytest --pdb

# Show print statements
pytest -s

# Run only failed tests from last run
pytest --lf
```

## 📈 Test Metrics

Current test suite metrics:
- **Total Tests**: 250+
- **Code Coverage**: 80%+
- **Execution Time**: ~30 seconds (unit), ~2 minutes (full)
- **Test Files**: 15+
- **Fixtures**: 40+

## 🔄 Continuous Integration

Tests run automatically on:
- **Push** to `main` or `develop` branches
- **Pull Requests** to `main` or `develop`
- **GitHub Actions** workflow: `.github/workflows/backend-tests.yml`

CI Pipeline stages:
1. **Linting** - Flake8, Black, isort
2. **Type Checking** - mypy
3. **Unit Tests** - Fast tests with coverage
4. **Integration Tests** - API and database tests
5. **Security Checks** - Safety, Bandit
6. **Code Quality** - Pylint

## 📝 Writing New Tests

### Test Structure Template

```python
"""
Module docstring describing what is being tested.
"""
import pytest
from sqlalchemy.orm import Session

@pytest.mark.unit  # or @pytest.mark.integration, @pytest.mark.e2e
class TestFeatureName:
    """Test class for a specific feature."""
    
    def test_success_case(self, db: Session, test_user):
        """Test the happy path."""
        # Arrange
        # ... setup test data
        
        # Act
        # ... execute the code being tested
        
        # Assert
        # ... verify expected outcomes
        assert result == expected
    
    def test_failure_case(self, db: Session):
        """Test error handling."""
        with pytest.raises(ExpectedException):
            # ... code that should raise exception
            pass
    
    @pytest.mark.parametrize("input,expected", [
        (1, "one"),
        (2, "two"),
    ])
    def test_multiple_cases(self, input, expected):
        """Test multiple scenarios with parametrize."""
        result = function_under_test(input)
        assert result == expected
```

## 🎯 Best Practices

1. **Test Independence**: Each test should be isolated and able to run independently
2. **Use Fixtures**: Leverage conftest.py fixtures for common setup
3. **Clear Names**: Test names should describe what they test
4. **AAA Pattern**: Arrange, Act, Assert structure
5. **One Assertion**: Prefer one logical assertion per test
6. **Mock External**: Mock external services (ML service, Redis, Celery)
7. **Fast Tests**: Keep unit tests fast (<100ms each)
8. **Readable**: Tests are documentation - make them clear

## 📚 Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/14/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)
- [Factory Boy](https://factoryboy.readthedocs.io/)

## 🆘 Common Issues

### Issue: Database errors in tests
**Solution**: Ensure test database is isolated. Check that fixtures use proper transaction rollback.

### Issue: Tests pass individually but fail together
**Solution**: Tests are not properly isolated. Check for shared state or missing cleanup.

### Issue: Slow test execution
**Solution**: Use SQLite in-memory for unit tests. Profile with `pytest --durations=10`.

### Issue: Import errors
**Solution**: Ensure PYTHONPATH includes project root: `export PYTHONPATH="${PYTHONPATH}:$(pwd)"`

## 🤝 Contributing

When adding new features:
1. Write tests FIRST (TDD approach recommended)
2. Ensure tests pass: `pytest tests/`
3. Check coverage: `pytest --cov=app`
4. Run linting: `flake8 app tests`
5. Format code: `black app tests && isort app tests`

---

**Happy Testing! 🧪**
