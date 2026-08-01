"""
Model Management Service

Handles model persistence, versioning, and metadata tracking.
"""
import os
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import structlog

from app.config import settings


logger = structlog.get_logger()


def get_model_path(model_id: str, model_type: str = "") -> Path:
    """
    Get file path for a model.
    
    Args:
        model_id: Model identifier
        model_type: Optional model type for organization
        
    Returns:
        Path to model file
    """
    base_path = settings.model_storage_path
    
    if model_type:
        base_path = base_path / model_type
        base_path.mkdir(parents=True, exist_ok=True)
    
    return base_path / f"{model_id}.joblib"


def get_metadata_path(model_id: str, model_type: str = "") -> Path:
    """
    Get file path for model metadata.
    
    Args:
        model_id: Model identifier
        model_type: Optional model type for organization
        
    Returns:
        Path to metadata file
    """
    base_path = settings.model_storage_path
    
    if model_type:
        base_path = base_path / model_type
        base_path.mkdir(parents=True, exist_ok=True)
    
    return base_path / f"{model_id}_metadata.json"


def save_model(
    model: Any,
    model_id: str,
    model_type: str,
    metadata: Dict[str, Any],
    site_id: Optional[str] = None,
    metric_name: Optional[str] = None,
) -> bool:
    """
    Save model to disk with metadata.
    
    Args:
        model: Model instance to save
        model_id: Model identifier
        model_type: Model type (forecast, anomaly, simulation)
        metadata: Model metadata
        site_id: Optional site identifier
        metric_name: Optional metric name
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Get paths
        model_path = get_model_path(model_id, model_type)
        metadata_path = get_metadata_path(model_id, model_type)
        
        # Save model
        model.save(str(model_path))
        
        # Enhance metadata
        enhanced_metadata = {
            **metadata,
            "model_id": model_id,
            "model_type": model_type,
            "site_id": site_id,
            "metric_name": metric_name,
            "saved_at": datetime.now().isoformat(),
            "model_path": str(model_path),
        }
        
        # Save metadata
        with open(metadata_path, 'w') as f:
            json.dump(enhanced_metadata, f, indent=2)
        
        logger.info(
            "model_saved",
            model_id=model_id,
            model_type=model_type,
            path=str(model_path),
        )
        
        # Handle versioning
        _manage_model_versions(model_type, site_id)
        
        return True
        
    except Exception as e:
        logger.error(
            "model_save_failed",
            model_id=model_id,
            error=str(e),
        )
        return False


def load_model(model_id: str, model_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Load model from disk.
    
    Args:
        model_id: Model identifier
        model_type: Optional model type hint
        
    Returns:
        Dictionary with 'model' and 'metadata' keys, or None if not found
    """
    try:
        # Try to find model
        if model_type:
            model_path = get_model_path(model_id, model_type)
            metadata_path = get_metadata_path(model_id, model_type)
        else:
            # Search all model types
            for mtype in ['forecast', 'anomaly', 'simulation']:
                model_path = get_model_path(model_id, mtype)
                metadata_path = get_metadata_path(model_id, mtype)
                
                if model_path.exists():
                    model_type = mtype
                    break
            else:
                logger.warning("model_not_found", model_id=model_id)
                return None
        
        if not model_path.exists():
            logger.warning("model_not_found", model_id=model_id)
            return None
        
        # Load metadata
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        
        # Load model based on type
        if model_type == 'forecast':
            from app.models.forecasting import ProphetForecaster, ARIMAForecaster
            
            # Try Prophet first
            try:
                model = ProphetForecaster.load(str(model_path))
            except:
                model = ARIMAForecaster.load(str(model_path))
                
        elif model_type == 'anomaly':
            from app.models.anomaly import IsolationForestDetector
            model = IsolationForestDetector.load(str(model_path))
            
        elif model_type == 'simulation':
            from app.models.simulation import ElasticNetSimulator
            model = ElasticNetSimulator.load(str(model_path))
            
        else:
            logger.error("unknown_model_type", model_type=model_type)
            return None
        
        logger.info(
            "model_loaded",
            model_id=model_id,
            model_type=model_type,
        )
        
        return {
            'model': model,
            'metadata': metadata,
            'model_type': model_type,
        }
        
    except Exception as e:
        logger.error(
            "model_load_failed",
            model_id=model_id,
            error=str(e),
        )
        return None


