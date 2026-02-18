"""
Anomaly Detection API Endpoints

Provides REST API for real-time anomaly detection using Isolation Forest.
"""
from datetime import datetime
from typing import List, Optional
import pandas as pd
import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.models.anomaly import IsolationForestDetector
from app.services.model_service import save_model, load_model, get_model_metadata
from app.services.training_service import train_anomaly_model
from app.utils.preprocessing import prepare_features


logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models
class DataPoint(BaseModel):
    """Single data point with features."""
    timestamp: Optional[str] = Field(None, description="ISO format timestamp")
    features: dict = Field(..., description="Feature values")


class TrainAnomalyRequest(BaseModel):
    """Request to train an anomaly detection model."""
    site_id: str = Field(..., description="Site identifier")
    data: List[DataPoint] = Field(..., description="Historical data for training")
    features: List[str] = Field(..., description="Feature names to use")
    sensitivity: str = Field(default="medium", description="Detection sensitivity: low, medium, high")
    vertical_type: Optional[str] = Field(default=None, description="Vertical type for customization")


class DetectAnomalyRequest(BaseModel):
    """Request to detect anomalies in real-time data."""
    model_id: str = Field(..., description="Model identifier")
    data: List[DataPoint] = Field(..., description="Data points to check for anomalies")
    return_scores: bool = Field(default=True, description="Return detailed anomaly scores")


class AnomalyDetectionResponse(BaseModel):
    """Anomaly detection response."""
    model_id: str
    total_points: int
    anomalies_detected: int
    alerts: int
    results: List[dict]
    scores: Optional[List[dict]] = None


class TrainingResponse(BaseModel):
    """Training response."""
    model_id: str
    status: str
    training_metadata: dict


class ScoresResponse(BaseModel):
    """Anomaly scores response."""
    site_id: str
    model_id: str
    scores: List[dict]
    statistics: dict


@router.post("/detect", response_model=AnomalyDetectionResponse)
async def detect_anomalies(request: DetectAnomalyRequest):
    """
    Detect anomalies in real-time data.
    
    Analyzes data points using a trained anomaly detection model
    and returns anomaly flags, scores, and severity levels.
    
    Args:
        request: Detection request with model ID and data
        
    Returns:
        Anomaly detection results with scores and alerts
    """
    logger.info(
        "anomaly_detection_requested",
        model_id=request.model_id,
        data_points=len(request.data),
    )
    
    try:
        # Load model
        model_data = load_model(request.model_id)
        
        if model_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {request.model_id}",
            )
        
        detector: IsolationForestDetector = model_data['model']
        
        # Convert data to DataFrame
        features_list = []
        timestamps = []
        
        for dp in request.data:
            features_list.append(dp.features)
            timestamps.append(dp.timestamp)
        
        df = pd.DataFrame(features_list)
        if timestamps[0] is not None:
            df['timestamp'] = pd.to_datetime(timestamps)
        
        # Validate features
        missing_features = [f for f in detector.feature_names if f not in df.columns]
        if missing_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required features: {missing_features}",
            )
        
        # Detect anomalies
        results_df, scores_df = detector.detect(
            data=df,
            return_scores=request.return_scores,
        )
        
        # Convert results to response format
        results = results_df.to_dict('records')
        
        # Convert timestamps to ISO format
        for result in results:
            if 'timestamp' in result and isinstance(result['timestamp'], pd.Timestamp):
                result['timestamp'] = result['timestamp'].isoformat()
        
        # Count anomalies and alerts
        anomalies_detected = int(results_df['is_anomaly'].sum())
        alerts = int(results_df['alert'].sum())
        
        # Prepare scores if requested
        scores = None
        if request.return_scores and scores_df is not None:
            scores = scores_df.to_dict('records')
        
        logger.info(
            "anomalies_detected",
            model_id=request.model_id,
            total_points=len(results),
            anomalies=anomalies_detected,
            alerts=alerts,
        )
        
        return AnomalyDetectionResponse(
            model_id=request.model_id,
            total_points=len(results),
            anomalies_detected=anomalies_detected,
            alerts=alerts,
            results=results,
            scores=scores,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("anomaly_detection_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection failed: {str(e)}",
        )


@router.post("/train", status_code=status.HTTP_201_CREATED, response_model=TrainingResponse)
async def train_anomaly_detector(request: TrainAnomalyRequest):
    """
    Train an anomaly detection model.
    
    Trains an Isolation Forest model on historical data to learn
    normal patterns and detect anomalies.
    
    Args:
        request: Training request with data and configuration
        
    Returns:
        Training response with model ID and metadata
    """
    logger.info(
        "anomaly_training_requested",
        site_id=request.site_id,
        data_points=len(request.data),
        features=request.features,
        sensitivity=request.sensitivity,
    )
    
    try:
        # Validate sensitivity
        if request.sensitivity.lower() not in ['low', 'medium', 'high']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sensitivity must be 'low', 'medium', or 'high'",
            )
        
        # Convert data to DataFrame
        features_list = []
        timestamps = []
        
        for dp in request.data:
            features_list.append(dp.features)
            timestamps.append(dp.timestamp)
        
        df = pd.DataFrame(features_list)
        if timestamps[0] is not None:
            df['timestamp'] = pd.to_datetime(timestamps)
        
        # Validate features exist in data
        missing_features = [f for f in request.features if f not in df.columns]
        if missing_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Features not found in data: {missing_features}",
            )
        
        # Prepare features (handle missing values, etc.)
        df_processed = prepare_features(
            df,
            feature_names=request.features,
            handle_missing=True,
        )
        
        # Train model using training service
        model_id, training_metadata = await train_anomaly_model(
            site_id=request.site_id,
            data=df_processed,
            features=request.features,
            sensitivity=request.sensitivity,
            vertical_type=request.vertical_type,
        )
        
        logger.info(
            "anomaly_model_trained",
            model_id=model_id,
            training_time=training_metadata.get("training_time_seconds"),
            baseline_anomalies=training_metadata.get("baseline_stats", {}).get("anomalies_detected"),
        )
        
        return TrainingResponse(
            model_id=model_id,
            status="trained",
            training_metadata=training_metadata,
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error("anomaly_training_validation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error("anomaly_training_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}",
        )


