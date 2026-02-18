"""
Simulation API Endpoints

Provides REST API for what-if simulation using ElasticNet models.
"""
from datetime import datetime
from typing import List, Optional, Dict
import pandas as pd
import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.models.simulation import ElasticNetSimulator
from app.services.model_service import save_model, load_model, get_model_metadata
from app.services.training_service import train_simulation_model
from app.utils.preprocessing import prepare_features


logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models
class DataPoint(BaseModel):
    """Single data point with features and target."""
    features: dict = Field(..., description="Feature values")
    target: float = Field(..., description="Target value")


class TrainSimulationRequest(BaseModel):
    """Request to train a simulation model."""
    site_id: str = Field(..., description="Site identifier")
    data: List[DataPoint] = Field(..., description="Historical data for training")
    features: List[str] = Field(..., description="Feature names (controllable variables)")
    target: str = Field(..., description="Target variable name")
    vertical_type: Optional[str] = Field(default=None, description="Vertical type for customization")


class RunSimulationRequest(BaseModel):
    """Request to run a simulation."""
    model_id: str = Field(..., description="Model identifier")
    overrides: Dict[str, float] = Field(..., description="Variable overrides")
    baseline_data: Optional[List[dict]] = Field(
        default=None,
        description="Baseline data for comparison"
    )
    num_scenarios: int = Field(default=1, description="Number of scenarios to simulate", gt=0, le=100)


class SensitivityAnalysisRequest(BaseModel):
    """Request for sensitivity analysis."""
    model_id: str = Field(..., description="Model identifier")
    feature: str = Field(..., description="Feature to analyze")
    min_value: float = Field(..., description="Minimum value for analysis")
    max_value: float = Field(..., description="Maximum value for analysis")
    num_points: int = Field(default=10, description="Number of points to sample", gt=2, le=100)
    baseline_data: Optional[List[dict]] = Field(
        default=None,
        description="Baseline data"
    )


class SimulationResponse(BaseModel):
    """Simulation response."""
    model_id: str
    target_name: str
    scenarios: List[dict]
    metadata: dict


class TrainingResponse(BaseModel):
    """Training response."""
    model_id: str
    status: str
    training_metadata: dict


class SensitivityResponse(BaseModel):
    """Sensitivity analysis response."""
    model_id: str
    feature: str
    results: List[dict]
    metadata: dict


@router.post("/train", status_code=status.HTTP_201_CREATED, response_model=TrainingResponse)
async def train_simulator(request: TrainSimulationRequest):
    """
    Train a simulation model using ElasticNet regression.
    
    Learns relationships between controllable variables and outcomes
    from historical data.
    
    Args:
        request: Training request with data and configuration
        
    Returns:
        Training response with model ID and metadata
    """
    logger.info(
        "simulation_training_requested",
        site_id=request.site_id,
        data_points=len(request.data),
        features=request.features,
        target=request.target,
    )
    
    try:
        # Convert data to DataFrame
        data_list = []
        for dp in request.data:
            row = dp.features.copy()
            row[request.target] = dp.target
            data_list.append(row)
        
        df = pd.DataFrame(data_list)
        
        # Validate features and target exist in data
        missing_features = [f for f in request.features if f not in df.columns]
        if missing_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Features not found in data: {missing_features}",
            )
        
        if request.target not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target not found in data: {request.target}",
            )
        
        # Prepare features
        df_processed = prepare_features(
            df,
            feature_names=request.features + [request.target],
            handle_missing=True,
        )
        
        # Train model using training service
        model_id, training_metadata = await train_simulation_model(
            site_id=request.site_id,
            data=df_processed,
            features=request.features,
            target=request.target,
            vertical_type=request.vertical_type,
        )
        
        logger.info(
            "simulation_model_trained",
            model_id=model_id,
            training_time=training_metadata.get("training_time_seconds"),
            r2_score=training_metadata.get("performance", {}).get("train_r2"),
        )
        
        return TrainingResponse(
            model_id=model_id,
            status="trained",
            training_metadata=training_metadata,
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error("simulation_training_validation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error("simulation_training_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}",
        )