def get_model_metadata(model_id: str, model_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Get model metadata without loading the full model.
    
    Args:
        model_id: Model identifier
        model_type: Optional model type hint
        
    Returns:
        Metadata dictionary or None if not found
    """
    try:
        # Try to find metadata
        if model_type:
            metadata_path = get_metadata_path(model_id, model_type)
        else:
            # Search all model types
            for mtype in ['forecast', 'anomaly', 'simulation']:
                metadata_path = get_metadata_path(model_id, mtype)
                if metadata_path.exists():
                    break
            else:
                return None
        
        if not metadata_path.exists():
            return None
        
        # Load metadata
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        return metadata
        
    except Exception as e:
        logger.error(
            "metadata_load_failed",
            model_id=model_id,
            error=str(e),
        )
        return None


def list_models(
    model_type: Optional[str] = None,
    site_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    List available models.
    
    Args:
        model_type: Optional filter by model type
        site_id: Optional filter by site ID
        
    Returns:
        List of model metadata dictionaries
    """
    models = []
    
    try:
        # Determine which model types to search
        if model_type:
            model_types = [model_type]
        else:
            model_types = ['forecast', 'anomaly', 'simulation']
        
        # Search for models
        for mtype in model_types:
            type_path = settings.model_storage_path / mtype
            
            if not type_path.exists():
                continue
            
            # Find all metadata files
            for metadata_file in type_path.glob("*_metadata.json"):
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    # Apply site_id filter if specified
                    if site_id and metadata.get('site_id') != site_id:
                        continue
                    
                    models.append(metadata)
                    
                except Exception as e:
                    logger.warning(
                        "failed_to_load_metadata",
                        file=str(metadata_file),
                        error=str(e),
                    )
        
        # Sort by saved_at timestamp
        models.sort(
            key=lambda x: x.get('saved_at', ''),
            reverse=True,
        )
        
        logger.info(
            "models_listed",
            count=len(models),
            model_type=model_type,
            site_id=site_id,
        )
        
        return models
        
    except Exception as e:
        logger.error("list_models_failed", error=str(e))
        return []


def delete_model(model_id: str, model_type: Optional[str] = None) -> bool:
    """
    Delete a model and its metadata.
    
    Args:
        model_id: Model identifier
        model_type: Optional model type hint
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Find model
        if model_type:
            model_path = get_model_path(model_id, model_type)
            metadata_path = get_metadata_path(model_id, model_type)
        else:
            # Search all model types
            for mtype in ['forecast', 'anomaly', 'simulation']:
                model_path = get_model_path(model_id, mtype)
                metadata_path = get_metadata_path(model_id, mtype)
                
                if model_path.exists():
                    model_type = mtype
                    break
            else:
                logger.warning("model_not_found_for_deletion", model_id=model_id)
                return False
        
        # Delete files
        deleted_files = []
        
        if model_path.exists():
            model_path.unlink()
            deleted_files.append(str(model_path))
        
        if metadata_path.exists():
            metadata_path.unlink()
            deleted_files.append(str(metadata_path))
        
        logger.info(
            "model_deleted",
            model_id=model_id,
            model_type=model_type,
            files=deleted_files,
        )
        
        return True
        
    except Exception as e:
        logger.error(
            "model_deletion_failed",
            model_id=model_id,
            error=str(e),
        )
        return False


def _manage_model_versions(model_type: str, site_id: Optional[str]) -> None:
    """
    Manage model versions by removing old versions.
    
    Args:
        model_type: Model type
        site_id: Site identifier
    """
    try:
        if not site_id:
            return
        
        # Get all models for this site
        site_models = list_models(model_type=model_type, site_id=site_id)
        
        # If exceeds max versions, delete oldest
        if len(site_models) > settings.model_max_versions:
            # Sort by saved_at (oldest first)
            site_models.sort(key=lambda x: x.get('saved_at', ''))
            
            # Delete excess models
            num_to_delete = len(site_models) - settings.model_max_versions
            for model_meta in site_models[:num_to_delete]:
                model_id = model_meta.get('model_id')
                if model_id:
                    delete_model(model_id, model_type)
                    logger.info(
                        "old_model_version_deleted",
                        model_id=model_id,
                        site_id=site_id,
                    )
        
    except Exception as e:
        logger.warning(
            "version_management_failed",
            model_type=model_type,
            site_id=site_id,
            error=str(e),
        )
