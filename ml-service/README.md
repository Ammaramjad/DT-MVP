# ML Service - AI Digital Twin Platform

Comprehensive machine learning service providing time series forecasting, anomaly detection, and what-if simulation capabilities for the AI Digital Twin SaaS Platform.

## Features

### 🔮 Time Series Forecasting
- **Prophet**: Facebook Prophet for robust time series forecasting with automatic seasonality detection
- **ARIMA**: Statistical ARIMA models as fallback with automatic order selection
- Handles holidays, special events, and multiple seasonalities
- Provides confidence intervals for predictions
- Supports multiple vertical types (manufacturing, retail, healthcare, etc.)

### 🚨 Anomaly Detection
- **Isolation Forest**: Real-time anomaly detection using scikit-learn
- Configurable sensitivity levels (low, medium, high)
- Alert threshold calculation
- Severity scoring (low, medium, high, critical)
- Feature importance analysis

### 🎮 What-If Simulation
- **ElasticNet Regression**: Simulate outcomes with variable overrides
- Sensitivity analysis for individual features
- Confidence scoring based on data quality
- Feature importance ranking
- Support for multiple scenarios

## Architecture

```
ml-service/
├── app/
│   ├── config.py              # Service configuration
│   ├── main.py                # FastAPI application
│   ├── models/
│   │   ├── forecasting.py     # Prophet & ARIMA models
│   │   ├── anomaly.py         # Isolation Forest detector
│   │   └── simulation.py      # ElasticNet simulator
│   ├── api/
│   │   ├── forecast.py        # Forecast endpoints
│   │   ├── anomaly.py         # Anomaly detection endpoints
│   │   └── simulation.py      # Simulation endpoints
│   ├── services/
│   │   ├── model_service.py   # Model persistence & versioning
│   │   └── training_service.py # Training orchestration
│   └── utils/
│       ├── preprocessing.py   # Data preprocessing utilities
│       └── evaluation.py      # Model evaluation metrics
├── tests/
│   └── test_service.py        # Service tests
├── requirements.txt           # Python dependencies
└── Dockerfile                 # Docker configuration
```

## Installation

### Prerequisites
- Python 3.11+
- pip

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Dependencies
- **prophet**: Time series forecasting
- **scikit-learn**: Machine learning algorithms
- **pandas & numpy**: Data manipulation
- **statsmodels**: Statistical models
- **fastapi & uvicorn**: REST API framework
- **structlog**: Structured logging
- **joblib**: Model serialization

## Configuration

Configuration is managed via environment variables or `.env` file:

```bash
# Service Configuration
ENVIRONMENT=development
DEBUG=False
HOST=0.0.0.0
PORT=8001

# Model Storage
MODEL_STORAGE_PATH=/tmp/ml-models
MODEL_MAX_VERSIONS=5

# Prophet Settings
PROPHET_CHANGEPOINT_PRIOR_SCALE=0.05
PROPHET_SEASONALITY_PRIOR_SCALE=10.0
PROPHET_SEASONALITY_MODE=multiplicative
PROPHET_INTERVAL_WIDTH=0.95

# ARIMA Settings
ARIMA_MAX_P=5
ARIMA_MAX_D=2
ARIMA_MAX_Q=5
ARIMA_SEASONAL=True

# Anomaly Detection
ISOLATION_FOREST_CONTAMINATION=0.1
ISOLATION_FOREST_N_ESTIMATORS=100
ANOMALY_ALERT_THRESHOLD=-0.5

# Simulation
SIMULATION_ALPHA=0.5
SIMULATION_L1_RATIO=0.5
SIMULATION_MAX_ITER=1000

# Data Processing
MIN_TRAINING_SAMPLES=100
MISSING_VALUE_STRATEGY=interpolate
OUTLIER_STD_THRESHOLD=3.0

# Logging
LOG_LEVEL=INFO
LOG_JSON=True
```

## Running the Service

### Development

```bash
# Run with auto-reload
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Or:

```bash
python app/main.py
```

### Production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
```

### Docker

```bash
# Build image
docker build -t ml-service .

# Run container
docker run -p 8001:8001 -v /path/to/models:/tmp/ml-models ml-service
```

## API Documentation

Once running, access:
- **Swagger UI**: http://localhost:8001/api/v1/docs
- **ReDoc**: http://localhost:8001/api/v1/redoc
- **Health Check**: http://localhost:8001/health

### Forecasting Endpoints

#### POST `/api/v1/forecast/train`
Train a forecast model with historical data.

```json
{
  "site_id": "site_001",
  "metric_name": "energy_consumption",
  "data": [
    {"timestamp": "2024-01-01T00:00:00Z", "value": 100.5},
    {"timestamp": "2024-01-01T01:00:00Z", "value": 95.2}
  ],
  "model_type": "prophet",
  "vertical_type": "manufacturing"
}
```

#### POST `/api/v1/forecast/predict`
Generate forecast predictions.

```json
{
  "model_id": "site_001_energy_consumption_prophet_abc123",
  "periods": 24,
  "frequency": "H",
  "include_history": false
}
```

#### GET `/api/v1/forecast/metrics/{model_id}`
Get model performance metrics.

### Anomaly Detection Endpoints

#### POST `/api/v1/anomaly/train`
Train anomaly detection model.

