"""
Forecast API Endpoints

Provides REST API for time series forecasting with Prophet and ARIMA models.
"""
from datetime import datetime
from typing import List, Optional
import pandas as pd
import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.models.forecasting import ProphetForecaster, ARIMAForecaster
from app.services.model_service import save_model, load_model, get_model_metadata
from app.services.training_service import train_forecast_model
from app.utils.preprocessing import preprocess_time_series
from app.utils.evaluation import evaluate_forecast


logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models
class DataPoint(BaseModel):
    """Single time series data point."""
    timestamp: str = Field(..., description="ISO format timestamp")
    value: float = Field(..., description="Observation value")


class TrainForecastRequest(BaseModel):
    """Request to train a forecast model."""
    site_id: str = Field(..., description="Site identifier")
    metric_name: str = Field(..., description="Metric to forecast")
    data: List[DataPoint] = Field(..., description="Historical time series data")
    model_type: str = Field(default="prophet", description="Model type: 'prophet' or 'arima'")
    holidays: Optional[List[dict]] = Field(default=None, description="Holiday events")
    seasonality_mode: Optional[str] = Field(default=None, description="Seasonality mode")
    vertical_type: Optional[str] = Field(default=None, description="Vertical type for customization")


class PredictForecastRequest(BaseModel):
    """Request to generate forecast predictions."""
    model_id: str = Field(..., description="Model identifier")
    periods: int = Field(..., description="Number of periods to forecast", gt=0, le=365)
    frequency: str = Field(default="H", description="Forecast frequency (H=hourly, D=daily)")
    include_history: bool = Field(default=False, description="Include historical fitted values")


class ForecastResponse(BaseModel):
    """Forecast prediction response."""
    model_id: str
    metric_name: str
    predictions: List[dict]
    metadata: dict


class TrainingResponse(BaseModel):
    """Model training response."""
    model_id: str
    status: str
    training_metadata: dict


class MetricsResponse(BaseModel):
    """Model metrics response."""
    model_id: str
    metrics: dict
    metadata: dict


@router.post("/train", status_code=status.HTTP_201_CREATED, response_model=TrainingResponse)
async def train_forecast(request: TrainForecastRequest):
    """
    Train a forecast model using Prophet or ARIMA.
    
    Trains a time series forecasting model on historical data with
    automatic seasonality detection and holiday handling.
    
    Args:
        request: Training request with data and configuration
        
    Returns:
        Training response with model ID and metadata
    """
    logger.info(
        "forecast_training_requested",
        site_id=request.site_id,
        metric=request.metric_name,
        model_type=request.model_type,
        data_points=len(request.data),
    )
    
    try:
        # Convert data to DataFrame
        df = pd.DataFrame([
            {
                'ds': pd.to_datetime(dp.timestamp),
                'y': dp.value,
            }
            for dp in request.data
        ])
        
        # Preprocess data
        df_processed = preprocess_time_series(
            df,
            resample_freq=None,  # Keep original frequency
            handle_missing=True,
            remove_outliers=True,
        )
        
        # Convert holidays if provided
        holidays_df = None
        if request.holidays:
            holidays_df = pd.DataFrame(request.holidays)
            if 'ds' in holidays_df.columns:
                holidays_df['ds'] = pd.to_datetime(holidays_df['ds'])
        
        # Train model using training service
        model_id, training_metadata = await train_forecast_model(
            site_id=request.site_id,
            metric_name=request.metric_name,
            data=df_processed,
            model_type=request.model_type,
            holidays=holidays_df,
            seasonality_mode=request.seasonality_mode,
            vertical_type=request.vertical_type,
        )
        
        logger.info(
            "forecast_model_trained",
            model_id=model_id,
            training_time=training_metadata.get("training_time_seconds"),
        )
        
        return TrainingResponse(
            model_id=model_id,
            status="trained",
            training_metadata=training_metadata,
        )
        
    except ValueError as e:
        logger.error("forecast_training_validation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error("forecast_training_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}",
        )


