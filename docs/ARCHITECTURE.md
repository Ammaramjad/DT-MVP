# System Architecture

This document describes the high-level architecture, component interactions, data flows, and design decisions for the AI Digital Twin SaaS Platform.

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Service Breakdown](#service-breakdown)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Security Architecture](#security-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Technology Decisions](#technology-decisions)

## Overview

The AI Digital Twin SaaS Platform is a cloud-native, multi-tenant application designed to provide predictive analytics, anomaly detection, and optimization recommendations for three industry verticals: Manufacturing, Energy, and Retail.

### Design Principles

1. **Multi-tenancy**: Complete data isolation between organizations
2. **Scalability**: Horizontal scaling of stateless services
3. **Modularity**: Loosely coupled microservices architecture
4. **API-First**: All functionality exposed via RESTful APIs
5. **Security**: Defense in depth with JWT, RBAC, and encrypted communications
6. **Observability**: Comprehensive logging and monitoring

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Load Balancer / CDN                             │
│                              (Nginx / CloudFlare)                            │
└────────────┬────────────────────────────────────────────────┬────────────────┘
             │                                                │
             ▼                                                ▼
┌────────────────────────┐                       ┌───────────────────────────┐
│   Frontend (React)     │                       │    Static Assets CDN       │
│   - TypeScript         │                       │    - Images, CSS, JS       │
│   - Vite Build         │                       └───────────────────────────┘
│   - TailwindCSS        │
└────────────┬───────────┘
             │ HTTPS/REST API
             ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        API Gateway (FastAPI)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth         │  │ Rate Limiter │  │ CORS         │  │ Logging      │  │
│  │ Middleware   │  │              │  │              │  │ Middleware   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                       API Route Handlers                              │ │
│  │  /auth  /orgs  /projects  /sites  /ingest  /kpis  /forecast  /sim  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────┬────────────────┬──────────────────┬──────────────────┬──────────────┘
      │                │                  │                  │
      ▼                ▼                  ▼                  ▼
┌──────────┐   ┌──────────────┐   ┌─────────────┐   ┌─────────────────┐
│PostgreSQL│   │  ML Service  │   │   Redis     │   │  Celery Workers │
│    +     │   │  (FastAPI)   │   │  - Cache    │   │  - Background   │
│TimescaleDB│◄──┤  - Prophet   │◄──┤  - Sessions │◄──┤    Tasks        │
│          │   │  - ARIMA     │   │  - Broker   │   │  - Scheduled    │
│          │   │  - IsoForest │   │             │   │    Jobs         │
└──────────┘   └──────────────┘   └─────────────┘   └─────────────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│               TimescaleDB Hypertables                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Manufacturing │  │    Energy    │  │    Retail    │      │
│  │    Data      │  │     Data     │  │     Data     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## Service Breakdown

### 1. Frontend Service (React)

**Technology**: React 18.x, TypeScript, Vite, TailwindCSS

**Responsibilities**:
- User interface rendering
- Client-side routing
- Form validation
- State management
- API client integration
- Real-time data visualization

**Key Components**:
- Authentication flows (login, register, logout)
- Dashboard with KPI widgets
- Data ingestion forms
- Forecast visualization charts
- Simulation parameter inputs
- Recommendation cards

**Communication**:
- REST API calls to Backend API
- JWT token management in localStorage
- WebSocket connections for real-time updates (future)

### 2. Backend API Service (FastAPI)

**Technology**: FastAPI, Python 3.11, SQLAlchemy, Pydantic

**Responsibilities**:
- RESTful API endpoints
- Business logic orchestration
- Authentication and authorization
- Data validation
- Database operations (CRUD)
- ML service coordination
- Background task queuing

**Key Modules**:
```
app/
├── api/v1/                  # API route handlers
│   ├── auth.py             # Authentication endpoints
│   ├── organizations.py    # Org management
│   ├── projects.py         # Project CRUD
│   ├── sites.py            # Site CRUD
│   ├── ingest.py           # Data ingestion
│   ├── kpis.py             # KPI computation
│   ├── forecasts.py        # ML forecasting
│   ├── simulations.py      # Simulation execution
│   └── recommendations.py  # Recommendations
│
├── core/                    # Core utilities
│   ├── security.py         # JWT, password hashing
│   ├── rbac.py             # Role-based access control
│   └── exceptions.py       # Custom exceptions
│
├── models/                  # SQLAlchemy ORM models
├── schemas/                 # Pydantic request/response models
├── services/                # Business logic
│   └── verticals/          # Industry-specific KPI logic
└── tasks/                   # Celery background tasks
```

**API Versioning**:
- All endpoints prefixed with `/api/v1`
- Future versions can coexist: `/api/v2`

### 3. ML Service (FastAPI)

**Technology**: FastAPI, Prophet, scikit-learn, statsmodels, Pandas

**Responsibilities**:
- Time-series forecasting (Prophet, ARIMA)
- Anomaly detection (Isolation Forest)
- Simulation modeling
- Model training and persistence
- Prediction inference

**Key Modules**:
```
app/
├── api/                     # ML API endpoints
│   ├── forecast.py         # Forecasting endpoints
│   ├── anomaly.py          # Anomaly detection
│   └── simulation.py       # Simulation modeling
│
├── models/                  # ML model implementations
│   ├── forecasting.py      # Prophet, ARIMA
│   ├── anomaly.py          # Isolation Forest
│   └── simulation.py       # Monte Carlo, scenarios
│
├── services/                # Training and inference
│   ├── training_service.py # Model training
│   └── model_service.py    # Model persistence
│
└── utils/                   # Utilities
    ├── preprocessing.py    # Data cleaning, feature engineering
    └── evaluation.py       # Model metrics (RMSE, MAE, MAPE)
```

**Model Storage**:
- Trained models persisted to disk using joblib
- Model metadata stored in PostgreSQL
- Volume mount for model persistence: `/app/models`

### 4. PostgreSQL + TimescaleDB

**Technology**: PostgreSQL 15, TimescaleDB extension

**Responsibilities**:
- Relational data storage (users, orgs, projects)
- Time-series data storage (hypertables)
- Indexing for fast queries
- Data retention policies
- ACID transactions

**Key Features**:
- **Hypertables**: Automatic partitioning for time-series data
- **Compression**: Automatic compression of old data
- **Continuous Aggregates**: Pre-computed materialized views
- **Data Retention**: Automatic deletion of old data

**Hypertables**:
1. `manufacturing_data` - Partitioned by time
2. `energy_data` - Partitioned by time
3. `retail_data` - Partitioned by time

### 5. Redis

**Technology**: Redis 7

**Responsibilities**:
- Session storage
- Caching layer (API responses, computed KPIs)
- Celery message broker
- Celery result backend
- Rate limiting state

**Key Patterns**:
- Cache-aside pattern for KPI queries
- TTL-based expiration (e.g., 5 minutes for KPIs)
- Pub/Sub for real-time notifications (future)

### 6. Celery Workers

**Technology**: Celery, Redis broker

**Responsibilities**:
- Asynchronous task execution
- Long-running ML training jobs
- Scheduled data processing
- Email notifications
- Data aggregation jobs

**Task Types**:
1. **Training Tasks**: ML model training (long-running)
2. **Aggregation Tasks**: Daily/hourly KPI rollups
3. **Notification Tasks**: Email, webhooks
4. **Cleanup Tasks**: Old data deletion

**Celery Beat**: Scheduler for periodic tasks
- Daily data quality checks
- Hourly KPI recomputation
- Weekly model retraining

## Data Flow Diagrams

### 1. Data Ingestion Flow

```
┌──────────┐      POST /ingest/{vertical}       ┌─────────────┐
│  Client  │───────────────────────────────────►│ Backend API │
│          │  JSON payload with time-series data│             │
└──────────┘                                     └──────┬──────┘
                                                        │
                                                        │ Validate
                                                        │ - Schema
                                                        │ - Permissions
                                                        │ - Timestamps
                                                        ▼
                                                 ┌──────────────┐
                                                 │ Ingestion    │
                                                 │   Service    │
                                                 └──────┬───────┘
                                                        │
                                                        │ Bulk Insert
                                                        ▼
                                                 ┌──────────────┐
                                                 │ TimescaleDB  │
                                                 │  Hypertable  │
                                                 └──────┬───────┘
                                                        │
                                                        │ Trigger
                                                        ▼
                                                 ┌──────────────┐
                                                 │ Data Quality │
                                                 │    Check     │
                                                 └──────┬───────┘
                                                        │
                                                        │ Queue
                                                        ▼
                                                 ┌──────────────┐
                                                 │ Celery Task  │
                                                 │ - Anomaly    │
                                                 │   Detection  │
                                                 └──────────────┘
```

**Steps**:
1. Client sends time-series data to `/api/v1/ingest/{vertical}` endpoint
2. Backend validates schema, permissions, and data types
3. Ingestion service bulk inserts data into TimescaleDB hypertable
4. Data quality checks run (missing values, outliers)
5. Celery task queued for anomaly detection
6. Response returned to client with ingestion status

### 2. ML Training and Prediction Flow

```
┌──────────┐    POST /forecasts/train     ┌─────────────┐
│  Client  │─────────────────────────────►│ Backend API │
│          │  {project_id, model_type}    │             │
└──────────┘                               └──────┬──────┘
                                                  │
                                                  │ Queue
                                                  ▼
                                           ┌──────────────┐
                                           │ Celery Task  │
                                           │ (train_model)│
                                           └──────┬───────┘
                                                  │
                                                  │ HTTP Request
                                                  ▼
                                           ┌──────────────┐
                                           │  ML Service  │
                                           │ POST /train  │
                                           └──────┬───────┘
                                                  │
                                 ┌────────────────┼────────────────┐
                                 │                │                │
                                 ▼                ▼                ▼
                          ┌────────────┐  ┌────────────┐  ┌────────────┐
                          │   Fetch    │  │   Train    │  │  Evaluate  │
                          │ Historical │  │   Model    │  │   Model    │
                          │    Data    │  │  (Prophet/ │  │  (RMSE,    │
                          │            │  │   ARIMA)   │  │   MAE)     │
                          └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
                                │               │               │
                                └───────────────┴───────────────┘
                                                │
                                                │ Save Model
                                                ▼
                                         ┌──────────────┐
                                         │  Persist     │
                                         │  - Joblib    │
                                         │  - Metadata  │
                                         └──────┬───────┘
                                                │
                                                │ Store Results
                                                ▼
                                         ┌──────────────┐
                                         │  PostgreSQL  │
                                         │  - forecasts │
                                         │  - results   │
                                         └──────────────┘
```

**Steps**:
1. Client requests forecast training
2. Backend queues Celery task for async processing
3. Celery worker calls ML Service `/train` endpoint
4. ML Service fetches historical data from database
5. ML Service trains model (Prophet or ARIMA)
6. Model evaluation metrics computed (RMSE, MAE, MAPE)
7. Trained model persisted to disk (joblib) and metadata to database
8. Predictions generated and stored in `forecast_results` table
9. Client can poll for completion or receive webhook notification

### 3. Simulation Execution Flow

```
┌──────────┐   POST /simulations     ┌─────────────┐
│  Client  │────────────────────────►│ Backend API │
│          │  {parameters, scenarios}│             │
└──────────┘                          └──────┬──────┘
                                             │
                                             │ Create
                                             │ Simulation
                                             ▼
                                      ┌──────────────┐
                                      │  PostgreSQL  │
                                      │  simulations │
                                      └──────┬───────┘
                                             │
                                             │ Queue
                                             ▼
                                      ┌──────────────┐
                                      │ Celery Task  │
                                      │ (run_sim)    │
                                      └──────┬───────┘
                                             │
                                             │ HTTP Request
                                             ▼
                                      ┌──────────────┐
                                      │  ML Service  │
                                      │ POST /sim    │
                                      └──────┬───────┘
                                             │
                              ┌──────────────┼──────────────┐
                              │              │              │
                              ▼              ▼              ▼
                       ┌───────────┐  ┌───────────┐  ┌───────────┐
                       │  Scenario │  │   Monte   │  │ Aggregate │
                       │  Analysis │  │   Carlo   │  │  Results  │
                       └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
                             │              │              │
                             └──────────────┴──────────────┘
                                            │
                                            │ Update
                                            ▼
                                     ┌──────────────┐
                                     │  PostgreSQL  │
                                     │  simulations │
                                     │  .results    │
                                     └──────────────┘
```

**Steps**:
1. Client submits simulation parameters (e.g., "What if production increases 20%?")
2. Backend creates simulation record with status=PENDING
3. Celery task queued for async execution
4. ML Service runs scenario analysis or Monte Carlo simulation
5. Results aggregated (mean, p50, p95, etc.)
6. Simulation record updated with status=COMPLETED and results
7. Client retrieves results via GET /simulations/{id}

### 4. Recommendation Generation Flow

```
┌──────────────┐   Scheduled Task   ┌─────────────┐
│ Celery Beat  │───────────────────►│Celery Worker│
│  (Daily)     │                    │             │
└──────────────┘                    └──────┬──────┘
                                           │
                                           │ Analyze
                                           ▼
                                    ┌──────────────┐
                                    │Recommendation│
                                    │   Service    │
                                    └──────┬───────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
                        ▼                  ▼                  ▼
                 ┌────────────┐     ┌────────────┐    ┌────────────┐
                 │   Fetch    │     │  Analyze   │    │  Generate  │
                 │ - KPIs     │     │ - Trends   │    │  Actions   │
                 │ - Forecasts│     │ - Anomalies│    │            │
                 │ - Anomalies│     │ - Patterns │    │            │
                 └─────┬──────┘     └─────┬──────┘    └─────┬──────┘
                       │                  │                  │
                       └──────────────────┴──────────────────┘
                                          │
                                          │ Create
                                          ▼
                                   ┌──────────────┐
                                   │  PostgreSQL  │
                                   │recommendations│
                                   └──────────────┘
```

**Steps**:
1. Celery Beat schedules daily recommendation generation
2. Recommendation service fetches KPIs, forecasts, and anomalies
3. Pattern analysis identifies optimization opportunities
4. Rule-based engine generates actionable recommendations
5. Recommendations scored by confidence and priority
6. Recommendations stored in database
7. Users see recommendations in dashboard

## Multi-Tenant Architecture

### Tenant Isolation Strategy

The platform uses **shared database, shared schema** with **row-level filtering** for multi-tenancy:

```
┌─────────────────────────────────────────────────────────┐
│                      Organizations                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │   Org A    │  │   Org B    │  │   Org C    │        │
│  │ (id: uuid) │  │ (id: uuid) │  │ (id: uuid) │        │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│        │               │               │                 │
└────────┼───────────────┼───────────────┼─────────────────┘
         │               │               │
         ▼               ▼               ▼
┌────────────────────────────────────────────────────────┐
│                   Shared Database                       │
│  Every table has organization_id or site_id FK         │
│  Queries ALWAYS filter by tenant context               │
└────────────────────────────────────────────────────────┘
```

### Tenant Context Injection

**Mechanism**:
1. JWT token contains `org_id` claim
2. FastAPI dependency extracts `org_id` from token
3. All queries automatically filtered by `org_id`

**Example**:
```python
# Dependency injection
def get_current_org(token: str = Depends(oauth2_scheme)) -> UUID:
    payload = verify_token(token)
    return UUID(payload["org_id"])

# Automatic filtering
@router.get("/projects")
def list_projects(
    org_id: UUID = Depends(get_current_org),
    db: Session = Depends(get_db)
):
    # All projects automatically scoped to org
    projects = db.query(Project).filter(
        Project.organization_id == org_id
    ).all()
    return projects
```

### Data Isolation Guarantees

1. **Query-Level**: All ORM queries include organization_id filter
2. **Foreign Keys**: Cascading deletes ensure referential integrity
3. **Indexes**: Composite indexes on (organization_id, id) for performance
4. **API Layer**: Authorization checks before data access

### Plan-Based Features

Different subscription plans have different limits:

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| Projects | 1 | 3 | 10 | Unlimited |
| Sites | 2 | 10 | 50 | Unlimited |
| Data Points/Month | 10K | 100K | 1M | Unlimited |
| ML Models | 1 | 3 | 10 | Unlimited |
| API Rate Limit | 100/min | 500/min | 2000/min | Custom |

## Security Architecture

### Authentication Flow

```
┌────────┐                          ┌─────────────┐
│ Client │                          │ Backend API │
└───┬────┘                          └──────┬──────┘
    │                                      │
    │  POST /auth/login                    │
    │  {email, password}                   │
    ├─────────────────────────────────────►│
    │                                      │
    │                                      │ Verify Password
    │                                      │ (bcrypt hash)
    │                                      │
    │                                      │ Generate Tokens:
    │                                      │ - Access Token (30min)
    │                                      │ - Refresh Token (7 days)
    │                                      │
    │  200 OK                              │
    │  {access_token, refresh_token}       │
    │◄─────────────────────────────────────┤
    │                                      │
    │  GET /api/v1/projects                │
    │  Authorization: Bearer <token>       │
    ├─────────────────────────────────────►│
    │                                      │
    │                                      │ Verify JWT Signature
    │                                      │ Check Expiration
    │                                      │ Extract org_id
    │                                      │
    │  200 OK {projects}                   │
    │◄─────────────────────────────────────┤
```

### JWT Token Structure

**Access Token** (expires: 30 minutes):
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "org_id": "org_uuid",
  "role": "admin",
  "exp": 1234567890,
  "iat": 1234564290
}
```

**Refresh Token** (expires: 7 days):
```json
{
  "sub": "user_id",
  "type": "refresh",
  "exp": 1235172290,
  "iat": 1234564290
}
```

### Role-Based Access Control (RBAC)

**Organization Roles**:
- `OWNER`: Full control, manage members, billing
- `ADMIN`: Manage projects, sites, data
- `MEMBER`: View and edit data
- `VIEWER`: Read-only access

**Permission Matrix**:

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| View Data | ✓ | ✓ | ✓ | ✓ |
| Ingest Data | ✓ | ✓ | ✓ | ✗ |
| Create Projects | ✓ | ✓ | ✗ | ✗ |
| Delete Projects | ✓ | ✓ | ✗ | ✗ |
| Manage Members | ✓ | ✗ | ✗ | ✗ |
| Manage Billing | ✓ | ✗ | ✗ | ✗ |

### Security Best Practices

1. **Password Hashing**: bcrypt with salt rounds=12
2. **JWT Signing**: HS256 algorithm with SECRET_KEY
3. **HTTPS Only**: TLS 1.2+ enforced in production
4. **CORS**: Whitelist origins in environment config
5. **Rate Limiting**: 60 requests/minute per IP (configurable)
6. **SQL Injection**: Parameterized queries via SQLAlchemy ORM
7. **XSS Protection**: Input sanitization, Content Security Policy
8. **CSRF**: State parameter in OAuth flows

## Scalability Considerations

### Horizontal Scaling

**Stateless Services** (can scale horizontally):
- Backend API (FastAPI): Add more containers
- ML Service (FastAPI): Add more containers
- Celery Workers: Add more workers
- Frontend (Nginx): Add more servers behind load balancer

**Stateful Services** (vertical scaling or clustering):
- PostgreSQL: Read replicas, connection pooling
- Redis: Redis Cluster for high availability

### Performance Optimization

1. **Database**:
   - Composite indexes on (organization_id, time)
   - TimescaleDB compression for old data
   - Connection pooling (SQLAlchemy pool_size=20)
   - Query result caching in Redis

2. **API**:
   - Response pagination (default 50, max 100)
   - Async endpoints where possible
   - Background processing for long tasks
   - ETags for conditional requests

3. **ML Service**:
   - Model caching (in-memory after loading)
   - Batch prediction endpoints
   - GPU support for deep learning (future)

4. **Caching Strategy**:
   - KPI results: 5-minute TTL
   - Forecast results: 1-hour TTL
   - User sessions: 30-minute TTL

### Load Balancing

```
          Internet
             │
             ▼
     ┌───────────────┐
     │ Load Balancer │
     │   (Nginx)     │
     └───────┬───────┘
             │
     ┌───────┴───────┬───────────┬───────────┐
     │               │           │           │
     ▼               ▼           ▼           ▼
