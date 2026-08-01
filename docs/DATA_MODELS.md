# Database Schema Documentation

Complete database schema and data model documentation for the AI Digital Twin SaaS Platform.

## Table of Contents

- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Core Entities](#core-entities)
- [Time-Series Data Models](#time-series-data-models)
- [ML and Analytics Models](#ml-and-analytics-models)
- [Relationships and Foreign Keys](#relationships-and-foreign-keys)
- [Indexes and Performance](#indexes-and-performance)
- [TimescaleDB Configuration](#timescaledb-configuration)
- [Data Retention Policies](#data-retention-policies)

## Overview

The platform uses **PostgreSQL 15** with the **TimescaleDB** extension for time-series data optimization. The database design follows these principles:

1. **Multi-tenancy**: Row-level isolation via organization_id
2. **Time-series optimization**: Hypertables for sensor data
3. **Referential integrity**: Foreign key constraints with cascading deletes
4. **Soft deletes**: BaseModel includes deleted_at for audit trails
5. **UUID primary keys**: Prevents enumeration attacks

### Database Technology Stack

- **PostgreSQL 15**: Primary relational database
- **TimescaleDB**: Extension for time-series data
- **SQLAlchemy 2.0**: ORM and query builder
- **Alembic**: Database migrations

## Entity Relationship Diagram

```
┌─────────────────┐
│  Organizations  │
│  - id (PK)      │
│  - name         │
│  - slug         │
│  - plan_type    │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────┴────────┐        ┌─────────────────┐
│  OrgMemberships │────────│     Users       │
│  - org_id (FK)  │        │  - id (PK)      │
│  - user_id (FK) │        │  - email        │
│  - role         │        │  - hashed_pass  │
└─────────────────┘        └─────────────────┘

         │ 1
         │
         │ N
┌────────┴────────┐
│    Projects     │
│  - id (PK)      │
│  - org_id (FK)  │
│  - name         │
│  - vertical     │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────┴────────┐
│      Sites      │
│  - id (PK)      │
│  - org_id (FK)  │
│  - project_id(FK)│
│  - vertical     │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────┴────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ ManufacturingData  │     │   EnergyData     │     │   RetailData    │
│ - time (PK)        │     │ - time (PK)      │     │ - time (PK)     │
│ - site_id (PK, FK) │     │ - site_id (PK,FK)│     │ - site_id(PK,FK)│
│ - machine_id (PK)  │     │ - meter_id (PK)  │     │ - store_id (PK) │
│ - uptime           │     │ - kwh_consumed   │     │ - sku (PK)      │
│ - throughput       │     │ - tariff_rate    │     │ - sales_units   │
│ - defect_count     │     │ - period_type    │     │ - revenue       │
└────────────────────┘     └──────────────────┘     └─────────────────┘

         ┌────────────────────────┐
         │      Forecasts         │
         │  - id (PK)             │
         │  - project_id (FK)     │
         │  - model_type          │
         │  - metrics (JSONB)     │
         └──────────┬─────────────┘
                    │ 1
                    │
                    │ N
         ┌──────────┴─────────────┐
         │   ForecastResults      │
         │  - id (PK)             │
         │  - forecast_id (FK)    │
         │  - timestamp           │
         │  - predicted_value     │
         │  - lower_bound         │
         │  - upper_bound         │
         └────────────────────────┘

┌────────────────────┐     ┌────────────────────┐     ┌──────────────────┐
│   Simulations      │     │  Recommendations   │     │    Anomalies     │
│ - id (PK)          │     │ - id (PK)          │     │ - id (PK)        │
│ - project_id (FK)  │     │ - project_id (FK)  │     │ - site_id (FK)   │
│ - name             │     │ - title            │     │ - timestamp      │
│ - parameters       │     │ - category         │     │ - metric_name    │
│ - results (JSONB)  │     │ - priority         │     │ - anomaly_score  │
└────────────────────┘     └────────────────────┘     └──────────────────┘
```

## Core Entities

### Organizations

Central entity for multi-tenant isolation.

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_plan_type ON organizations(plan_type);
```

**Fields**:
- `id`: UUID primary key
- `name`: Organization display name
- `slug`: URL-friendly unique identifier
- `plan_type`: Subscription plan (free, starter, professional, enterprise)
- `settings`: JSONB for flexible configuration (timezone, currency, etc.)
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update
- `deleted_at`: Soft delete timestamp (NULL if active)

**Relationships**:
- Has many `projects`
- Has many `sites`
- Has many `org_memberships`
- Has many `api_keys`

---

### Users

User accounts for authentication.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Fields**:
- `id`: UUID primary key
- `email`: Unique email address (lowercase)
- `hashed_password`: bcrypt hashed password (salt rounds = 12)
- `full_name`: User's display name
- `is_active`: Account status flag

**Relationships**:
- Has many `org_memberships`

**Security**:
- Passwords hashed with bcrypt
- Email stored in lowercase
- No plaintext password storage

---

### OrgMemberships

Junction table for user-organization relationships with roles.

```sql
CREATE TABLE org_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX idx_org_memberships_org_user ON org_memberships(org_id, user_id);
CREATE INDEX idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX idx_org_memberships_role ON org_memberships(role);
```

**Fields**:
- `id`: UUID primary key
- `org_id`: Foreign key to organizations
- `user_id`: Foreign key to users
- `role`: User role (owner, admin, member, viewer)

**Roles**:
- `owner`: Full control, billing management
- `admin`: Manage projects and data
- `member`: View and edit data
- `viewer`: Read-only access

**Constraints**:
- Unique (org_id, user_id) - user can't be added twice
- Cascade delete when org or user deleted

---

### Projects

Logical grouping of sites and analytics for a specific initiative.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    vertical VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_vertical ON projects(vertical);
CREATE INDEX idx_projects_org_vertical ON projects(org_id, vertical);
```

**Fields**:
- `id`: UUID primary key
- `org_id`: Foreign key to organizations
- `name`: Project name
- `description`: Optional project description
- `vertical`: Industry type (manufacturing, energy, retail)

**Relationships**:
- Belongs to one `organization`
- Has many `sites`
- Has many `forecasts`
- Has many `simulations`
- Has many `recommendations`

---

### Sites

Physical locations or logical entities where data is collected.

```sql
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    vertical VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sites_org ON sites(org_id);
CREATE INDEX idx_sites_project ON sites(project_id);
CREATE INDEX idx_sites_vertical ON sites(vertical);
```

**Fields**:
- `id`: UUID primary key
- `org_id`: Foreign key to organizations (for quick tenant filtering)
- `project_id`: Foreign key to projects
- `name`: Site name
- `vertical`: Industry vertical (must match project)
- `location`: Physical location (e.g., "Detroit, MI")
- `metadata`: JSONB for flexible site-specific data

**Relationships**:
- Belongs to one `organization`
- Belongs to one `project`
- Has many `manufacturing_data` (if manufacturing vertical)
- Has many `energy_data` (if energy vertical)
- Has many `retail_data` (if retail vertical)

## Time-Series Data Models

All time-series tables are **TimescaleDB hypertables** for automatic partitioning and compression.

### ManufacturingData

Factory and production monitoring data.

```sql
CREATE TABLE manufacturing_data (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    machine_id VARCHAR(100) NOT NULL,
    uptime_minutes INTEGER,
    throughput_units INTEGER,
    defect_count INTEGER DEFAULT 0,
    cycle_time_seconds FLOAT,
    quality_score FLOAT,
    downtime_events JSONB DEFAULT '[]',
    PRIMARY KEY (time, site_id, machine_id)
);

-- Convert to hypertable (TimescaleDB)
SELECT create_hypertable('manufacturing_data', 'time');

-- Indexes
CREATE INDEX idx_manufacturing_site_time ON manufacturing_data(site_id, time DESC);
CREATE INDEX idx_manufacturing_machine ON manufacturing_data(machine_id);
```

**Fields**:
- `time`: Timestamp of measurement (partitioning key)
- `site_id`: Foreign key to sites
- `machine_id`: Machine identifier (e.g., "MACHINE-001")
- `uptime_minutes`: Operating minutes in period
- `throughput_units`: Units produced
- `defect_count`: Number of defects
- `cycle_time_seconds`: Average cycle time
- `quality_score`: Quality percentage (0.0-1.0)
- `downtime_events`: JSONB array of downtime events

**Primary Key**: Composite (time, site_id, machine_id)

**Typical Query Pattern**:
```sql
SELECT * FROM manufacturing_data
WHERE site_id = '...'
  AND time >= '2024-01-01'
  AND time < '2024-02-01'
ORDER BY time DESC;
```

---

### EnergyData

Power consumption and generation monitoring.

```sql
CREATE TABLE energy_data (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    meter_id VARCHAR(100) NOT NULL,
    kwh_consumed FLOAT NOT NULL,
    tariff_rate FLOAT,
    period_type VARCHAR(50),
    solar_generation_kwh FLOAT DEFAULT 0.0,
    load_shedding_event BOOLEAN DEFAULT FALSE,
    power_factor FLOAT,
    demand_kw FLOAT,
    PRIMARY KEY (time, site_id, meter_id)
);

-- Convert to hypertable
SELECT create_hypertable('energy_data', 'time');

-- Indexes
CREATE INDEX idx_energy_site_time ON energy_data(site_id, time DESC);
CREATE INDEX idx_energy_meter ON energy_data(meter_id);
CREATE INDEX idx_energy_period ON energy_data(period_type);
```

**Fields**:
- `time`: Timestamp of measurement
- `site_id`: Foreign key to sites
- `meter_id`: Energy meter identifier
- `kwh_consumed`: Energy consumed in kWh
- `tariff_rate`: Cost per kWh
- `period_type`: Tariff period (peak, off_peak, standard)
- `solar_generation_kwh`: Solar generation in kWh
- `load_shedding_event`: Power outage flag
- `power_factor`: Power factor (efficiency)
- `demand_kw`: Peak demand in kW

**Primary Key**: Composite (time, site_id, meter_id)

**KPI Calculations**:
- Total cost = kwh_consumed × tariff_rate
- Solar contribution = solar_generation_kwh / kwh_consumed
- Load factor = avg_demand / peak_demand

---

### RetailData

Store operations and inventory tracking.

```sql
CREATE TABLE retail_data (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    store_id VARCHAR(100) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    daily_sales_units INTEGER,
    daily_revenue FLOAT,
    inventory_level INTEGER,
    promo_active BOOLEAN DEFAULT FALSE,
    promo_discount_pct FLOAT,
    footfall_count INTEGER,
    weather_condition VARCHAR(50),
    PRIMARY KEY (time, site_id, store_id, sku)
);

-- Convert to hypertable
SELECT create_hypertable('retail_data', 'time');

-- Indexes
CREATE INDEX idx_retail_site_time ON retail_data(site_id, time DESC);
CREATE INDEX idx_retail_store ON retail_data(store_id);
CREATE INDEX idx_retail_sku ON retail_data(sku);
```

**Fields**:
- `time`: Date of measurement (daily granularity)
- `site_id`: Foreign key to sites
- `store_id`: Store identifier
- `sku`: Product SKU
- `daily_sales_units`: Units sold
- `daily_revenue`: Revenue generated
- `inventory_level`: Stock level
- `promo_active`: Promotion flag
- `promo_discount_pct`: Discount percentage
- `footfall_count`: Customer count
- `weather_condition`: Weather (sunny, rainy, etc.)

**Primary Key**: Composite (time, site_id, store_id, sku)

**KPI Calculations**:
- Sales velocity = daily_sales_units / days
- Inventory turnover = total_sales / avg_inventory
- Promo effectiveness = promo_sales / non_promo_sales

## ML and Analytics Models

### Forecasts

Trained machine learning models and metadata.

```sql
CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    vertical VARCHAR(50) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    trained_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metrics JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_forecasts_project ON forecasts(project_id);
CREATE INDEX idx_forecasts_project_vertical ON forecasts(project_id, vertical);
CREATE INDEX idx_forecasts_trained_at ON forecasts(trained_at DESC);
```

**Fields**:
- `id`: UUID primary key
- `project_id`: Foreign key to projects
- `vertical`: Industry vertical
- `model_type`: ML algorithm (prophet, arima, lstm)
- `trained_at`: Training completion timestamp
- `metrics`: JSONB with RMSE, MAE, MAPE, R²
- `config`: JSONB with hyperparameters

**Metrics Example**:
```json
{
  "rmse": 12.5,
  "mae": 9.2,
  "mape": 7.8,
  "r2_score": 0.85
}
```

**Relationships**:
- Belongs to one `project`
- Has many `forecast_results`

---

### ForecastResults

Individual prediction values from trained models.

```sql
CREATE TABLE forecast_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_id UUID NOT NULL REFERENCES forecasts(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    predicted_value FLOAT NOT NULL,
    lower_bound FLOAT,
    upper_bound FLOAT,
    actual_value FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_forecast_results_forecast ON forecast_results(forecast_id);
CREATE INDEX idx_forecast_results_timestamp ON forecast_results(timestamp);
CREATE INDEX idx_forecast_results_forecast_time ON forecast_results(forecast_id, timestamp);
```

**Fields**:
- `id`: UUID primary key
- `forecast_id`: Foreign key to forecasts
- `timestamp`: Future timestamp being predicted
- `predicted_value`: Point forecast
- `lower_bound`: Lower confidence interval (e.g., 5th percentile)
- `upper_bound`: Upper confidence interval (e.g., 95th percentile)
- `actual_value`: Actual value when available (for accuracy tracking)

**Relationships**:
- Belongs to one `forecast`

---

### Simulations

What-if scenario analysis results.

```sql
CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parameters JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending',
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_simulations_project ON simulations(project_id);
CREATE INDEX idx_simulations_status ON simulations(status);
CREATE INDEX idx_simulations_project_status ON simulations(project_id, status);
```

**Fields**:
- `id`: UUID primary key
- `project_id`: Foreign key to projects
- `name`: Simulation name
- `parameters`: JSONB with input parameters
- `status`: Execution status (pending, running, completed, failed)
- `results`: JSONB with simulation outputs

**Parameters Example**:
```json
{
  "throughput_increase_pct": 20,
  "quality_target": 0.95,
  "simulation_days": 30
}
```

**Results Example**:
```json
{
  "predicted_throughput": 15000,
  "predicted_oee": 78.5,
  "confidence_interval": [75.2, 81.8],
  "probability_of_success": 0.85
}
```

---

### Recommendations

AI-generated optimization suggestions.

```sql
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    confidence_score FLOAT NOT NULL,
    priority VARCHAR(50) NOT NULL,
    actions JSONB DEFAULT '[]',
    vertical VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_recommendations_project ON recommendations(project_id);
CREATE INDEX idx_recommendations_category ON recommendations(category);
CREATE INDEX idx_recommendations_priority ON recommendations(priority);
CREATE INDEX idx_recommendations_status ON recommendations(status);
CREATE INDEX idx_recommendations_project_status ON recommendations(project_id, status);
```

**Fields**:
- `id`: UUID primary key
- `project_id`: Foreign key to projects
- `title`: Short recommendation title
- `description`: Detailed explanation
- `category`: Type (optimization, maintenance, efficiency, quality, cost_reduction, safety)
- `confidence_score`: AI confidence (0.0-1.0)
- `priority`: Urgency (low, medium, high, critical)
- `actions`: JSONB array of actionable steps
- `vertical`: Industry vertical
- `status`: Action status (pending, in_progress, completed, dismissed)

**Actions Example**:
```json
[
  "Schedule preventive maintenance for MACHINE-001",
  "Review maintenance logs for patterns",
  "Order spare parts for replacement"
]
```

---

### Anomalies

Detected anomalies in time-series data.

```sql
CREATE TABLE anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    expected_value FLOAT,
    actual_value FLOAT NOT NULL,
    anomaly_score FLOAT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_anomalies_site ON anomalies(site_id);
CREATE INDEX idx_anomalies_timestamp ON anomalies(timestamp DESC);
CREATE INDEX idx_anomalies_severity ON anomalies(severity);
```

**Fields**:
- `id`: UUID primary key
- `site_id`: Foreign key to sites
- `timestamp`: When anomaly occurred
- `metric_name`: Which metric was anomalous
- `expected_value`: Predicted normal value
- `actual_value`: Observed value
- `anomaly_score`: Isolation Forest score
- `severity`: Impact level (low, medium, high, critical)

---

### DataQualityLogs

Data quality issues and validation errors.

```sql
CREATE TABLE data_quality_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_quality_site ON data_quality_logs(site_id);
CREATE INDEX idx_data_quality_created ON data_quality_logs(created_at DESC);
CREATE INDEX idx_data_quality_severity ON data_quality_logs(severity);
```

**Fields**:
- `id`: UUID primary key
- `site_id`: Foreign key to sites
- `issue_type`: Problem category (missing_data, outlier, invalid_range, duplicate)
- `severity`: Impact (low, medium, high)
- `details`: JSONB with issue specifics

## Relationships and Foreign Keys

### Cascade Delete Behavior

All foreign keys use `ON DELETE CASCADE` to maintain referential integrity:

```
Organization deleted → All projects, sites, members deleted
Project deleted → All sites, forecasts, simulations, recommendations deleted
Site deleted → All time-series data deleted
User deleted → All memberships deleted
Forecast deleted → All forecast_results deleted
```

### Multi-Tenant Filtering

All queries must filter by organization:

```python
# Example: Get all projects for an organization
projects = db.query(Project).filter(
    Project.org_id == current_org_id
).all()

# Example: Get manufacturing data for a site (implicit org check via site)
data = db.query(ManufacturingData).join(Site).filter(
    Site.org_id == current_org_id,
    ManufacturingData.site_id == site_id,
    ManufacturingData.time >= start_date
).all()
```

## Indexes and Performance

### Index Strategy

1. **Primary Keys**: All tables have UUID primary key
2. **Foreign Keys**: All FKs have indexes for join performance
3. **Time-Series**: Composite indexes on (site_id, time DESC) for common queries
4. **Tenant Isolation**: Indexes on org_id for fast filtering
5. **Status Fields**: Indexes on status, priority for filtering

### Composite Indexes

```sql
-- Most common query pattern: site + time range
CREATE INDEX idx_manufacturing_site_time ON manufacturing_data(site_id, time DESC);
CREATE INDEX idx_energy_site_time ON energy_data(site_id, time DESC);
CREATE INDEX idx_retail_site_time ON retail_data(site_id, time DESC);

-- Multi-tenant filtering
CREATE INDEX idx_projects_org_vertical ON projects(org_id, vertical);
CREATE INDEX idx_sites_org ON sites(org_id);

-- Recommendation filtering
CREATE INDEX idx_recommendations_project_status ON recommendations(project_id, status);
```

### Query Optimization Tips

1. **Always filter by org_id** first to leverage partitioning
2. **Use time ranges** with BETWEEN or >= AND <
3. **Avoid SELECT *** - specify columns needed
4. **Use LIMIT** for pagination
5. **Leverage indexes** - check with EXPLAIN ANALYZE

## TimescaleDB Configuration

### Hypertable Creation

```sql
-- Convert table to hypertable (partition by time)
SELECT create_hypertable(
    'manufacturing_data',
    'time',
    chunk_time_interval => INTERVAL '1 month'
);

SELECT create_hypertable(
    'energy_data',
    'time',
    chunk_time_interval => INTERVAL '1 month'
);

SELECT create_hypertable(
    'retail_data',
    'time',
    chunk_time_interval => INTERVAL '1 month'
);
```

### Compression Policy

Automatically compress old data to save space:

```sql
-- Enable compression on hypertable
ALTER TABLE manufacturing_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'site_id,machine_id',
  timescaledb.compress_orderby = 'time DESC'
);

-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy(
    'manufacturing_data',
    INTERVAL '7 days'
);

-- Similar for other hypertables
ALTER TABLE energy_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'site_id,meter_id',
  timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('energy_data', INTERVAL '7 days');
```

**Compression Benefits**:
- 90%+ storage reduction
- Faster queries on old data
- Automatic background process

### Continuous Aggregates

Pre-compute hourly/daily rollups:

```sql
-- Hourly rollup for manufacturing data
CREATE MATERIALIZED VIEW manufacturing_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS hour,
  site_id,
  machine_id,
  AVG(uptime_minutes) AS avg_uptime,
  SUM(throughput_units) AS total_throughput,
  SUM(defect_count) AS total_defects
FROM manufacturing_data
GROUP BY hour, site_id, machine_id;

-- Refresh policy (update every hour)
SELECT add_continuous_aggregate_policy(
    'manufacturing_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

## Data Retention Policies

Automatically delete old data to manage storage:

```sql
-- Delete data older than 1 year
SELECT add_retention_policy(
    'manufacturing_data',
    INTERVAL '365 days'
);

SELECT add_retention_policy(
    'energy_data',
    INTERVAL '365 days'
);

SELECT add_retention_policy(
    'retail_data',
    INTERVAL '365 days'
);
```

**Retention Strategy**:
- **Raw data**: 1 year retention
- **Hourly aggregates**: 2 years retention
- **Daily aggregates**: 5 years retention
- **Forecasts/Recommendations**: Indefinite (until project deleted)

### Manual Cleanup

```sql
-- View chunk information
SELECT * FROM timescaledb_information.chunks
WHERE hypertable_name = 'manufacturing_data'
ORDER BY range_start DESC;

-- Manually drop old chunks
SELECT drop_chunks('manufacturing_data', INTERVAL '2 years');
```

## Database Migrations

Migrations managed with Alembic:

```bash
# Create new migration
alembic revision --autogenerate -m "Add new field to projects"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

## See Also

- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Development Guide](DEVELOPMENT.md)