@router.get("/scores/{site_id}", response_model=ScoresResponse)
async def get_anomaly_scores(
    site_id: str,
    model_id: Optional[str] = None,
    limit: int = 100,
):
    """
    Get recent anomaly scores for a site.
    
    Returns anomaly detection history and statistics.
    
    Args:
        site_id: Site identifier
        model_id: Optional model ID filter
        limit: Maximum number of scores to return
        
    Returns:
        Anomaly scores and statistics
    """
    logger.info(
        "anomaly_scores_requested",
        site_id=site_id,
        model_id=model_id,
        limit=limit,
    )
    
    try:
        # In a real implementation, this would query a database
        # For now, return metadata from the model
        
        # Find model for site
        if model_id is None:
            # Would query database for latest model
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="model_id is required",
            )
        
        metadata = get_model_metadata(model_id)
        
        if metadata is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {model_id}",
            )
        
        # Extract baseline statistics
        baseline_stats = metadata.get("baseline_stats", {})
        
        scores = []
        statistics = {
            "mean_score": baseline_stats.get("mean_score", 0.0),
            "std_score": baseline_stats.get("std_score", 0.0),
            "min_score": baseline_stats.get("min_score", 0.0),
            "max_score": baseline_stats.get("max_score", 0.0),
            "total_anomalies": baseline_stats.get("anomalies_detected", 0),
            "alert_threshold": metadata.get("alert_threshold", 0.0),
        }
        
        logger.info(
            "anomaly_scores_retrieved",
            site_id=site_id,
            model_id=model_id,
        )
        
        return ScoresResponse(
            site_id=site_id,
            model_id=model_id,
            scores=scores,
            statistics=statistics,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("anomaly_scores_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve scores: {str(e)}",
        )


@router.patch("/{model_id}/sensitivity")
async def update_sensitivity(
    model_id: str,
    sensitivity: str = Field(..., description="New sensitivity: low, medium, high"),
):
    """
    Update anomaly detection sensitivity.
    
    Args:
        model_id: Model identifier
        sensitivity: New sensitivity level
        
    Returns:
        Updated model metadata
    """
    logger.info(
        "sensitivity_update_requested",
        model_id=model_id,
        sensitivity=sensitivity,
    )
    
    try:
        if sensitivity.lower() not in ['low', 'medium', 'high']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sensitivity must be 'low', 'medium', or 'high'",
            )
        
        # Load model
        model_data = load_model(model_id)
        
        if model_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {model_id}",
            )
        
        detector: IsolationForestDetector = model_data['model']
        
        # Update sensitivity
        detector.update_sensitivity(sensitivity)
        
        # Save updated model
        save_model(
            model=detector,
            model_id=model_id,
            model_type='anomaly',
            metadata=detector.metadata,
        )
        
        logger.info(
            "sensitivity_updated",
            model_id=model_id,
            sensitivity=sensitivity,
        )
        
        return {
            "model_id": model_id,
            "sensitivity": sensitivity,
            "contamination": detector.metadata.get("contamination"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("sensitivity_update_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update sensitivity: {str(e)}",
        )