```json
{
  "site_id": "site_001",
  "data": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "features": {
        "temperature": 25.5,
        "humidity": 60.0,
        "pressure": 1013.25
      }
    }
  ],
  "features": ["temperature", "humidity", "pressure"],
  "sensitivity": "medium"
}
```

#### POST `/api/v1/anomaly/detect`
Detect anomalies in real-time data.

```json
{
  "model_id": "site_001_anomaly_abc123",
  "data": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "features": {
        "temperature": 35.0,
        "humidity": 45.0,
        "pressure": 1015.0
      }
    }
  ],
  "return_scores": true
}
```

#### GET `/api/v1/anomaly/scores/{site_id}`
Get anomaly score history.

### Simulation Endpoints

#### POST `/api/v1/simulation/train`
Train simulation model.

```json
{
  "site_id": "site_001",
  "data": [
    {
      "features": {
        "temperature": 25.0,
        "production_rate": 100.0
      },
      "target": 500.0
    }
  ],
  "features": ["temperature", "production_rate"],
  "target": "energy_consumption"
}
```

#### POST `/api/v1/simulation/run`
Run simulation with overrides.

```json
{
  "model_id": "site_001_simulation_energy_abc123",
  "overrides": {
    "temperature": 28.0,
    "production_rate": 120.0
  },
  "num_scenarios": 5
}
```

#### POST `/api/v1/simulation/sensitivity`
Perform sensitivity analysis.

```json
{
  "model_id": "site_001_simulation_energy_abc123",
  "feature": "temperature",
  "min_value": 20.0,
  "max_value": 30.0,
  "num_points": 10
}
```

## Model Management

### Model Storage
Models are stored in the configured `MODEL_STORAGE_PATH` directory, organized by type:
- `/forecast/` - Forecast models
- `/anomaly/` - Anomaly detection models
- `/simulation/` - Simulation models

### Model Versioning
- Automatically maintains up to `MODEL_MAX_VERSIONS` versions per site
- Old versions are automatically deleted when limit is exceeded
- Models are identified by: `{site_id}_{metric}_{type}_{hash}`

### Model Metadata
Each model has associated metadata stored as JSON:
- Training timestamp and duration
- Data characteristics
- Performance metrics
- Configuration parameters
- Feature importance

## Data Preprocessing

### Time Series
- Automatic resampling to target frequency
- Missing value imputation (interpolate, forward/backward fill, mean)
- Outlier detection and removal (z-score method)
- Seasonality detection

### Feature Engineering
- Time-based features (hour, day, month, etc.)
- Cyclical encoding for periodic features
- Lag features
- Rolling window statistics

## Model Evaluation

### Metrics
- **MAE**: Mean Absolute Error
- **RMSE**: Root Mean Squared Error
- **MAPE**: Mean Absolute Percentage Error
- **R²**: Coefficient of Determination
- **Coverage**: Confidence interval coverage
- **SMAPE**: Symmetric MAPE

### Cross-Validation
- Time series cross-validation
- Multiple split evaluation
- Aggregated metrics with confidence intervals

## Error Handling

All endpoints include comprehensive error handling:
- **400 Bad Request**: Invalid input data or parameters
- **404 Not Found**: Model not found
- **500 Internal Server Error**: Training/prediction failures

Errors are logged with structured logging for debugging.

## Logging

Structured logging using `structlog`:
- JSON format for production (machine-readable)
- Console format for development (human-readable)
- Configurable log levels
- Request/response tracking
- Performance metrics

## Testing

Run the test suite:

```bash
python tests/test_service.py
```

Expected output:
```
✅ All imports successful!
✅ Configuration loaded successfully!
✅ Model storage ready!
🎉 All tests passed! ML service is ready.
```

## Performance Considerations

### Training
- Prophet: ~5-30 seconds depending on data size
- ARIMA: ~10-60 seconds with auto order selection
- Isolation Forest: ~5-20 seconds
- ElasticNet: ~2-10 seconds

### Prediction
- Prophet: <1 second for typical forecasts
- ARIMA: <1 second
- Anomaly detection: <0.1 seconds per batch
- Simulation: <0.5 seconds per scenario

### Optimization
- Use model caching for frequent predictions
- Batch predictions when possible
- Configure appropriate n_estimators for speed/accuracy tradeoff
- Use async endpoints for concurrent requests

## Vertical-Specific Customizations

The ML service supports vertical-specific customizations:

### Manufacturing
- Production rate forecasting
- Equipment anomaly detection
- Process optimization simulation

### Retail
- Sales forecasting with promotions
- Inventory anomaly detection
- Demand simulation

### Healthcare
- Patient flow forecasting
- Resource utilization anomalies
- Capacity planning simulation

### Energy
- Consumption forecasting
- Grid anomaly detection
- Load balancing simulation

## Troubleshooting

### Prophet Installation Issues
If Prophet fails to install:
```bash
pip install prophet --no-build-isolation
```

### Model Storage Permissions
Ensure the storage directory has write permissions:
```bash
chmod 755 /tmp/ml-models
```

### Memory Issues
For large datasets, adjust:
- `TRAINING_BATCH_SIZE`
- `ISOLATION_FOREST_MAX_SAMPLES`
- Model caching strategy

## Contributing

When adding new features:
1. Follow existing code structure
2. Add comprehensive docstrings
3. Include error handling
4. Add logging statements
5. Update API documentation
6. Add tests

## License

Copyright © 2024 AI Digital Twin Platform. All rights reserved.
