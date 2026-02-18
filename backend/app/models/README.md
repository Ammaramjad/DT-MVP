# Database Models Documentation

## Overview

This directory contains comprehensive SQLAlchemy database models for the AI Digital Twin SaaS Platform. The models support multi-tenant architecture, time-series data ingestion, and advanced analytics capabilities across three industry verticals: Manufacturing, Energy, and Retail.

## Model Architecture

### Core Models (4)

#### 1. **Organization** (`organization.py`)
Multi-tenant organization with subscription tiers.

**Fields:**
- `id` (UUID): Primary key
- `name` (String): Organization name
- `slug` (String): Unique URL-friendly identifier
- `plan_type` (Enum): Subscription tier (free, starter, professional, enterprise)
- `settings` (JSONB): Flexible configuration storage
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `projects`: One-to-many with Project
- `sites`: One-to-many with Site
- `memberships`: One-to-many with OrgMembership
- `api_keys`: One-to-many with APIKey

#### 2. **User** (`user.py`)
User authentication and profile management.

**Fields:**
- `id` (UUID): Primary key
- `email` (String): Unique email address
- `hashed_password` (String): Bcrypt hashed password
- `full_name` (String): User's full name
- `is_active` (Boolean): Account status
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `memberships`: One-to-many with OrgMembership

#### 3. **Project** (`project.py`)
Project organization by industry vertical.

**Fields:**
- `id` (UUID): Primary key
- `org_id` (UUID): Foreign key to Organization
- `name` (String): Project name
- `description` (Text): Project description
- `vertical` (Enum): Industry vertical (manufacturing, energy, retail)
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `organization`: Many-to-one with Organization
- `sites`: One-to-many with Site
- `forecasts`: One-to-many with Forecast
- `simulations`: One-to-many with Simulation
- `recommendations`: One-to-many with Recommendation

**Indexes:**
- Composite index on (`org_id`, `vertical`)

#### 4. **Site** (`site.py`)
Physical locations being monitored by digital twins.

**Fields:**
- `id` (UUID): Primary key
- `org_id` (UUID): Foreign key to Organization
- `project_id` (UUID): Foreign key to Project
- `name` (String): Site name
- `site_type` (String): Type of site
- `vertical` (Enum): Industry vertical
- `location` (String): Physical location
- `site_metadata` (JSONB): Additional site information
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `organization`: Many-to-one with Organization
- `project`: Many-to-one with Project
- `manufacturing_data`: One-to-many with ManufacturingData
- `energy_data`: One-to-many with EnergyData
- `retail_data`: One-to-many with RetailData
- `anomalies`: One-to-many with Anomaly
- `data_quality_logs`: One-to-many with DataQualityLog

**Indexes:**
- Composite index on (`org_id`, `project_id`)
- Index on `vertical`

---

### Time-Series Data Models (3)

These models use composite primary keys optimized for TimescaleDB hypertables.

#### 5. **ManufacturingData** (`manufacturing.py`)
Production and quality metrics from manufacturing facilities.

**Primary Key:** (`time`, `site_id`, `machine_id`)

**Fields:**
- `time` (DateTime): Measurement timestamp
- `site_id` (UUID): Foreign key to Site
- `machine_id` (String): Machine identifier
- `uptime_minutes` (Integer): Machine uptime
- `throughput_units` (Integer): Units produced
- `defect_count` (Integer): Number of defects
- `cycle_time_seconds` (Float): Production cycle time
- `quality_score` (Float): Quality metric (0-100)
- `downtime_events` (JSONB): Array of downtime events

**Indexes:**
- B-tree index on `time`
- Composite index on (`site_id`, `time`)
- Index on `machine_id`

#### 6. **EnergyData** (`energy.py`)
Power consumption, generation, and demand metrics.

**Primary Key:** (`time`, `site_id`, `meter_id`)

**Fields:**
- `time` (DateTime): Measurement timestamp
- `site_id` (UUID): Foreign key to Site
- `meter_id` (String): Meter identifier
- `kwh_consumed` (Float): Energy consumed in kWh
- `tariff_rate` (Float): Current tariff rate
- `period_type` (Enum): Tariff period (peak, off_peak, standard)
- `solar_generation_kwh` (Float): Solar energy generated
- `load_shedding_event` (Boolean): Load shedding flag
- `power_factor` (Float): Power factor
- `demand_kw` (Float): Peak demand in kW

**Indexes:**
- B-tree index on `time`
- Composite index on (`site_id`, `time`)
- Index on `meter_id`
- Index on `period_type`

#### 7. **RetailData** (`retail.py`)
Store operations, sales, and inventory metrics.

**Primary Key:** (`time`, `site_id`, `store_id`, `sku`)

