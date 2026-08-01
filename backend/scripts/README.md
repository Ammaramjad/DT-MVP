# Backend Scripts

This directory contains utility scripts for the Digital Twin platform backend.

## Seed Data Generator

### Overview

The `seed_data.py` script generates comprehensive test data for the Digital Twin platform, including organizations, users, projects, sites, and 90 days of realistic time-series data.

### Usage

```bash
# Generate seed data (preserves existing data)
python scripts/seed_data.py

# Clear existing data and generate fresh seed data
python scripts/seed_data.py --clear
```

### Prerequisites

1. Database must be running and accessible
2. Database migrations must be applied (run alembic upgrade head)
3. Backend dependencies must be installed (pip install -r requirements.txt)

### Generated Data

#### Organizations (2)
- **Acme Manufacturing** (slug: `acme-manufacturing`)
  - Plan: Professional
- **TechCorp Industries** (slug: `techcorp-industries`)
  - Plan: Enterprise

#### Users (5 per organization)
Each organization gets:
- 1 Admin user
- 2 Member users (operators)
- 2 Viewer users
- Password for all users: `password123`

Example credentials:
- Email: `admin.user@acme-manufacturing.com`
- Password: `password123`

#### Projects (3 per organization)
- Manufacturing Operations (manufacturing vertical)
- Energy Management (energy vertical)
- Retail Analytics (retail vertical)

#### Sites (2 per project)

**Manufacturing:**
- Factory-A (Detroit, MI)
- Factory-B (Chicago, IL)

**Energy:**
- Building-North (Seattle, WA)
- Building-South (Portland, OR)

**Retail:**
- Store-1 (New York, NY)
- Store-2 (Boston, MA)

#### Time-Series Data (90 days)

**Manufacturing Data (Hourly):**
- Machine uptime (85-95%)
- Throughput (900-1100 units/hour)
- Defect rates (1-5%)
- Cycle times
- Quality scores
- Downtime events (occasional)
- Weekly seasonality (lower production on weekends)
- Occasional anomalies (2% of data)

**Energy Data (15-minute intervals):**
- kWh consumption with time-of-day patterns
- Peak/off-peak/standard tariff periods
- Solar generation during daylight hours
- Power factor (0.85-0.95)
- Demand (kW)
- Load shedding events (rare, 0.5%)
- Demand spikes (3% of data)

**Retail Data (Daily):**
- Sales units (100-500 per day)
- Revenue with realistic pricing
- Inventory levels
- Promotional periods (20% of days)
- Footfall counts
- Weather conditions
- Weekly seasonality (higher on weekends)
- Seasonal trends (higher in Q4)
- Occasional anomalies (1% of data)

### Data Volumes

Approximate record counts per organization:
- Manufacturing: ~97,200 records (2 sites × 3-5 machines × 90 days × 24 hours)
- Energy: ~34,560 records (2 sites × 90 days × 24 hours × 4 per hour)
- Retail: ~1,800 records (2 sites × 90 days × 10 SKUs)

Total: ~133,560 time-series records per organization

### Performance

The script uses bulk insert operations for efficiency:
- Manufacturing & Energy: Commits every 1,000 records
- Retail: Commits every 500 records

Expected runtime: 2-5 minutes depending on hardware

### Data Characteristics

The generated data includes:
- **Realistic patterns**: Weekly seasonality, daily patterns, time-of-day variations
- **Correlations**: Promotions increase sales, solar generation peaks at noon, etc.
- **Anomalies**: Occasional outliers to test anomaly detection
- **Diversity**: Different patterns for weekdays vs. weekends
- **Completeness**: All required fields populated with valid data

### Troubleshooting

**Database connection errors:**
- Ensure PostgreSQL is running
- Check database credentials in `.env` file or environment variables
- Verify database exists: `digital_twin`

**Import errors:**
- Install dependencies: `pip install -r requirements.txt`

**Slow performance:**
- First run may be slower due to index creation
- Subsequent runs with `--clear` are faster

**Memory issues:**
- Script uses bulk operations to minimize memory usage
- If issues persist, reduce batch sizes in the script

### Development

To modify the data generation:

1. **Add new verticals**: Update `VerticalType` enum and add generation method
2. **Change data patterns**: Modify the generation logic in respective methods
3. **Adjust volumes**: Change date ranges or intervals in generation methods
4. **Add new fields**: Update model imports and data point creation

### Testing

To verify generated data:

```sql
-- Check organization count
SELECT COUNT(*) FROM organizations;

-- Check user distribution
SELECT o.name, COUNT(u.id) as user_count
FROM organizations o
JOIN org_memberships om ON o.id = om.org_id
JOIN users u ON om.user_id = u.id
GROUP BY o.name;

-- Check time-series data ranges
SELECT 
  MIN(time) as start_date,
  MAX(time) as end_date,
  COUNT(*) as record_count
FROM manufacturing_data;

-- Check data quality
SELECT 
  site_id,
  COUNT(*) as records,
  MIN(time) as first_record,
  MAX(time) as last_record
FROM energy_data
GROUP BY site_id;
```

### License

Part of the AI Digital Twin SaaS Platform.
