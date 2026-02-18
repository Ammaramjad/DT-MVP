"""
Training Orchestration Service

Coordinates model training workflows, handles failures, and tracks metrics.
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, Tuple, List
import pandas as pd
import structlog

from app.config import settings
from app.models.forecasting import ProphetForecaster, ARIMAForecaster
from app.models.anomaly import IsolationForestDetector
from app.models.simulation import ElasticNetSimulator
from app.services.model_service import save_model


logger = structlog.get_logger()


async def train_forecast_model(
    site_id: str,
    metric_name: str,
    data: pd.DataFrame,
    model_type: str = "prophet",
    holidays: Optional[pd.DataFrame] = None,
    seasonality_mode: Optional[str] = None,
    vertical_type: Optional[str] = None,
) -> Tuple[str, Dict[str, Any]]:
    """
    Train a forecast model with error handling.
    
    Args:
        site_id: Site identifier
        metric_name: Metric to forecast
        data: Historical time series data
        model_type: Model type ('prophet' or 'arima')
        holidays: Optional holiday events
        seasonality_mode: Optional seasonality mode
        vertical_type: Optional vertical type
        
    Returns:
        Tuple of (model_id, training_metadata)
    """
    model_id = f"{site_id}_{metric_name}_{model_type}_{uuid.uuid4().hex[:8]}"
    
    logger.info(
        "starting_forecast_training",
        model_id=model_id,
        site_id=site_id,
        metric_name=metric_name,
        model_type=model_type,
    )
    
    try:
        # Train based on model type
        if model_type.lower() == "prophet":
            # Try Prophet first
            try:
                forecaster = ProphetForecaster(
                    seasonality_mode=seasonality_mode,
                )
                
                training_metadata = forecaster.train(
                    data=data,
                    holidays=holidays,
                )
                
                logger.info("prophet_training_successful", model_id=model_id)
                
            except Exception as e:
                logger.warning(
                    "prophet_training_failed_fallback_to_arima",
                    model_id=model_id,
                    error=str(e),
                )
                
                # Fallback to ARIMA
                forecaster = ARIMAForecaster()
                training_metadata = forecaster.train(data=data)
                model_type = "arima"
                
        elif model_type.lower() == "arima":
            forecaster = ARIMAForecaster()
            training_metadata = forecaster.train(data=data)
            
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
        
        # Save model
        training_metadata.update({
            "site_id": site_id,
            "metric_name": metric_name,
            "model_type": model_type,
            "vertical_type": vertical_type,
        })
        
        success = save_model(
            model=forecaster,
            model_id=model_id,
            model_type="forecast",
            metadata=training_metadata,
            site_id=site_id,
            metric_name=metric_name,
        )
        
        if not success:
            raise RuntimeError("Failed to save model")
        
        logger.info(
            "forecast_training_completed",
            model_id=model_id,
            training_time=training_metadata.get("training_time_seconds"),
        )
        
        return model_id, training_metadata
        
    except Exception as e:
        logger.error(
            "forecast_training_failed",
            model_id=model_id,
            error=str(e),
            error_type=type(e).__name__,
        )
        raise


async def train_anomaly_model(
    site_id: str,
    data: pd.DataFrame,
    features: List[str],
    sensitivity: str = "medium",
    vertical_type: Optional[str] = None,
) -> Tuple[str, Dict[str, Any]]:
    """
    Train an anomaly detection model with error handling.
    
    Args:
        site_id: Site identifier
        data: Historical data
        features: Feature names to use
        sensitivity: Detection sensitivity
        vertical_type: Optional vertical type
        
    Returns:
        Tuple of (model_id, training_metadata)
    """
    model_id = f"{site_id}_anomaly_{uuid.uuid4().hex[:8]}"
    
    logger.info(
        "starting_anomaly_training",
        model_id=model_id,
        site_id=site_id,
        features=features,
        sensitivity=sensitivity,
    )
    
    try:
        # Create detector
        detector = IsolationForestDetector()
        
        # Train model
        training_metadata = detector.train(
            data=data,
            features=features,
            sensitivity=sensitivity,
        )
        
        # Save model
        training_metadata.update({
            "site_id": site_id,
            "vertical_type": vertical_type,
        })
        
        success = save_model(
            model=detector,
            model_id=model_id,
            model_type="anomaly",
            metadata=training_metadata,
            site_id=site_id,
        )
        
        if not success:
            raise RuntimeError("Failed to save model")
        
        logger.info(
            "anomaly_training_completed",
            model_id=model_id,
            training_time=training_metadata.get("training_time_seconds"),
        )
        
        return model_id, training_metadata
        
    except Exception as e:
        logger.error(
            "anomaly_training_failed",
            model_id=model_id,
            error=str(e),
            error_type=type(e).__name__,
        )
        raise


async def train_simulation_model(
    site_id: str,
    data: pd.DataFrame,
    features: List[str],
    target: str,
    vertical_type: Optional[str] = None,
) -> Tuple[str, Dict[str, Any]]:
    """
    Train a simulation model with error handling.
    
    Args:
        site_id: Site identifier
        data: Historical data
        features: Feature names (controllable variables)
        target: Target variable name
        vertical_type: Optional vertical type
        
    Returns:
        Tuple of (model_id, training_metadata)
    """
    model_id = f"{site_id}_simulation_{target}_{uuid.uuid4().hex[:8]}"
    
    logger.info(
        "starting_simulation_training",
        model_id=model_id,
        site_id=site_id,
        features=features,
        target=target,
    )
    
    try:
        # Create simulator
        simulator = ElasticNetSimulator()
        
        # Train model
        training_metadata = simulator.train(
            data=data,
            features=features,
            target=target,
            vertical_type=vertical_type,
        )
        
        # Save model
        training_metadata.update({
            "site_id": site_id,
        })
        
        success = save_model(
            model=simulator,
            model_id=model_id,
            model_type="simulation",
            metadata=training_metadata,
            site_id=site_id,
            metric_name=target,
        )
        
        if not success:
            raise RuntimeError("Failed to save model")
        
        logger.info(
            "simulation_training_completed",
            model_id=model_id,
            training_time=training_metadata.get("training_time_seconds"),
            r2_score=training_metadata.get("performance", {}).get("train_r2"),
        )
        
        return model_id, training_metadata
        
    except Exception as e:
        logger.error(
            "simulation_training_failed",
            model_id=model_id,
            error=str(e),
            error_type=type(e).__name__,
        )
        raise


async def retrain_model(
    model_id: str,
    data: pd.DataFrame,
    **kwargs,
) -> Tuple[str, Dict[str, Any]]:
    """
    Retrain an existing model with new data.
    
    Args:
        model_id: Existing model identifier
        data: New training data
        **kwargs: Additional training parameters
        
    Returns:
        Tuple of (new_model_id, training_metadata)
    """
    logger.info("retraining_model", model_id=model_id)
    
    try:
        from app.services.model_service import get_model_metadata
        
        # Get existing model metadata
        metadata = get_model_metadata(model_id)
        
        if metadata is None:
            raise ValueError(f"Model not found: {model_id}")
        
        model_type = metadata.get("model_type")
        site_id = metadata.get("site_id")
        
        # Retrain based on model type
        if model_type == "forecast":
            new_model_id, training_metadata = await train_forecast_model(
                site_id=site_id,
                metric_name=metadata.get("metric_name", "unknown"),
                data=data,
                model_type=metadata.get("model_type", "prophet"),
                vertical_type=metadata.get("vertical_type"),
                **kwargs,
            )
            
        elif model_type == "anomaly":
            new_model_id, training_metadata = await train_anomaly_model(
                site_id=site_id,
                data=data,
                features=metadata.get("features", []),
                sensitivity=metadata.get("sensitivity", "medium"),
                vertical_type=metadata.get("vertical_type"),
                **kwargs,
            )
            
        elif model_type == "simulation":
            new_model_id, training_metadata = await train_simulation_model(
                site_id=site_id,
                data=data,
                features=metadata.get("features", []),
                target=metadata.get("target", ""),
                vertical_type=metadata.get("vertical_type"),
                **kwargs,
            )
            
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
        
        logger.info(
            "model_retrained",
            old_model_id=model_id,
            new_model_id=new_model_id,
        )
        
        return new_model_id, training_metadata
        
    except Exception as e:
        logger.error(
            "model_retraining_failed",
            model_id=model_id,
            error=str(e),
        )
        raise


def validate_training_data(
    data: pd.DataFrame,
    required_columns: List[str],
    min_samples: Optional[int] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Validate training data before model training.
    
    Args:
        data: Training data
        required_columns: Required column names
        min_samples: Minimum number of samples
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check if DataFrame is empty
    if data.empty:
        return False, "Training data is empty"
    
    # Check required columns
    missing_columns = [col for col in required_columns if col not in data.columns]
    if missing_columns:
        return False, f"Missing required columns: {missing_columns}"
    
    # Check minimum samples
    min_samples = min_samples or settings.min_training_samples
    if len(data) < min_samples:
        return False, f"Insufficient samples: {len(data)} < {min_samples}"
    
    # Check for all NaN columns
    for col in required_columns:
        if data[col].isna().all():
            return False, f"Column '{col}' contains only NaN values"
    
    return True, None


def get_training_recommendations(
    data: pd.DataFrame,
    model_type: str,
) -> Dict[str, Any]:
    """
    Get recommendations for training parameters based on data characteristics.
    
    Args:
        data: Training data
        model_type: Model type
        
    Returns:
        Dictionary with recommended parameters
    """
    recommendations = {
        "model_type": model_type,
        "data_characteristics": {},
        "recommended_params": {},
    }
    
    # Analyze data characteristics
    recommendations["data_characteristics"] = {
        "num_samples": len(data),
        "num_features": len(data.columns),
        "missing_ratio": float(data.isna().sum().sum() / (len(data) * len(data.columns))),
    }
    
    # Model-specific recommendations
    if model_type == "forecast":
        # Check time series characteristics
        if 'ds' in data.columns and 'y' in data.columns:
            time_range = (data['ds'].max() - data['ds'].min()).days
            recommendations["data_characteristics"]["time_range_days"] = time_range
            
            # Recommend seasonality settings
            if time_range >= 365:
                recommendations["recommended_params"]["yearly_seasonality"] = True
            if time_range >= 14:
                recommendations["recommended_params"]["weekly_seasonality"] = True
                
    elif model_type == "anomaly":
        # Recommend contamination based on data
        recommendations["recommended_params"]["contamination"] = 0.1
        recommendations["recommended_params"]["sensitivity"] = "medium"
        
    elif model_type == "simulation":
        # Recommend regularization based on features
        num_features = recommendations["data_characteristics"]["num_features"]
        if num_features > 10:
            recommendations["recommended_params"]["alpha"] = 1.0
        else:
            recommendations["recommended_params"]["alpha"] = 0.5
    
    return recommendations
