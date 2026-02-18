"""
Mock responses from ML service for testing.
Provides predictable responses for forecast and anomaly detection endpoints.
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta
import random


class MockMLService:
    """Mock ML service for testing without real ML service dependency."""
    
    @staticmethod
    def mock_forecast_response(
        site_id: str,
        metric: str,
        horizon_days: int = 7,
        confidence: float = 0.85
    ) -> Dict[str, Any]:
        """
        Generate a mock forecast response.
        
        Args:
            site_id: Site identifier
            metric: Metric name being forecasted
            horizon_days: Number of days to forecast
            confidence: Base confidence level
            
        Returns:
            Mock forecast response dictionary
        """
        base_value = 100.0
        predictions = []
        
        for i in range(horizon_days * 24):  # Hourly predictions
            timestamp = datetime.utcnow() + timedelta(hours=i)
            # Add some realistic variation
            value = base_value + random.uniform(-10, 10) + (i * 0.1)
            conf = confidence - (i * 0.01)  # Decreasing confidence over time
            
            predictions.append({
                "timestamp": timestamp.isoformat() + "Z",
                "value": round(value, 2),
                "confidence": max(0.5, round(conf, 2)),
                "lower_bound": round(value * 0.9, 2),
                "upper_bound": round(value * 1.1, 2)
            })
        
        return {
            "forecast_id": f"forecast-{site_id}-{metric}",
            "site_id": site_id,
            "metric": metric,
            "model": "prophet",
            "predictions": predictions,
            "metadata": {
                "training_samples": 1000,
                "model_version": "1.0.0",
                "created_at": datetime.utcnow().isoformat() + "Z"
            },
            "metrics": {
                "mae": round(random.uniform(3, 8), 2),
                "rmse": round(random.uniform(5, 12), 2),
                "mape": round(random.uniform(2, 6), 2),
                "r2_score": round(random.uniform(0.85, 0.95), 3)
            }
        }
    
    @staticmethod
    def mock_anomaly_response(
        site_id: str,
        metric: str,
        has_anomalies: bool = True,
        anomaly_count: int = 3
    ) -> Dict[str, Any]:
        """
        Generate a mock anomaly detection response.
        
        Args:
            site_id: Site identifier
            metric: Metric name being analyzed
            has_anomalies: Whether to include anomalies
            anomaly_count: Number of anomalies to generate
            
        Returns:
            Mock anomaly detection response
        """
        anomalies = []
        
        if has_anomalies:
            severities = ["low", "medium", "high", "critical"]
            for i in range(anomaly_count):
                timestamp = datetime.utcnow() - timedelta(hours=i * 4)
                value = 100 + random.uniform(20, 50)
                expected = 100 + random.uniform(-5, 5)
                
                anomalies.append({
                    "timestamp": timestamp.isoformat() + "Z",
                    "metric": metric,
                    "value": round(value, 2),
                    "expected": round(expected, 2),
                    "deviation": round(abs(value - expected), 2),
                    "severity": random.choice(severities),
                    "confidence": round(random.uniform(0.8, 0.98), 2),
                    "description": f"Unusual {metric} detected"
                })
        
        return {
            "site_id": site_id,
            "metric": metric,
            "model": "isolation_forest",
            "anomalies": anomalies,
            "summary": {
                "total_anomalies": len(anomalies),
                "critical_count": sum(1 for a in anomalies if a["severity"] == "critical"),
                "high_count": sum(1 for a in anomalies if a["severity"] == "high"),
                "medium_count": sum(1 for a in anomalies if a["severity"] == "medium"),
                "low_count": sum(1 for a in anomalies if a["severity"] == "low")
            },
            "analyzed_period": {
                "start": (datetime.utcnow() - timedelta(days=7)).isoformat() + "Z",
                "end": datetime.utcnow().isoformat() + "Z"
            }
        }
    
    @staticmethod
    def mock_training_response(
        model_type: str,
        vertical: str,
        success: bool = True
    ) -> Dict[str, Any]:
        """
        Generate a mock model training response.
        
        Args:
            model_type: Type of model being trained
            vertical: Industry vertical
            success: Whether training succeeded
            
        Returns:
            Mock training response
        """
        if success:
            return {
                "model_id": f"model-{model_type}-{vertical}",
                "model_type": model_type,
                "vertical": vertical,
                "status": "completed",
                "metrics": {
                    "accuracy": round(random.uniform(0.85, 0.95), 3),
                    "precision": round(random.uniform(0.80, 0.92), 3),
                    "recall": round(random.uniform(0.82, 0.94), 3),
                    "f1_score": round(random.uniform(0.83, 0.93), 3)
                },
                "training_duration_seconds": random.randint(60, 300),
                "created_at": datetime.utcnow().isoformat() + "Z"
            }
        else:
            return {
                "model_id": f"model-{model_type}-{vertical}",
                "status": "failed",
                "error": "Insufficient training data",
                "created_at": datetime.utcnow().isoformat() + "Z"
            }
    
    @staticmethod
    def mock_prediction_response(
        input_data: Dict[str, Any],
        prediction_type: str = "classification"
    ) -> Dict[str, Any]:
        """
        Generate a mock prediction response.
        
        Args:
            input_data: Input data for prediction
            prediction_type: Type of prediction (classification/regression)
            
        Returns:
            Mock prediction response
        """
        if prediction_type == "classification":
            classes = ["normal", "warning", "critical"]
            predicted_class = random.choice(classes)
            
            return {
                "prediction": predicted_class,
                "confidence": round(random.uniform(0.7, 0.98), 2),
                "probabilities": {
                    cls: round(random.uniform(0.1, 0.9), 2) 
                    for cls in classes
                },
                "features_importance": {
                    key: round(random.uniform(0.1, 0.9), 2)
                    for key in list(input_data.keys())[:5]
                }
            }
        else:  # regression
            return {
                "prediction": round(random.uniform(50, 150), 2),
                "confidence_interval": {
                    "lower": round(random.uniform(40, 60), 2),
                    "upper": round(random.uniform(140, 160), 2)
                },
                "confidence": round(random.uniform(0.8, 0.95), 2)
            }


def get_mock_forecast(
    site_id: str,
    metric: str = "production_count",
    horizon_days: int = 7
) -> Dict[str, Any]:
    """Helper function to get mock forecast."""
    return MockMLService.mock_forecast_response(site_id, metric, horizon_days)


def get_mock_anomalies(
    site_id: str,
    metric: str = "temperature",
    has_anomalies: bool = True
) -> Dict[str, Any]:
    """Helper function to get mock anomalies."""
    return MockMLService.mock_anomaly_response(site_id, metric, has_anomalies)


def get_mock_training_result(
    model_type: str = "forecast",
    vertical: str = "manufacturing"
) -> Dict[str, Any]:
    """Helper function to get mock training result."""
    return MockMLService.mock_training_response(model_type, vertical)


# Pytest fixtures can use these functions
def pytest_mock_ml_service(monkeypatch):
    """
    Monkeypatch helper for mocking ML service HTTP calls.
    
    Usage in tests:
        def test_with_ml_mock(monkeypatch):
            pytest_mock_ml_service(monkeypatch)
            # Your test code here
    """
    import httpx
    
    async def mock_post(*args, **kwargs):
        """Mock httpx.AsyncClient.post"""
        url = args[0] if args else kwargs.get("url", "")
        
        if "forecast" in url:
            return MockResponse(
                200,
                MockMLService.mock_forecast_response("site-123", "production_count")
            )
        elif "anomaly" in url:
            return MockResponse(
                200,
                MockMLService.mock_anomaly_response("site-123", "temperature")
            )
        else:
            return MockResponse(404, {"error": "Not found"})
    
    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)


class MockResponse:
    """Mock HTTP response for testing."""
    
    def __init__(self, status_code: int, json_data: Dict[str, Any]):
        self.status_code = status_code
        self._json_data = json_data
    
    def json(self):
        return self._json_data
    
    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")
