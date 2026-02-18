# Industry Verticals Documentation

Comprehensive guide to industry-specific data models, KPIs, and use cases.

## Table of Contents

- [Manufacturing Vertical](#manufacturing-vertical)
- [Energy Vertical](#energy-vertical)
- [Retail Vertical](#retail-vertical)

---

## Manufacturing Vertical

Factory and production monitoring for manufacturing operations.

### Data Schema

**Table**: `manufacturing_data`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `time` | TIMESTAMP | Measurement timestamp | 2024-01-15T10:00:00Z |
| `site_id` | UUID | Site identifier (FK) | uuid |
| `machine_id` | STRING | Machine identifier | "MACHINE-001" |
| `uptime_minutes` | INTEGER | Operating minutes in period | 55 |
| `throughput_units` | INTEGER | Units produced | 120 |
| `defect_count` | INTEGER | Number of defects | 2 |
| `cycle_time_seconds` | FLOAT | Average cycle time | 45.5 |
| `quality_score` | FLOAT | Quality percentage (0-1) | 0.98 |
| `downtime_events` | JSONB | Array of downtime events | [...] |

**Primary Key**: (time, site_id, machine_id)

### KPI Formulas

#### Overall Equipment Effectiveness (OEE)

The gold standard for measuring manufacturing productivity.

**Formula**:
```
OEE (%) = Availability × Performance × Quality
```

**Components**:

1. **Availability**:
   ```
   Availability (%) = (Actual Operating Time / Planned Production Time) × 100
   ```
   - Measures downtime losses
   - Planned Production Time = Total time - scheduled downtime
   - Example: 480 minutes planned, 420 minutes actual = 87.5%

2. **Performance**:
   ```
   Performance (%) = (Actual Output / Planned Output) × 100
   ```
   - Measures speed losses
   - Planned Output = Ideal Cycle Time × Operating Time
   - Example: 500 units planned, 450 actual = 90%

3. **Quality**:
   ```
   Quality (%) = (Good Units / Total Units) × 100
   ```
   - Measures quality losses
   - Good Units = Total Units - Defects
   - Example: 450 units, 10 defects = 97.8%

**Complete Example**:
```
Availability: 87.5%
Performance: 90%
Quality: 97.8%

OEE = 0.875 × 0.90 × 0.978 = 0.770 = 77%
```

**World-Class OEE**: 85%+
**Typical OEE**: 60-70%

#### Mean Time Between Failures (MTBF)

Measures reliability of equipment.

**Formula**:
```
MTBF (hours) = Total Operating Time / Number of Failures
```

**Example**:
```
Operating Time: 720 hours (1 month)
Failures: 6

MTBF = 720 / 6 = 120 hours
```

**Interpretation**: On average, machine runs 120 hours between failures.

#### Mean Time To Repair (MTTR)

Measures how quickly equipment is repaired.

**Formula**:
```
MTTR (hours) = Total Repair Time / Number of Repairs
```

**Example**:
```
Total Repair Time: 24 hours
Number of Repairs: 8

MTTR = 24 / 8 = 3 hours
```

**Target**: Minimize MTTR through predictive maintenance.

#### First Pass Yield (FPY)

Measures quality at first attempt (no rework).

**Formula**:
```
FPY (%) = (Units Passing First Time / Total Units Entered) × 100
```

**Example**:
```
Total Units: 1000
Units Passing First Time: 950

FPY = (950 / 1000) × 100 = 95%
```

**Industry Benchmark**: 95%+ is excellent.

#### Throughput

Total units produced in a period.

**Formula**:
```
Throughput = Sum of all units produced
```

#### Cycle Time

Average time to produce one unit.

**Formula**:
```
Cycle Time (seconds) = Total Production Time / Total Units Produced
```

#### Defect Rate

Percentage of defective units.

**Formula**:
```
Defect Rate (%) = (Defects / Total Units) × 100
```

### Data Ingestion Example

```bash
curl -X POST http://localhost:8000/api/v1/ingest/manufacturing \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "uuid",
    "data_points": [
      {
        "timestamp": "2024-01-15T08:00:00Z",
        "machine_id": "MACHINE-001",
        "uptime_minutes": 60,
        "throughput_units": 150,
        "defect_count": 3,
        "cycle_time_seconds": 24.0,
        "quality_score": 0.98,
        "downtime_events": []
      },
      {
        "timestamp": "2024-01-15T09:00:00Z",
        "machine_id": "MACHINE-001",
        "uptime_minutes": 55,
        "throughput_units": 140,
        "defect_count": 2,
        "cycle_time_seconds": 23.6,
        "quality_score": 0.986,
        "downtime_events": [
          {
            "start_time": "2024-01-15T09:45:00Z",
            "end_time": "2024-01-15T09:50:00Z",
            "duration": 5,
            "reason": "Material shortage"
          }
        ]
      }
    ]
  }'
```

### Typical Use Cases

1. **Production Monitoring**: Real-time dashboards showing OEE, throughput, quality
2. **Predictive Maintenance**: Forecast equipment failures using ML models
3. **Root Cause Analysis**: Identify patterns in downtime events
4. **Quality Control**: Track defect trends and correlate with process parameters
5. **Capacity Planning**: Simulate production scenarios with different parameters
6. **Shift Performance**: Compare OEE across different shifts and crews

### Recommendations Catalog

**Category: Maintenance**
- "Schedule preventive maintenance for MACHINE-X (MTBF declining)"
- "Replace wear parts on MACHINE-Y (cycle time increasing)"

**Category: Optimization**
- "Reduce changeover time between products (currently 45 min, target 30 min)"
- "Balance production line - MACHINE-A is bottleneck"

**Category: Quality**
- "Investigate quality issues on MACHINE-B (defect rate 5% vs. 2% target)"
- "Calibrate sensors on MACHINE-C (quality score variance increasing)"

**Category: Efficiency**
- "Increase batch sizes to reduce changeover frequency"
- "Optimize cycle time - analysis shows 10% improvement possible"

---

## Energy Vertical

Power consumption and generation monitoring for facilities.

### Data Schema

**Table**: `energy_data`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `time` | TIMESTAMP | Measurement timestamp | 2024-01-15T10:00:00Z |
| `site_id` | UUID | Site identifier (FK) | uuid |
| `meter_id` | STRING | Energy meter identifier | "METER-001" |
| `kwh_consumed` | FLOAT | Energy consumed (kWh) | 125.5 |
| `tariff_rate` | FLOAT | Cost per kWh | 0.12 |
| `period_type` | ENUM | Tariff period | "peak" |
| `solar_generation_kwh` | FLOAT | Solar generation (kWh) | 15.2 |
| `load_shedding_event` | BOOLEAN | Power outage flag | false |
| `power_factor` | FLOAT | Power efficiency (0-1) | 0.95 |
| `demand_kw` | FLOAT | Peak demand (kW) | 200.0 |

**Period Types**: `peak`, `off_peak`, `standard`

**Primary Key**: (time, site_id, meter_id)

### KPI Formulas

#### Total Energy Cost

**Formula**:
```
Total Cost ($) = Σ (kWh Consumed × Tariff Rate)
```

**Example**:
```
Peak hours: 500 kWh × $0.15 = $75
Off-peak: 800 kWh × $0.08 = $64
Total Cost = $139
```

#### Average Cost per kWh

**Formula**:
```
Avg Cost per kWh = Total Cost / Total kWh Consumed
```

#### Peak Demand Cost

Many utilities charge based on peak demand.

**Formula**:
```
Demand Charge ($) = Peak Demand (kW) × Demand Rate ($/kW)
```

**Example**:
```
Peak Demand: 500 kW
Demand Rate: $15/kW
Demand Charge = 500 × $15 = $7,500/month
```

#### Energy Intensity

Energy consumption per unit of production/revenue.

**Formula**:
```
Energy Intensity = Total kWh / Production Units (or Revenue)
```

**Example**:
```
Energy: 10,000 kWh
Production: 5,000 units
Intensity = 10,000 / 5,000 = 2 kWh per unit
```

**Target**: Decrease over time through efficiency improvements.

#### Solar Contribution

Percentage of energy from solar generation.

**Formula**:
```
Solar Contribution (%) = (Solar Generation kWh / Total Consumption kWh) × 100
```

**Example**:
```
Solar: 2,000 kWh
Total: 10,000 kWh
Solar % = (2,000 / 10,000) × 100 = 20%
```

#### Load Factor

Measures how evenly power is used over time.

**Formula**:
```
Load Factor = Average Demand / Peak Demand
```

**Example**:
```
Average Demand: 300 kW
Peak Demand: 500 kW
Load Factor = 300 / 500 = 0.60 = 60%
```

**Interpretation**: Higher is better (more consistent usage, lower demand charges).

#### Carbon Emissions

Estimate CO₂ emissions from energy consumption.

**Formula**:
```
CO₂ Emissions (tons) = kWh Consumed × Emission Factor
```

**Emission Factors** (varies by region):
- US Average: 0.92 lbs CO₂/kWh = 0.000417 tons/kWh
- Coal: 2.2 lbs CO₂/kWh
- Natural Gas: 0.91 lbs CO₂/kWh
- Solar/Wind: 0 lbs CO₂/kWh

**Example**:
```
Consumption: 150,000 kWh
Emission Factor: 0.000417 tons/kWh
Emissions = 150,000 × 0.000417 = 62.5 tons CO₂
```

### Data Ingestion Example

```bash
curl -X POST http://localhost:8000/api/v1/ingest/energy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "uuid",
    "data_points": [
      {
        "timestamp": "2024-01-15T08:00:00Z",
        "meter_id": "METER-MAIN-01",
        "kwh_consumed": 125.5,
        "tariff_rate": 0.15,
        "period_type": "peak",
        "solar_generation_kwh": 20.3,
        "load_shedding_event": false,
        "power_factor": 0.95,
        "demand_kw": 225.0
      },
      {
        "timestamp": "2024-01-15T09:00:00Z",
        "meter_id": "METER-MAIN-01",
        "kwh_consumed": 118.2,
        "tariff_rate": 0.15,
        "period_type": "peak",
        "solar_generation_kwh": 25.8,
        "load_shedding_event": false,
        "power_factor": 0.94,
        "demand_kw": 210.0
      }
    ]
  }'
```

### Typical Use Cases

1. **Energy Cost Optimization**: Identify opportunities to shift load to off-peak hours
2. **Demand Management**: Reduce peak demand to lower utility charges
3. **Solar ROI Analysis**: Calculate payback period for solar installations
4. **Energy Forecasting**: Predict future consumption and costs
5. **Carbon Reporting**: Track and report greenhouse gas emissions
6. **Power Quality Monitoring**: Detect power factor issues and voltage anomalies
7. **Load Shedding Preparedness**: Plan for scheduled outages

### Recommendations Catalog

**Category: Cost Reduction**
- "Shift 30% of load to off-peak hours to save $2,500/month"
- "Install battery storage to reduce peak demand charges by 15%"
- "Improve power factor to 0.98 (currently 0.88) to avoid penalties"

**Category: Efficiency**
- "Replace HVAC system - energy intensity 25% above benchmark"
- "LED lighting upgrade could reduce consumption by 8%"

**Category: Renewable Energy**
- "Expand solar capacity by 50 kW - ROI in 4.2 years"
- "Consider wind power - site has excellent wind resource"

**Category: Sustainability**
- "Current emissions: 150 tons CO₂/year. Solar expansion reduces by 45 tons"
- "Switch to green energy tariff for remaining 60% of consumption"

---

## Retail Vertical

Store operations and inventory monitoring for retail chains.

### Data Schema

**Table**: `retail_data`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `time` | DATE | Date of measurement | 2024-01-15 |
| `site_id` | UUID | Site identifier (FK) | uuid |
| `store_id` | STRING | Store identifier | "STORE-001" |
| `sku` | STRING | Product SKU | "SKU-12345" |
| `daily_sales_units` | INTEGER | Units sold | 45 |
| `daily_revenue` | FLOAT | Revenue generated | 2250.50 |
| `inventory_level` | INTEGER | Current stock level | 120 |
| `promo_active` | BOOLEAN | Promotion flag | true |
| `promo_discount_pct` | FLOAT | Discount percentage | 15.0 |
| `footfall_count` | INTEGER | Customer count | 450 |
| `weather_condition` | STRING | Weather description | "sunny" |

**Granularity**: Daily (one record per day per store per SKU)

**Primary Key**: (time, site_id, store_id, sku)

### KPI Formulas

#### Sales Velocity

Units sold per day (average).

**Formula**:
```
Sales Velocity = Total Units Sold / Number of Days
```

**Example**:
```
Units Sold: 1,200 units
Days: 30
Velocity = 1,200 / 30 = 40 units/day
```

#### Average Selling Price (ASP)

**Formula**:
```
ASP = Total Revenue / Total Units Sold
```

**Example**:
```
Revenue: $50,000
Units: 1,000
ASP = $50,000 / 1,000 = $50/unit
```

#### Gross Margin Percentage

**Formula**:
```
Margin (%) = ((Revenue - Cost) / Revenue) × 100
```

**Example**:
```
Revenue: $100,000
Cost of Goods Sold (COGS): $65,000
Margin = ((100,000 - 65,000) / 100,000) × 100 = 35%
```

#### Inventory Turnover

How many times inventory is sold and replaced.

**Formula**:
```
Inventory Turnover = COGS / Average Inventory Value
```

**Example**:
```
COGS: $500,000/year
Average Inventory: $125,000
Turnover = 500,000 / 125,000 = 4 times/year
```

**Interpretation**: Higher is generally better (less capital tied up).

**Industry Benchmarks**:
- Grocery: 10-20
- Fashion: 4-6
- Electronics: 6-8

#### Days Sales of Inventory (DSI)

How many days it takes to sell inventory.

**Formula**:
```
DSI = 365 / Inventory Turnover
```

**Example**:
```
Inventory Turnover: 4
DSI = 365 / 4 = 91.25 days
```

#### Stockout Rate

Percentage of time product is out of stock.

**Formula**:
```
Stockout Rate (%) = (Days Out of Stock / Total Days) × 100
```

**Example**:
```
Days OOS: 5
Total Days: 30
Stockout Rate = (5 / 30) × 100 = 16.7%
```

**Target**: < 5% for key SKUs.

#### Promotion Effectiveness

Sales lift from promotions.

**Formula**:
```
Promo Effectiveness = Promo Sales / Baseline Sales
```

**Example**:
```
Baseline Sales (no promo): 40 units/day
Promo Sales: 75 units/day
Effectiveness = 75 / 40 = 1.875 = 87.5% lift
```

**ROI Calculation**:
```
ROI = (Additional Revenue - Promo Cost) / Promo Cost
```

#### Conversion Rate

Percentage of visitors who make a purchase.

**Formula**:
```
Conversion Rate (%) = (Transactions / Footfall) × 100
```

**Example**:
```
Transactions: 120
Footfall: 1,500
Conversion = (120 / 1,500) × 100 = 8%
```

**Industry Average**: 2-5% for retail stores.

#### Average Transaction Value (ATV)

**Formula**:
```
ATV = Total Revenue / Number of Transactions
```

#### Sales per Square Foot

Productivity metric for retail space.

**Formula**:
```
Sales per Sq Ft = Annual Revenue / Store Square Footage
```

**Example**:
```
Revenue: $2,000,000
Store Size: 5,000 sq ft
Sales/Sq Ft = $2,000,000 / 5,000 = $400/sq ft
```

**Industry Benchmarks**:
- Luxury Retail: $1,000+
- Department Stores: $200-400
- Grocery: $500-600

### Data Ingestion Example

```bash
curl -X POST http://localhost:8000/api/v1/ingest/retail \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
      },
      {
        "timestamp": "2024-01-15T00:00:00Z",
        "store_id": "STORE-001",
        "sku": "SKU-67890",
        "daily_sales_units": 28,
        "daily_revenue": 1400.00,
        "inventory_level": 85,
        "promo_active": false,
        "promo_discount_pct": null,
        "footfall_count": 450,
        "weather_condition": "sunny"
      }
    ]
  }'
```

### Typical Use Cases

1. **Demand Forecasting**: Predict future sales for inventory planning
2. **Inventory Optimization**: Balance stock levels to minimize stockouts and overstock
3. **Promotion Planning**: Optimize discount levels and timing
4. **Assortment Optimization**: Identify slow-moving SKUs to discontinue
5. **Price Optimization**: Dynamic pricing based on demand elasticity
6. **Store Performance**: Compare stores and identify best practices
7. **Weather Impact Analysis**: Correlate sales with weather conditions
8. **Seasonal Analysis**: Identify seasonal patterns and plan accordingly

### Recommendations Catalog

**Category: Inventory**
- "SKU-12345 stockout risk in 3 days - increase order quantity by 50%"
- "SKU-67890 has 120 days of inventory - consider markdown to clear"
- "Reorder point for SKU-11111 should be increased from 50 to 75 units"

**Category: Pricing**
- "SKU-22222 has elastic demand - 5% price reduction could increase revenue by 12%"
- "Competitor pricing for SKU-33333 is 8% lower - recommend matching"

**Category: Promotions**
- "Last promotion for SKU-44444 had 2.1x lift - repeat quarterly"
- "Bundle SKU-55555 with SKU-66666 - frequently purchased together"
- "Current 20% discount on SKU-77777 is excessive - 15% achieves same lift"

**Category: Assortment**
- "SKU-88888 has only 2 sales/month - consider discontinuing"
- "Category 'Electronics' sales up 25% - expand shelf space"

**Category: Store Operations**
- "STORE-002 conversion rate 3.2% vs. chain average 5.8% - investigate"
- "Footfall peaks 2-4 PM - optimize staffing schedule"

**Category: Seasonal**
- "Back-to-school inventory should arrive by July 15 based on historical patterns"
- "Holiday season forecast: 35% increase vs. Q3 - stock up on top 50 SKUs"

---

## Cross-Vertical Features

### Anomaly Detection

All verticals support real-time anomaly detection using Isolation Forest algorithm.

**Detected Anomalies**:
- Manufacturing: Sudden throughput drops, quality dips, unusual downtime
- Energy: Consumption spikes, power factor issues, unexpected demand
- Retail: Sales outliers, inventory discrepancies, conversion rate changes

**API**: `GET /api/v1/anomalies?site_id={uuid}&start_date={date}`

### Forecasting

All verticals support time-series forecasting with Prophet and ARIMA models.

**Forecast Types**:
- Manufacturing: Throughput, OEE, defect rates
- Energy: Consumption, peak demand, costs
- Retail: Sales, inventory turnover, footfall

**API**: `POST /api/v1/forecasts/train` → `GET /api/v1/forecasts/{id}`

### Simulations

What-if scenario analysis for all verticals.

**Simulation Examples**:
- Manufacturing: "What if we increase line speed by 10%?"
- Energy: "What if we install 100 kW solar?"
- Retail: "What if we run a 15% promotion?"

**API**: `POST /api/v1/simulations`

## See Also

- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](API.md)
- [Data Models](DATA_MODELS.md)
- [Development Guide](DEVELOPMENT.md)