@router.post("/run", response_model=SimulationResponse)
async def run_simulation(request: RunSimulationRequest):
    """
    Execute simulation with variable overrides.
    
    Applies overrides to controllable variables and predicts outcomes
    with confidence scores.
    
    Args:
        request: Simulation request with model ID and overrides
        
    Returns:
        Simulation results with predictions and confidence
    """
    logger.info(
        "simulation_run_requested",
        model_id=request.model_id,
        overrides=list(request.overrides.keys()),
        num_scenarios=request.num_scenarios,
    )
    
    try:
        # Load model
        model_data = load_model(request.model_id)
        
        if model_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {request.model_id}",
            )
        
        simulator: ElasticNetSimulator = model_data['model']
        metadata = model_data['metadata']
        
        # Validate overrides
        invalid_features = [
            f for f in request.overrides.keys()
            if f not in simulator.feature_names
        ]
        if invalid_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid override features: {invalid_features}",
            )
        
        # Prepare baseline data
        baseline_df = pd.DataFrame()
        if request.baseline_data:
            baseline_df = pd.DataFrame(request.baseline_data)
        
        # Run simulation
        results_df = simulator.simulate(
            baseline_data=baseline_df,
            overrides=request.overrides,
            num_scenarios=request.num_scenarios,
        )
        
        # Convert to response format
        scenarios = results_df.to_dict('records')
        
        logger.info(
            "simulation_run_completed",
            model_id=request.model_id,
            scenarios=len(scenarios),
            mean_confidence=float(results_df['confidence_score'].mean()),
        )
        
        return SimulationResponse(
            model_id=request.model_id,
            target_name=simulator.target_name,
            scenarios=scenarios,
            metadata={
                "model_type": "elastic_net",
                "trained_at": metadata.get("trained_at"),
                "features": simulator.feature_names,
                "overrides": request.overrides,
                "num_scenarios": request.num_scenarios,
            },
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("simulation_run_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation failed: {str(e)}",
        )


@router.post("/sensitivity", response_model=SensitivityResponse)
async def sensitivity_analysis(request: SensitivityAnalysisRequest):
    """
    Perform sensitivity analysis for a single feature.
    
    Analyzes how changes in a feature affect the target outcome.
    
    Args:
        request: Sensitivity analysis request
        
    Returns:
        Sensitivity analysis results
    """
    logger.info(
        "sensitivity_analysis_requested",
        model_id=request.model_id,
        feature=request.feature,
        value_range=(request.min_value, request.max_value),
    )
    
    try:
        # Load model
        model_data = load_model(request.model_id)
        
        if model_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {request.model_id}",
            )
        
        simulator: ElasticNetSimulator = model_data['model']
        
        # Validate feature
        if request.feature not in simulator.feature_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Feature not in model: {request.feature}",
            )
        
        # Prepare baseline data
        baseline_df = pd.DataFrame()
        if request.baseline_data:
            baseline_df = pd.DataFrame(request.baseline_data)
        
        # Run sensitivity analysis
        results_df = simulator.sensitivity_analysis(
            baseline_data=baseline_df,
            feature=request.feature,
            value_range=(request.min_value, request.max_value),
            num_points=request.num_points,
        )
        
        # Convert to response format
        results = results_df.to_dict('records')
        
        logger.info(
            "sensitivity_analysis_completed",
            model_id=request.model_id,
            feature=request.feature,
            points=len(results),
        )
        
        return SensitivityResponse(
            model_id=request.model_id,
            feature=request.feature,
            results=results,
            metadata={
                "target": simulator.target_name,
                "value_range": {
                    "min": request.min_value,
                    "max": request.max_value,
                },
                "num_points": request.num_points,
            },
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("sensitivity_analysis_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sensitivity analysis failed: {str(e)}",
        )


@router.get("/importance/{model_id}")
async def get_feature_importance(model_id: str):
    """
    Get feature importance for a simulation model.
    
    Returns the relative importance of each feature in the model.
    
    Args:
        model_id: Model identifier
        
    Returns:
        Feature importance scores
    """
    logger.info("feature_importance_requested", model_id=model_id)
    
    try:
        # Load model
        model_data = load_model(model_id)
        
        if model_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {model_id}",
            )
        
        metadata = model_data['metadata']
        
        # Get feature importance from metadata
        feature_importance = metadata.get("feature_importance", {})
        
        # Sort by importance
        importance_list = [
            {"feature": feature, "importance": importance}
            for feature, importance in feature_importance.items()
        ]
        importance_list.sort(key=lambda x: x["importance"], reverse=True)
        
        logger.info(
            "feature_importance_retrieved",
            model_id=model_id,
            features=len(importance_list),
        )
        
        return {
            "model_id": model_id,
            "feature_importance": importance_list,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("feature_importance_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve feature importance: {str(e)}",
        )
