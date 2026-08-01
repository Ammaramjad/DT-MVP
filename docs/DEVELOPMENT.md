# Development Guide

Developer guide for contributing to the AI Digital Twin SaaS Platform.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Code Structure](#code-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Database Migrations](#database-migrations)
- [Adding New Features](#adding-new-features)
- [Debugging](#debugging)
- [CI/CD Pipeline](#cicd-pipeline)

## Development Environment Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (or Docker)
- Redis 7+ (or Docker)
- Git

### Quick Setup (Recommended)

Using Docker Compose for dependencies:

```bash
# Clone repository
git clone <repository-url>
cd DT-MVP

# Start infrastructure (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload

# In new terminal: ML Service
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# In new terminal: Celery worker
cd backend
source venv/bin/activate
celery -A app.tasks.celery_app worker --loglevel=info

# In new terminal: Frontend
cd frontend
npm install
npm run dev
```

### IDE Setup

**VS Code** (recommended):

Install extensions:
- Python (Microsoft)
- Pylance
- ESLint
- Prettier
- TypeScript and JavaScript
- Docker

Create `.vscode/settings.json`:
```json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**PyCharm**:
- Enable Black formatter
- Configure pytest as test runner
- Setup FastAPI run configuration

## Code Structure

### Backend Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Configuration management
│   ├── database.py             # Database connection
│   ├── dependencies.py         # FastAPI dependencies
│   │
│   ├── api/                    # API endpoints
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py         # Authentication endpoints
│   │       ├── organizations.py
│   │       ├── projects.py
│   │       ├── sites.py
│   │       ├── ingest.py       # Data ingestion
│   │       ├── kpis.py         # KPI computation
│   │       ├── forecasts.py    # ML forecasting
│   │       ├── simulations.py
│   │       └── recommendations.py
│   │
│   ├── core/                   # Core utilities
│   │   ├── __init__.py
│   │   ├── security.py         # JWT, password hashing
│   │   ├── rbac.py             # Role-based access control
│   │   └── exceptions.py       # Custom exceptions
│   │
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── base.py             # Base model with timestamps
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── project.py
│   │   ├── site.py
│   │   ├── manufacturing.py
│   │   ├── energy.py
│   │   ├── retail.py
│   │   ├── forecast.py
│   │   ├── simulation.py
│   │   ├── recommendation.py
│   │   └── anomaly.py
│   │
│   ├── schemas/                # Pydantic models (request/response)
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── project.py
│   │   ├── site.py
│   │   ├── ingestion.py
│   │   ├── kpi.py
│   │   └── forecast.py
│   │
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── ingestion_service.py
│   │   ├── kpi_service.py
│   │   ├── simulation_service.py
│   │   ├── recommendation_service.py
│   │   └── verticals/          # Industry-specific logic
│   │       ├── __init__.py
│   │       ├── manufacturing.py
│   │       ├── energy.py
│   │       └── retail.py
│   │
│   └── tasks/                  # Celery background tasks
│       ├── __init__.py
│       ├── celery_app.py
│       ├── training_tasks.py
│       └── aggregation_tasks.py
│
├── alembic/                    # Database migrations
│   ├── versions/
│   └── env.py
│
├── scripts/                    # Utility scripts
│   ├── seed_data.py
│   └── backup.sh
│
├── tests/                      # Test suite
│   ├── conftest.py             # Pytest fixtures
│   ├── test_api/               # API endpoint tests
│   ├── test_services/          # Service layer tests
│   └── test_models/            # Model tests
│
├── Dockerfile
├── requirements.txt
├── requirements-dev.txt
├── pytest.ini
└── alembic.ini
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/             # Reusable components
│   │   ├── common/             # Generic components
│   │   ├── auth/               # Auth-related components
│   │   ├── dashboard/          # Dashboard widgets
│   │   └── charts/             # Chart components
│   │
│   ├── pages/                  # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   └── SitesPage.tsx
│   │
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── services/               # API clients
│   │   ├── api.ts              # Base API client
│   │   ├── auth.service.ts
│   │   ├── projects.service.ts
│   │   └── kpis.service.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── auth.types.ts
│   │   ├── project.types.ts
│   │   └── kpi.types.ts
│   │
│   ├── utils/                  # Utility functions
│   │   ├── formatters.ts
│   │   └── validators.ts
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Coding Standards

### Python (Backend)

**Style Guide**: Follow PEP 8

```python
# Good: Type hints, docstrings, descriptive names
def compute_manufacturing_kpis(
    site_id: UUID,
    start_date: date,
    end_date: date,
    db: Session
) -> Dict[str, Any]:
    """
    Compute manufacturing KPIs for a site and date range.
    
    Args:
        site_id: Site identifier
        start_date: Start date for calculation
        end_date: End date for calculation
        db: Database session
        
    Returns:
        Dictionary containing computed KPIs
        
    Raises:
        ValidationError: If site doesn't exist
    """
    # Implementation
    pass

# Bad: No types, no docstring, unclear names
def compute(s, d1, d2, db):
    pass
```

**Formatting**:
```bash
# Format code with Black
black app/ tests/

# Sort imports with isort
isort app/ tests/

# Check style with Flake8
flake8 app/ tests/
```

**Type Checking**:
```bash
# Run mypy for type checking
mypy app/ --strict
```

### TypeScript (Frontend)

**Style Guide**: Use ESLint + Prettier

```typescript
// Good: Explicit types, JSDoc, destructuring
interface User {
  id: string;
  email: string;
  fullName: string;
}

/**
 * Fetches user profile from API
 */
export const fetchUserProfile = async (): Promise<User> => {
  const response = await api.get<User>('/users/me');
  return response.data;
};

// Bad: Implicit any, no docs
const fetchProfile = async () => {
  const response = await api.get('/users/me');
  return response.data;
};
```

**Formatting**:
```bash
# Format with Prettier
npm run format

# Lint with ESLint
npm run lint

# Type check
npm run type-check
```

### Database Queries

**Good Practices**:
```python
# Good: Use ORM, filter by tenant, limit results
projects = db.query(Project)\
    .filter(Project.org_id == current_org_id)\
    .filter(Project.deleted_at.is_(None))\
    .limit(50)\
    .all()

# Bad: Raw SQL, no tenant filter, no limit
projects = db.execute("SELECT * FROM projects").fetchall()
```

### API Response Format

**Consistent Response Structure**:
```python
# Success response
{
  "id": "uuid",
  "name": "Project Name",
  "created_at": "2024-01-15T10:30:00Z"
}

# Error response
{
  "detail": "Error message"
}

# List response
{
  "items": [...],
  "total": 100,
  "skip": 0,
  "limit": 50
}
```

## Testing

### Backend Testing (Pytest)

**Test Structure**:
```python
# tests/test_api/test_projects_api.py
import pytest
from fastapi.testclient import TestClient

def test_create_project_success(client: TestClient, auth_headers: dict):
    """Test successful project creation."""
    payload = {
        "name": "Test Project",
        "description": "Test description",
        "vertical": "manufacturing"
    }
    
    response = client.post(
        "/api/v1/projects",
        json=payload,
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["vertical"] == "manufacturing"

def test_create_project_unauthorized(client: TestClient):
    """Test project creation without authentication."""
    payload = {"name": "Test"}
    
    response = client.post("/api/v1/projects", json=payload)
    
    assert response.status_code == 401
```

**Running Tests**:
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api/test_projects_api.py

# Run with verbose output
pytest -v -s

# Run matching pattern
pytest -k "test_create"
```

**Fixtures** (tests/conftest.py):
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

@pytest.fixture(scope="session")
def test_db():
    """Create test database."""
    engine = create_engine("postgresql://test:test@localhost/test_db")
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session(test_db):
    """Create database session."""
    SessionLocal = sessionmaker(bind=test_db)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def client(db_session):
    """Create test client."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as c:
        yield c

@pytest.fixture
def auth_headers(client):
    """Create authenticated headers."""
    # Register and login
    response = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### Frontend Testing (Vitest + React Testing Library)

```typescript
// src/components/__tests__/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../LoginForm';
import { AuthContext } from '../../contexts/AuthContext';

describe('LoginForm', () => {
  it('submits form with valid credentials', async () => {
    const mockLogin = vi.fn();
    
    render(
      <AuthContext.Provider value={{ login: mockLogin }}>
        <LoginForm />
      </AuthContext.Provider>
    );
    
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
```

**Running Frontend Tests**:
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Coverage Requirements

- **Minimum**: 80% coverage
- **Target**: 90%+ for critical paths
- **Required**: 100% for authentication and security code

## Git Workflow

### Branch Strategy

```
main (production)
  ↑
develop (integration)
  ↑
feature/add-retail-vertical
feature/improve-forecasting
bugfix/fix-kpi-calculation
hotfix/security-patch
```

### Workflow

```bash
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add retail KPI calculations"

# 3. Push to remote
git push origin feature/my-new-feature

# 4. Create Pull Request on GitHub

# 5. After PR approval, merge to develop
# Then delete feature branch
git checkout develop
git pull origin develop
git branch -d feature/my-new-feature
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

**Examples**:
```bash
git commit -m "feat: add retail vertical KPI computation"
git commit -m "fix: resolve OEE calculation for edge cases"
git commit -m "docs: update API documentation for forecasts"
git commit -m "test: add tests for authentication flow"
```

### Pre-commit Hooks

Install pre-commit hooks:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

Create `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
```

## Database Migrations

### Creating Migrations

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Add promo fields to retail data"

# Create empty migration
alembic revision -m "Add custom index"

# Edit migration file in alembic/versions/
```

### Migration Example

```python
# alembic/versions/002_add_promo_fields.py
"""Add promo fields to retail data

Revision ID: 002
Revises: 001
Create Date: 2024-01-15 10:30:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('retail_data',
        sa.Column('promo_active', sa.Boolean(), default=False)
    )
    op.add_column('retail_data',
        sa.Column('promo_discount_pct', sa.Float(), nullable=True)
    )

def downgrade():
    op.drop_column('retail_data', 'promo_discount_pct')
    op.drop_column('retail_data', 'promo_active')
```

### Applying Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Apply specific migration
alembic upgrade 002

# Rollback one migration
alembic downgrade -1

# Rollback to specific version
alembic downgrade 001

# View current version
alembic current

# View migration history
alembic history
```

## Adding New Features

### Adding a New Vertical

**Step 1**: Create data model (`app/models/new_vertical.py`):
```python
from sqlalchemy import Column, String, Float, ForeignKey, DateTime
from app.database import Base

class NewVerticalData(Base):
    __tablename__ = "new_vertical_data"
    # Define fields
```

**Step 2**: Add enum to `app/models/project.py`:
```python
class VerticalType(str, enum.Enum):
    MANUFACTURING = "manufacturing"
    ENERGY = "energy"
    RETAIL = "retail"
    NEW_VERTICAL = "new_vertical"  # Add this
```

**Step 3**: Create KPI service (`app/services/verticals/new_vertical.py`):
```python
def compute_kpis(site_id, start_date, end_date, db):
    # Implement KPI calculations
    pass
```

**Step 4**: Add ingestion endpoint (`app/api/v1/ingest.py`):
```python
@router.post("/new-vertical")
async def ingest_new_vertical_data(...):
    # Implement ingestion
    pass
```

**Step 5**: Create migration:
```bash
alembic revision --autogenerate -m "Add new vertical data model"
```

**Step 6**: Add tests:
```python
# tests/test_api/test_new_vertical_api.py
def test_ingest_new_vertical_data(client, auth_headers):
    # Test implementation
    pass
```

### Adding a New API Endpoint

**Step 1**: Create Pydantic schema (`app/schemas/my_feature.py`):
```python
from pydantic import BaseModel

class MyFeatureRequest(BaseModel):
    param1: str
    param2: int

class MyFeatureResponse(BaseModel):
    result: str
```

**Step 2**: Add endpoint (`app/api/v1/my_feature.py`):
```python
from fastapi import APIRouter, Depends
from app.schemas.my_feature import MyFeatureRequest, MyFeatureResponse

router = APIRouter(prefix="/my-feature", tags=["my-feature"])

@router.post("/", response_model=MyFeatureResponse)
async def my_endpoint(
    request: MyFeatureRequest,
    current_user: User = Depends(get_current_user)
):
    # Implementation
    return MyFeatureResponse(result="success")
```

**Step 3**: Register router (`app/main.py`):
```python
from app.api.v1 import my_feature

app.include_router(my_feature.router, prefix="/api/v1")
```

**Step 4**: Add tests:
```python
def test_my_endpoint(client, auth_headers):
    response = client.post(
        "/api/v1/my-feature/",
        json={"param1": "test", "param2": 123},
        headers=auth_headers
    )
    assert response.status_code == 200
```

## Debugging

### Backend Debugging

**VS Code launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--port",
        "8000"
      ],
      "jinja": true
    }
  ]
}
```

**Debug with pdb**:
```python
# Add breakpoint in code
import pdb; pdb.set_trace()

# Or use built-in breakpoint()
breakpoint()
```

**Logging**:
```python
import structlog

logger = structlog.get_logger()

logger.info("Processing request", user_id=user_id, action="create_project")
logger.error("Failed to process", error=str(e), exc_info=True)
```

### Frontend Debugging

**React DevTools**: Install browser extension

**Console Debugging**:
```typescript
console.log('User data:', userData);
console.error('API Error:', error);
console.table(projects);
```

**VS Code launch.json**:
```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Launch Chrome",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run tests
        run: |
          cd frontend
          npm test
      
      - name: Build
        run: |
          cd frontend
          npm run build

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Lint Python
        run: |
          cd backend
          pip install flake8 black
          flake8 app/ tests/
          black --check app/ tests/
      
      - name: Lint TypeScript
        run: |
          cd frontend
          npm ci
          npm run lint
```

## See Also

- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Verticals Guide](VERTICALS.md)