**Fields:**
- `time` (DateTime): Measurement timestamp
- `site_id` (UUID): Foreign key to Site
- `store_id` (String): Store identifier
- `sku` (String): Product SKU
- `daily_sales_units` (Integer): Units sold
- `daily_revenue` (Float): Revenue generated
- `inventory_level` (Integer): Current inventory
- `promo_active` (Boolean): Promotion status
- `promo_discount_pct` (Float): Discount percentage
- `footfall_count` (Integer): Customer traffic
- `weather_condition` (String): Weather condition

**Indexes:**
- B-tree index on `time`
- Composite index on (`site_id`, `time`)
- Index on `store_id`
- Index on `sku`

---

### Analytics Models (4)

#### 8. **Forecast** (`forecast.py`)
Trained ML models for predictive analytics.

**Fields:**
- `id` (UUID): Primary key
- `project_id` (UUID): Foreign key to Project
- `vertical` (Enum): Industry vertical
- `model_type` (String): ML model type
- `trained_at` (DateTime): Training timestamp
- `metrics` (JSONB): Model performance metrics
- `config` (JSONB): Model configuration
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `project`: Many-to-one with Project
- `results`: One-to-many with ForecastResult

**Indexes:**
- Composite index on (`project_id`, `vertical`)
- Index on `trained_at`

#### 9. **ForecastResult** (`forecast.py`)
Individual prediction results with confidence intervals.

**Fields:**
- `id` (UUID): Primary key
- `forecast_id` (UUID): Foreign key to Forecast
- `timestamp` (DateTime): Prediction timestamp
- `predicted_value` (Float): Predicted value
- `lower_bound` (Float): Lower confidence bound
- `upper_bound` (Float): Upper confidence bound
- `actual_value` (Float): Actual observed value
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `forecast`: Many-to-one with Forecast

**Indexes:**
- Composite index on (`forecast_id`, `timestamp`)

#### 10. **Simulation** (`simulation.py`)
What-if scenario analysis and optimization.

**Fields:**
- `id` (UUID): Primary key
- `project_id` (UUID): Foreign key to Project
- `name` (String): Simulation name
- `parameters` (JSONB): Input parameters
- `status` (Enum): Execution status (pending, running, completed, failed)
- `results` (JSONB): Simulation results
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `project`: Many-to-one with Project

**Indexes:**
- Composite index on (`project_id`, `status`)

#### 11. **Recommendation** (`recommendation.py`)
AI-generated insights and actionable recommendations.

**Fields:**
- `id` (UUID): Primary key
- `project_id` (UUID): Foreign key to Project
- `title` (String): Recommendation title
- `description` (Text): Detailed description
- `category` (Enum): Category (optimization, maintenance, efficiency, quality, cost_reduction, safety)
- `confidence_score` (Float): AI confidence (0-1)
- `priority` (Enum): Priority level (low, medium, high, critical)
- `actions` (JSONB): Recommended actions
- `vertical` (Enum): Industry vertical
- `status` (Enum): Implementation status (pending, in_progress, completed, dismissed)
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `project`: Many-to-one with Project

**Indexes:**
- Composite index on (`project_id`, `status`)
- Index on `priority`
- Index on `category`

---

### Monitoring Models (2)

#### 12. **Anomaly** (`anomaly.py`)
Detected anomalies in time-series data.

**Fields:**
- `id` (UUID): Primary key
- `site_id` (UUID): Foreign key to Site
- `timestamp` (DateTime): Anomaly timestamp
- `metric_name` (String): Affected metric
- `anomaly_score` (Float): Anomaly score
- `severity` (Enum): Severity level (low, medium, high, critical)
- `acknowledged` (Boolean): Acknowledgment status
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `site`: Many-to-one with Site

**Indexes:**
- Composite index on (`site_id`, `timestamp`)
- Composite index on (`severity`, `acknowledged`)

#### 13. **DataQualityLog** (`data_quality_log.py`)
Data ingestion quality monitoring.

**Fields:**
- `id` (UUID): Primary key
- `site_id` (UUID): Foreign key to Site
- `timestamp` (DateTime): Log timestamp
- `ingestion_batch_id` (String): Batch identifier
- `quality_score` (Float): Quality score (0-100)
- `errors` (JSONB): Validation errors
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `site`: Many-to-one with Site

**Indexes:**
- Composite index on (`site_id`, `timestamp`)
- Index on `ingestion_batch_id`

---

### Access Control Models (2)

#### 14. **OrgMembership** (`org_membership.py`)
User-organization relationships with role-based access.

**Fields:**
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to User
- `org_id` (UUID): Foreign key to Organization
- `role` (Enum): Member role (owner, admin, member, viewer)
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `user`: Many-to-one with User
- `organization`: Many-to-one with Organization

**Constraints:**
- Unique constraint on (`user_id`, `org_id`)

**Indexes:**
- Composite index on (`user_id`, `org_id`)

