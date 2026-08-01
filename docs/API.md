# API Documentation

Complete REST API reference for the AI Digital Twin SaaS Platform.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Pagination](#pagination)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Organizations](#organizations)
  - [Projects](#projects)
  - [Sites](#sites)
  - [Data Ingestion](#data-ingestion)
  - [KPIs](#kpis)
  - [Forecasting](#forecasting)
  - [Simulations](#simulations)
  - [Recommendations](#recommendations)

## Overview

### Base URL

```
Development: http://localhost:8000/api/v1
Production:  https://api.yourplatform.com/api/v1
```

### API Versioning

All endpoints are versioned with `/api/v1` prefix. Future API versions will use `/api/v2`, etc.

### Content Type

All requests and responses use JSON:
```
Content-Type: application/json
```

### Interactive Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Spec**: http://localhost:8000/openapi.json

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication with Bearer token authorization.

### Authentication Flow

1. **Register** a new user account
2. **Login** to receive access and refresh tokens
3. **Use access token** in Authorization header for all requests
4. **Refresh** access token when it expires using refresh token

### How to Register

**Endpoint**: `POST /api/v1/auth/register`

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123",
    "full_name": "John Doe",
    "organization_name": "Acme Corporation"
  }'
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### How to Login

**Endpoint**: `POST /api/v1/auth/login`

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Token Details**:
- `access_token`: Short-lived token (30 minutes) for API requests
- `refresh_token`: Long-lived token (7 days) for getting new access tokens
- `expires_in`: Access token expiration in seconds

### How to Use Bearer Token

Include the access token in the `Authorization` header:

```bash
curl -X GET http://localhost:8000/api/v1/organizations/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Refresh Mechanism

When the access token expires (after 30 minutes), use the refresh token to get a new one:

**Endpoint**: `POST /api/v1/auth/refresh`

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Logout

**Endpoint**: `POST /api/v1/auth/logout`

```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response** (200 OK):
```json
{
  "message": "Successfully logged out"
}
```

## Error Handling

### Standard Error Response

```json
{
  "detail": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Validation Errors

**Response** (422):
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

## Pagination

List endpoints support pagination using query parameters:

**Parameters**:
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 50, max: 100)

**Example**:
```bash
curl -X GET "http://localhost:8000/api/v1/projects?skip=0&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "items": [...],
  "total": 150,
  "skip": 0,
  "limit": 20
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Default**: 60 requests per minute per IP
- **Authenticated**: 100 requests per minute per user
- **Premium**: Higher limits based on subscription plan

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1620000000
```

When rate limit exceeded (429):
```json
{
  "detail": "Rate limit exceeded. Try again in 45 seconds."
}
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/register

Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "full_name": "John Doe",
  "organization_name": "My Company"  // Optional
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### POST /auth/login

Authenticate and receive JWT tokens.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response** (200):
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### POST /auth/refresh

Refresh an expired access token.

**Request Body**:
```json
{
  "refresh_token": "eyJ..."
}
```

**Response** (200):
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### POST /auth/logout

Logout and invalidate tokens.

**Headers**: `Authorization: Bearer {access_token}`

**Response** (200):
```json
{
  "message": "Successfully logged out"
}
```

---

### Organizations

#### GET /organizations/me

Get current user's organization.

**Headers**: `Authorization: Bearer {access_token}`

```bash
curl -X GET http://localhost:8000/api/v1/organizations/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Acme Corporation",
  "slug": "acme-corporation",
  "plan_type": "professional",
  "settings": {},
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### PATCH /organizations/me

Update current organization.

**Request Body**:
```json
{
  "name": "Acme Corp",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD"
  }
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corporation",
  "plan_type": "professional",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD"
  },
  "updated_at": "2024-01-20T14:22:00Z"
}
```

#### GET /organizations/me/members

List organization members.

**Response** (200):
```json
{
  "members": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "email": "john@example.com",
        "full_name": "John Doe"
      },
      "role": "owner",
      "joined_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Projects

#### GET /projects

List all projects in the organization.

**Query Parameters**:
- `skip` (int): Pagination offset (default: 0)
- `limit` (int): Max results (default: 50, max: 100)

```bash
curl -X GET "http://localhost:8000/api/v1/projects?skip=0&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Factory Optimization",
      "description": "Manufacturing efficiency project",
      "vertical": "manufacturing",
      "organization_id": "uuid",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 5,
  "skip": 0,
  "limit": 20
}
```

#### POST /projects

Create a new project.

**Request Body**:
```json
{
  "name": "Factory Optimization",
  "description": "Optimize production efficiency",
  "vertical": "manufacturing"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "name": "Factory Optimization",
  "description": "Optimize production efficiency",
  "vertical": "manufacturing",
  "organization_id": "uuid",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### GET /projects/{project_id}

Get project details.

```bash
curl -X GET http://localhost:8000/api/v1/projects/{project_id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Factory Optimization",
  "description": "Optimize production efficiency",
  "vertical": "manufacturing",
  "organization_id": "uuid",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### PATCH /projects/{project_id}

Update project details.

**Request Body**:
```json
{
  "name": "Advanced Factory Optimization",
  "description": "Updated description"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Advanced Factory Optimization",
  "description": "Updated description",
  "vertical": "manufacturing",
  "updated_at": "2024-01-20T14:22:00Z"
}
```

#### DELETE /projects/{project_id}

Delete a project (soft delete).

```bash
curl -X DELETE http://localhost:8000/api/v1/projects/{project_id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (204): No content

---

### Sites

#### GET /sites

List all sites in the organization.

**Query Parameters**:
- `project_id` (uuid): Filter by project (optional)
- `vertical` (string): Filter by vertical type (optional)
- `skip` (int): Pagination offset
- `limit` (int): Max results

```bash
curl -X GET "http://localhost:8000/api/v1/sites?project_id={uuid}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Factory Floor 1",
      "vertical": "manufacturing",
      "project_id": "uuid",
      "location": "Detroit, MI",
      "metadata": {},
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 3,
  "skip": 0,
  "limit": 50
}
```

#### POST /sites

Create a new site.

**Request Body**:
```json
{
  "name": "Factory Floor 1",
  "vertical": "manufacturing",
  "project_id": "uuid",
  "location": "Detroit, MI",
  "metadata": {
    "capacity": 1000,
    "shift_hours": 24
  }
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "name": "Factory Floor 1",
  "vertical": "manufacturing",
  "project_id": "uuid",
  "location": "Detroit, MI",
  "metadata": {
    "capacity": 1000,
    "shift_hours": 24
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### GET /sites/{site_id}

Get site details.

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Factory Floor 1",
  "vertical": "manufacturing",
  "project_id": "uuid",
  "location": "Detroit, MI",
  "metadata": {},
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### Data Ingestion

#### POST /ingest/manufacturing

Ingest manufacturing time-series data.

**Request Body**:
```json
{
  "site_id": "uuid",
  "data_points": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "machine_id": "MACHINE-001",
      "uptime_minutes": 55,
      "throughput_units": 120,
      "defect_count": 2,
      "cycle_time_seconds": 45.5,
      "quality_score": 0.98,
      "downtime_events": []
    },
    {
      "timestamp": "2024-01-15T11:00:00Z",
      "machine_id": "MACHINE-001",
      "uptime_minutes": 60,
      "throughput_units": 130,
      "defect_count": 1,
      "cycle_time_seconds": 44.2,
      "quality_score": 0.99,
      "downtime_events": []
    }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "records_processed": 2,
  "records_failed": 0,
  "validation_results": [],
  "ingestion_id": "uuid"
}
```

#### POST /ingest/energy

Ingest energy consumption data.

**Request Body**:
```json
{
  "site_id": "uuid",
  "data_points": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "meter_id": "METER-001",
      "kwh_consumed": 125.5,
      "tariff_rate": 0.12,
      "period_type": "peak",
      "solar_generation_kwh": 15.2,
      "load_shedding_event": false,
      "power_factor": 0.95,
      "demand_kw": 200.0
    }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "records_processed": 1,
  "records_failed": 0,
  "validation_results": [],
  "ingestion_id": "uuid"
}
```

#### POST /ingest/retail

Ingest retail sales data.

**Request Body**:
```json
{
  "site_id": "uuid",
  "data_points": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "store_id": "STORE-001",
      "sku": "SKU-12345",
      "daily_sales_units": 45,
      "daily_revenue": 2250.50,
      "inventory_level": 120,
      "promo_active": true,
      "promo_discount_pct": 15.0,
      "footfall_count": 450,
      "weather_condition": "sunny"
    }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "records_processed": 1,
  "records_failed": 0,
  "validation_results": [],
  "ingestion_id": "uuid"
}
```

---

### KPIs

#### POST /kpis/manufacturing

Compute manufacturing KPIs.

**Request Body**:
```json
{
  "site_id": "uuid",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response** (200):
```json
{
  "site_id": "uuid",
  "period_start": "2024-01-01T00:00:00Z",
  "period_end": "2024-01-31T23:59:59Z",
  "kpis": {
    "oee": 72.5,
    "availability": 85.2,
    "performance": 90.5,
    "quality": 94.1,
    "mtbf_hours": 120.5,
    "mttr_hours": 3.2,
    "first_pass_yield": 94.1,
    "throughput_total": 12500,
    "defect_total": 158,
    "downtime_total_minutes": 2880
  }
}
```

#### POST /kpis/energy

Compute energy KPIs.

**Request Body**:
```json
{
  "site_id": "uuid",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response** (200):
```json
{
  "site_id": "uuid",
  "period_start": "2024-01-01T00:00:00Z",
  "period_end": "2024-01-31T23:59:59Z",
  "kpis": {
    "total_consumption_kwh": 125000.5,
    "total_cost": 15625.06,
    "avg_cost_per_kwh": 0.125,
    "peak_demand_kw": 450.2,
    "load_factor": 0.72,
    "solar_generation_kwh": 8500.3,
    "solar_contribution_pct": 6.8,
    "carbon_emissions_tons": 62.5
  }
}
```

#### POST /kpis/retail

Compute retail KPIs.

**Request Body**:
```json
{
  "site_id": "uuid",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "store_id": "STORE-001",
  "sku": "SKU-12345"
}
```

**Response** (200):
```json
{
  "site_id": "uuid",
  "period_start": "2024-01-01T00:00:00Z",
  "period_end": "2024-01-31T23:59:59Z",
  "kpis": {
    "total_sales_units": 1250,
    "total_revenue": 62500.00,
    "avg_selling_price": 50.00,
    "sales_velocity": 40.3,
    "inventory_turnover": 4.5,
    "stockout_rate": 2.1,
    "margin_pct": 35.5,
    "promo_effectiveness": 1.42,
    "conversion_rate": 8.5
  }
}
```

---

### Forecasting

#### POST /forecasts/train

Train a new forecasting model.

**Request Body**:
```json
{
  "project_id": "uuid",
  "model_type": "prophet",
  "target_metric": "throughput_units",
  "config": {
    "seasonality_mode": "multiplicative",
    "changepoint_prior_scale": 0.05
  }
}
```

**Response** (202 Accepted):
```json
{
  "forecast_id": "uuid",
  "status": "training",
  "message": "Model training started. Check status at /forecasts/{forecast_id}"
}
```

#### GET /forecasts/{forecast_id}

Get forecast details and results.

```bash
curl -X GET http://localhost:8000/api/v1/forecasts/{forecast_id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200):
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "vertical": "manufacturing",
  "model_type": "prophet",
  "trained_at": "2024-01-15T10:30:00Z",
  "metrics": {
    "rmse": 12.5,
    "mae": 9.2,
    "mape": 7.8
  },
  "config": {},
  "results": [
    {
      "timestamp": "2024-02-01T00:00:00Z",
      "predicted_value": 125.5,
      "lower_bound": 110.2,
      "upper_bound": 140.8,
      "actual_value": null
    }
  ]
}
```

#### POST /forecasts/{forecast_id}/predict

Generate predictions using trained model.

**Request Body**:
```json
{
  "periods": 30,
  "freq": "D"
}
```

**Response** (200):
```json
{
  "forecast_id": "uuid",
  "predictions": [
    {
      "timestamp": "2024-02-01T00:00:00Z",
      "value": 125.5,
      "lower_bound": 110.2,
      "upper_bound": 140.8
    }
  ]
}
```

#### GET /forecasts

List all forecasts for a project.

**Query Parameters**:
- `project_id` (uuid): Project identifier

**Response** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "model_type": "prophet",
      "trained_at": "2024-01-15T10:30:00Z",
      "metrics": {...}
    }
  ],
  "total": 3
}
```

---

### Simulations

#### POST /simulations

Create and run a simulation.

**Request Body**:
```json
{
  "project_id": "uuid",
  "name": "Increased Production Scenario",
  "parameters": {
    "throughput_increase_pct": 20,
    "quality_target": 0.95,
    "simulation_days": 30
  }
}
```

**Response** (202 Accepted):
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "Increased Production Scenario",
  "status": "running",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### GET /simulations/{simulation_id}

Get simulation status and results.

```bash
curl -X GET http://localhost:8000/api/v1/simulations/{simulation_id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200):
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "Increased Production Scenario",
  "status": "completed",
  "parameters": {
    "throughput_increase_pct": 20,
    "quality_target": 0.95,
    "simulation_days": 30
  },
  "results": {
    "predicted_throughput": 15000,
    "predicted_oee": 78.5,
    "confidence_interval": [75.2, 81.8],
    "probability_of_success": 0.85
  },
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:32:15Z"
}
```

#### GET /simulations

List all simulations for a project.

**Query Parameters**:
- `project_id` (uuid): Project identifier
- `status` (string): Filter by status (pending, running, completed, failed)

**Response** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Increased Production Scenario",
      "status": "completed",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 5
}
```

---

### Recommendations

#### GET /recommendations

Get AI-generated recommendations for a project.

**Query Parameters**:
- `project_id` (uuid): Project identifier
- `category` (string): Filter by category (optional)
- `priority` (string): Filter by priority (optional)
- `status` (string): Filter by status (optional)

```bash
curl -X GET "http://localhost:8000/api/v1/recommendations?project_id={uuid}&priority=high" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "title": "Optimize Machine Maintenance Schedule",
      "description": "Analysis shows MACHINE-001 has increased downtime frequency. Recommend preventive maintenance.",
      "category": "maintenance",
      "confidence_score": 0.87,
      "priority": "high",
      "actions": [
        "Schedule maintenance for MACHINE-001",
        "Review maintenance logs for patterns",
        "Consider spare parts inventory"
      ],
      "vertical": "manufacturing",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 12
}
```

#### PATCH /recommendations/{recommendation_id}

Update recommendation status.

**Request Body**:
```json
{
  "status": "in_progress"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "status": "in_progress",
  "updated_at": "2024-01-20T14:22:00Z"
}
```

#### POST /recommendations/generate

Manually trigger recommendation generation for a project.

**Request Body**:
```json
{
  "project_id": "uuid"
}
```

**Response** (202 Accepted):
```json
{
  "message": "Recommendation generation started",
  "job_id": "uuid"
}
```

---

## Complete curl Examples

### Full Workflow Example

```bash
# 1. Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "Demo123456",
    "full_name": "Demo User",
    "organization_name": "Demo Corp"
  }'

# 2. Login
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "Demo123456"
  }' | jq -r '.access_token')

# 3. Create Project
PROJECT_ID=$(curl -X POST http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Factory Alpha",
    "description": "Main production facility",
    "vertical": "manufacturing"
  }' | jq -r '.id')

# 4. Create Site
SITE_ID=$(curl -X POST http://localhost:8000/api/v1/sites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Production Line 1\",
    \"vertical\": \"manufacturing\",
    \"project_id\": \"$PROJECT_ID\",
    \"location\": \"Detroit, MI\"
  }" | jq -r '.id')

# 5. Ingest Data
curl -X POST http://localhost:8000/api/v1/ingest/manufacturing \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"site_id\": \"$SITE_ID\",
    \"data_points\": [
      {
        \"timestamp\": \"2024-01-15T10:00:00Z\",
        \"machine_id\": \"MACHINE-001\",
        \"uptime_minutes\": 55,
        \"throughput_units\": 120,
        \"defect_count\": 2,
        \"cycle_time_seconds\": 45.5,
        \"quality_score\": 0.98,
        \"downtime_events\": []
      }
    ]
  }"

# 6. Compute KPIs
curl -X POST http://localhost:8000/api/v1/kpis/manufacturing \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"site_id\": \"$SITE_ID\",
    \"start_date\": \"2024-01-01\",
    \"end_date\": \"2024-01-31\"
  }"

# 7. Train Forecast Model
curl -X POST http://localhost:8000/api/v1/forecasts/train \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"$PROJECT_ID\",
    \"model_type\": \"prophet\",
    \"target_metric\": \"throughput_units\"
  }"
```

## See Also

- [Architecture Documentation](ARCHITECTURE.md)
- [Data Models](DATA_MODELS.md)
- [Development Guide](DEVELOPMENT.md)
- [Verticals Guide](VERTICALS.md)