@router.post("/predict", response_model=ForecastResponse)
async def predict_forecast(request: PredictForecastRequest):
    """
    Generate forecast predictions using a trained model.
    
    Produces time series forecasts with confidence intervals for
    the specified number of periods.
    
    Args:
        request: Prediction request with model ID and parameters
        
    Returns:
        Forecast predictions with confidence intervals
    """
    logger.info(
        "forecast_prediction_requested",
        model_id=request.model_id,
        periods=request.periods,
        frequency=request.frequency,
    )
    
    try:
        # Load model
        model_data = load_model(request.model_id)
        
        if model_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {request.model_id}",
            )
        
        model = model_data['model']
        metadata = model_data['metadata']
        
        # Generate predictions
        if isinstance(model, ProphetForecaster):
            predictions_df = model.predict(
                periods=request.periods,
                frequency=request.frequency,
                include_history=request.include_history,
            )
        elif isinstance(model, ARIMAForecaster):
            predictions_df = model.predict(
                periods=request.periods,
            )
        else:
            raise ValueError(f"Unsupported model type: {type(model)}")
        
        # Convert to response format
        predictions = predictions_df.to_dict('records')
        
        # Convert timestamps to ISO format
        for pred in predictions:
            if 'ds' in pred and isinstance(pred['ds'], pd.Timestamp):
                pred['ds'] = pred['ds'].isoformat()
        
        logger.info(
            "forecast_prediction_generated",
            model_id=request.model_id,
            predictions=len(predictions),
        )
        
        return ForecastResponse(
            model_id=request.model_id,
            metric_name=metadata.get('metric_name', 'unknown'),
            predictions=predictions,
            metadata={
                'model_type': metadata.get('model_type', 'unknown'),
                'trained_at': metadata.get('trained_at'),
                'periods': request.periods,
                'frequency': request.frequency,
            },
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("forecast_prediction_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )


@router.get("/metrics/{model_id}", response_model=MetricsResponse)
async def get_model_metrics(model_id: str):
    """
    Get performance metrics for a trained forecast model.
    
    Returns evaluation metrics and model information.
    
    Args:
        model_id: Model identifier
        
    Returns:
        Model metrics and metadata
    """
    logger.info("forecast_metrics_requested", model_id=model_id)
    
    try:
        # Get model metadata
        metadata = get_model_metadata(model_id)
        
        if metadata is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {model_id}",
            )
        
        # Extract or calculate metrics
        metrics = {
            "training_metrics": {
                "data_points": metadata.get("data_points"),
                "training_time_seconds": metadata.get("training_time_seconds"),
                "data_start": metadata.get("data_start"),
                "data_end": metadata.get("data_end"),
            },
            "model_config": metadata.get("model_config", {}),
        }
        
        # Add model-specific metrics
        if "aic" in metadata:
            metrics["training_metrics"]["aic"] = metadata["aic"]
            metrics["training_metrics"]["bic"] = metadata["bic"]
        
        if "seasonalities" in metadata:
            metrics["seasonalities"] = metadata["seasonalities"]
        
        logger.info("forecast_metrics_retrieved", model_id=model_id)
        
        return MetricsResponse(
            model_id=model_id,
            metrics=metrics,
            metadata={
                "model_type": metadata.get("model_type"),
                "site_id": metadata.get("site_id"),
                "metric_name": metadata.get("metric_name"),
                "trained_at": metadata.get("trained_at"),
            },
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("forecast_metrics_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve metrics: {str(e)}",
        )


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_forecast_model(model_id: str):
    """
    Delete a trained forecast model.
    
    Args:
        model_id: Model identifier
    """
    logger.info("forecast_model_deletion_requested", model_id=model_id)
    
    try:
        from app.services.model_service import delete_model
        
        success = delete_model(model_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {model_id}",
            )
        
        logger.info("forecast_model_deleted", model_id=model_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("forecast_model_deletion_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete model: {str(e)}",
        )