#### 15. **APIKey** (`api_key.py`)
Programmatic API access authentication.

**Fields:**
- `id` (UUID): Primary key
- `org_id` (UUID): Foreign key to Organization
- `key_hash` (String): Hashed API key
- `name` (String): Key name/description
- `permissions` (JSONB): Access permissions
- `last_used` (DateTime): Last usage timestamp
- `expires_at` (DateTime): Expiration timestamp
- `created_at`, `updated_at` (DateTime): Timestamps

**Relationships:**
- `organization`: Many-to-one with Organization

**Indexes:**
- Unique index on `key_hash`
- Composite index on (`org_id`, `expires_at`)

---

## Base Model

All models (except time-series) inherit from **BaseModel** (`base.py`), which provides:
- `id` (UUID): Primary key with auto-generated UUID4
- `created_at` (DateTime): Automatic creation timestamp
- `updated_at` (DateTime): Automatic update timestamp
- `__repr__()`: String representation for debugging

## Enums

### PlanType
- `FREE`: Free tier
- `STARTER`: Starter plan
- `PROFESSIONAL`: Professional plan
- `ENTERPRISE`: Enterprise plan

### VerticalType
- `MANUFACTURING`: Manufacturing industry
- `ENERGY`: Energy sector
- `RETAIL`: Retail operations

### PeriodType
- `PEAK`: Peak hours
- `OFF_PEAK`: Off-peak hours
- `STANDARD`: Standard hours

### OrgRole
- `OWNER`: Organization owner
- `ADMIN`: Administrator
- `MEMBER`: Regular member
- `VIEWER`: Read-only access

### Severity
- `LOW`: Low severity
- `MEDIUM`: Medium severity
- `HIGH`: High severity
- `CRITICAL`: Critical severity

### Priority
- `LOW`: Low priority
- `MEDIUM`: Medium priority
- `HIGH`: High priority
- `CRITICAL`: Critical priority

### SimulationStatus
- `PENDING`: Queued for execution
- `RUNNING`: Currently executing
- `COMPLETED`: Successfully completed
- `FAILED`: Execution failed

### RecommendationStatus
- `PENDING`: Not yet reviewed
- `IN_PROGRESS`: Being implemented
- `COMPLETED`: Implementation complete
- `DISMISSED`: Rejected/dismissed

### RecommendationCategory
- `OPTIMIZATION`: Performance optimization
- `MAINTENANCE`: Maintenance recommendations
- `EFFICIENCY`: Efficiency improvements
- `QUALITY`: Quality enhancements
- `COST_REDUCTION`: Cost savings
- `SAFETY`: Safety improvements

## Key Features

✓ **UUID Primary Keys**: Distributed-system friendly unique identifiers
✓ **Timestamps**: Automatic tracking of creation and updates
✓ **Foreign Key Cascades**: Proper CASCADE delete behavior
✓ **Indexes**: Optimized for common query patterns
✓ **JSONB Columns**: Flexible schema for metadata and settings
✓ **Enum Types**: Type-safe categorical data
✓ **Composite Keys**: Optimized for TimescaleDB time-series data
✓ **Relationships**: Bidirectional SQLAlchemy relationships

## Usage Example

```python
from app.models import Organization, User, Project, Site
from app.database import SessionLocal

# Create session
db = SessionLocal()

# Create organization
org = Organization(
    name="Acme Corp",
    slug="acme-corp",
    plan_type=PlanType.PROFESSIONAL,
    settings={"notifications": True}
)
db.add(org)

# Create project
project = Project(
    org_id=org.id,
    name="Factory Optimization",
    description="Digital twin for production line",
    vertical=VerticalType.MANUFACTURING
)
db.add(project)

# Create site
site = Site(
    org_id=org.id,
    project_id=project.id,
    name="Factory Floor 1",
    vertical=VerticalType.MANUFACTURING,
    location="Detroit, MI",
    site_metadata={"capacity": 1000}
)
db.add(site)

db.commit()
```

## Database Migrations

Use Alembic for database migrations:

```bash
# Generate migration
alembic revision --autogenerate -m "Create initial models"

# Apply migration
alembic upgrade head
```

## TimescaleDB Integration

The time-series models (ManufacturingData, EnergyData, RetailData) are designed to work with TimescaleDB hypertables:

```sql
-- Convert to hypertable (run after table creation)
SELECT create_hypertable('manufacturing_data', 'time');
SELECT create_hypertable('energy_data', 'time');
SELECT create_hypertable('retail_data', 'time');

-- Add retention policy (optional)
SELECT add_retention_policy('manufacturing_data', INTERVAL '1 year');
```

## Testing

```bash
# Test model imports
python -c "from app.models import *; print('All models imported successfully')"

# Run tests
pytest tests/test_models.py
```