┌─────────┐    ┌─────────┐ ┌─────────┐ ┌─────────┐
│ API Pod │    │ API Pod │ │ API Pod │ │ API Pod │
│    1    │    │    2    │ │    3    │ │    4    │
└─────────┘    └─────────┘ └─────────┘ └─────────┘
```

**Load Balancing Algorithm**: Round-robin or least-connections

### Database Scaling

**Read Replicas**:
```
         ┌─────────────┐
         │   Primary   │
         │  (Write)    │
         └──────┬──────┘
                │
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
┌────────────┐    ┌────────────┐
│  Replica 1 │    │  Replica 2 │
│  (Read)    │    │  (Read)    │
└────────────┘    └────────────┘
```

**Partitioning Strategy**:
- Time-series data partitioned by time (monthly)
- Automatic via TimescaleDB hypertables

## Technology Decisions

### Why FastAPI?

**Pros**:
- Built-in async support (ASGI)
- Automatic OpenAPI/Swagger generation
- Pydantic for data validation
- High performance (on par with Node.js)
- Type hints for better IDE support

**Alternatives Considered**: Flask, Django REST Framework

### Why TimescaleDB?

**Pros**:
- PostgreSQL extension (familiar SQL)
- Automatic time-series partitioning
- Compression for storage efficiency
- Continuous aggregates for rollups
- Native support for time-series queries

**Alternatives Considered**: InfluxDB, Cassandra

### Why Prophet for Forecasting?

**Pros**:
- Handles missing data and outliers
- Automatic seasonality detection
- No hyperparameter tuning required
- Works well with daily/hourly data
- Developed by Facebook for scale

**Alternatives Considered**: LSTM, XGBoost

### Why Celery for Background Tasks?

**Pros**:
- Mature and battle-tested
- Flexible task routing
- Built-in retries and error handling
- Supports scheduled tasks (Beat)
- Wide community support

**Alternatives Considered**: RQ, Dramatiq

### Why React + TypeScript?

**Pros**:
- Type safety reduces bugs
- Rich ecosystem of components
- Excellent developer experience
- Vite for fast builds
- Large community and hiring pool

**Alternatives Considered**: Vue.js, Angular

### Why Redis?

**Pros**:
- In-memory speed for caching
- Native support as Celery broker
- Simple data structures (key-value)
- Pub/Sub for real-time features
- Minimal operational overhead

**Alternatives Considered**: Memcached, RabbitMQ

## Future Enhancements

1. **WebSockets**: Real-time data streaming to frontend
2. **Kafka**: Event streaming for high-throughput ingestion
3. **Kubernetes**: Container orchestration for auto-scaling
4. **GraphQL**: Alternative API protocol for flexible queries
5. **Deep Learning**: LSTM/Transformer models for complex forecasting
6. **Geospatial**: PostGIS extension for location-based analytics
7. **Multi-Cloud**: Support for AWS, Azure, GCP deployments

## See Also

- [API Documentation](API.md)
- [Data Models](DATA_MODELS.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Development Guide](DEVELOPMENT.md)
