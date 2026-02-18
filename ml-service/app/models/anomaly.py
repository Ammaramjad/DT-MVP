"""
Anomaly Detection Implementation

Provides real-time anomaly detection using Isolation Forest with
configurable sensitivity and alert thresholds.
"""
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
import numpy as np
import structlog
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

from app.config import settings


logger = structlog.get_logger()


class IsolationForestDetector:
    """
    Anomaly detection using Isolation Forest algorithm.
    
    Supports batch training and real-time scoring with configurable
    sensitivity and alert thresholds.
    """
    
    def __init__(
        self,
        contamination: float = None,
        n_estimators: int = None,
        max_samples: str = None,
        random_state: int = 42,
    ):
        """
        Initialize Isolation Forest detector.
        
        Args:
            contamination: Expected proportion of outliers (0.0 to 0.5)
            n_estimators: Number of trees in the forest
            max_samples: Number of samples to train each tree
            random_state: Random seed for reproducibility
        """
        self.contamination = (
            contamination or settings.isolation_forest_contamination
        )
        self.n_estimators = (
            n_estimators or settings.isolation_forest_n_estimators
        )
        self.max_samples = (
            max_samples or settings.isolation_forest_max_samples
        )
        self.random_state = random_state
        
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.feature_names: List[str] = []
        self.metadata: Dict[str, Any] = {}
        self.alert_threshold: float = settings.anomaly_alert_threshold
    
    def train(
        self,
        data: pd.DataFrame,
        features: List[str],
        sensitivity: str = "medium",
    ) -> Dict[str, Any]:
        """
        Train anomaly detection model on historical data.
        
        Args:
            data: DataFrame with feature columns
            features: List of feature column names to use
            sensitivity: Detection sensitivity ('low', 'medium', 'high')
            
        Returns:
            Training metadata including model statistics
        """
        logger.info(
            "training_anomaly_detector",
            data_points=len(data),
            features=features,
            sensitivity=sensitivity,
        )
        
        try:
            # Validate input
            if not all(f in data.columns for f in features):
                missing = [f for f in features if f not in data.columns]
                raise ValueError(f"Missing features in data: {missing}")
            
            if len(data) < settings.min_training_samples:
                raise ValueError(
                    f"Insufficient training samples: {len(data)} < "
                    f"{settings.min_training_samples}"
                )
            
            # Store feature names
            self.feature_names = features
            
            # Adjust contamination based on sensitivity
            contamination = self._get_contamination_for_sensitivity(sensitivity)
            
            # Prepare features
            X = data[features].values
            
            # Handle missing values
            X = self._handle_missing_values(X)
            
            # Scale features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Train Isolation Forest
            start_time = datetime.now()
            self.model = IsolationForest(
                contamination=contamination,
                n_estimators=self.n_estimators,
                max_samples=self.max_samples,
                random_state=self.random_state,
                n_jobs=-1,
            )
            self.model.fit(X_scaled)
            training_time = (datetime.now() - start_time).total_seconds()
            
            # Calculate baseline statistics
            scores = self.model.score_samples(X_scaled)
            predictions = self.model.predict(X_scaled)
            
            # Store metadata
            self.metadata = {
                "trained_at": datetime.now().isoformat(),
                "training_time_seconds": training_time,
                "data_points": len(data),
                "features": features,
                "sensitivity": sensitivity,
                "contamination": float(contamination),
                "n_estimators": self.n_estimators,
                "baseline_stats": {
                    "mean_score": float(np.mean(scores)),
                    "std_score": float(np.std(scores)),
                    "min_score": float(np.min(scores)),
                    "max_score": float(np.max(scores)),
                    "anomalies_detected": int(np.sum(predictions == -1)),
                },
            }
            
            # Set alert threshold based on baseline
            self.alert_threshold = float(
                np.percentile(scores, contamination * 100)
            )
            self.metadata["alert_threshold"] = self.alert_threshold
            
            logger.info(
                "anomaly_detector_trained",
                training_time=training_time,
                baseline_anomalies=self.metadata["baseline_stats"]["anomalies_detected"],
                alert_threshold=self.alert_threshold,
            )
            
            return self.metadata
            
        except Exception as e:
            logger.error("anomaly_training_failed", error=str(e))
            raise
    
    def detect(
        self,
        data: pd.DataFrame,
        return_scores: bool = True,
    ) -> Tuple[pd.DataFrame, Optional[pd.DataFrame]]:
        """
        Detect anomalies in real-time data.
        
        Args:
            data: DataFrame with feature columns
            return_scores: Whether to return anomaly scores
            
        Returns:
            Tuple of (predictions DataFrame, optional scores DataFrame)
        """
        if self.model is None or self.scaler is None:
            raise ValueError("Model must be trained before detection")
        
        logger.info("detecting_anomalies", data_points=len(data))
        
        try:
            # Validate features
            if not all(f in data.columns for f in self.feature_names):
                missing = [f for f in self.feature_names if f not in data.columns]
                raise ValueError(f"Missing features in data: {missing}")
            
            # Prepare features
            X = data[self.feature_names].values
            X = self._handle_missing_values(X)
            X_scaled = self.scaler.transform(X)
            
            # Get anomaly scores
            scores = self.model.score_samples(X_scaled)
            predictions = self.model.predict(X_scaled)
            
            # Create predictions DataFrame
            result = pd.DataFrame({
                'is_anomaly': predictions == -1,
                'anomaly_score': scores,
                'severity': self._calculate_severity(scores),
                'alert': scores < self.alert_threshold,
                'detected_at': datetime.now().isoformat(),
            }, index=data.index)
            
            # Add timestamp if available
            if 'timestamp' in data.columns:
                result['timestamp'] = data['timestamp']
            elif 'ds' in data.columns:
                result['timestamp'] = data['ds']
            
            anomaly_count = result['is_anomaly'].sum()
            alert_count = result['alert'].sum()
            
            logger.info(
                "anomalies_detected",
                total_points=len(result),
                anomalies=anomaly_count,
                alerts=alert_count,
            )
            
            # Prepare scores DataFrame if requested
            scores_df = None
            if return_scores:
                scores_df = pd.DataFrame({
                    'feature': self.feature_names * len(data),
                    'value': X.flatten(),
                    'score': np.repeat(scores, len(self.feature_names)),
                })
            
            return result, scores_df
            
        except Exception as e:
            logger.error("anomaly_detection_failed", error=str(e))
            raise
    
    def update_sensitivity(self, sensitivity: str) -> None:
        """
        Update detection sensitivity.
        
        Args:
            sensitivity: New sensitivity level ('low', 'medium', 'high')
        """
        contamination = self._get_contamination_for_sensitivity(sensitivity)
        
        if self.model is not None:
            self.model.contamination = contamination
            self.metadata["sensitivity"] = sensitivity
            self.metadata["contamination"] = float(contamination)
            
            logger.info(
                "sensitivity_updated",
                sensitivity=sensitivity,
                contamination=contamination,
            )
    
    def _get_contamination_for_sensitivity(self, sensitivity: str) -> float:
        """
        Map sensitivity level to contamination parameter.
        
        Args:
            sensitivity: Sensitivity level
            
        Returns:
            Contamination value
        """
        sensitivity_map = {
            'low': self.contamination * 0.5,
            'medium': self.contamination,
            'high': min(self.contamination * 2.0, 0.5),
        }
        return sensitivity_map.get(sensitivity.lower(), self.contamination)
    
    def _calculate_severity(self, scores: np.ndarray) -> np.ndarray:
        """
        Calculate anomaly severity based on scores.
        
        Args:
            scores: Anomaly scores
            
        Returns:
            Severity levels ('low', 'medium', 'high', 'critical')
        """
        # Define severity thresholds based on percentiles
        if self.metadata and 'baseline_stats' in self.metadata:
            baseline_mean = self.metadata['baseline_stats']['mean_score']
            baseline_std = self.metadata['baseline_stats']['std_score']
            
            thresholds = {
                'critical': baseline_mean - 3 * baseline_std,
                'high': baseline_mean - 2 * baseline_std,
                'medium': baseline_mean - 1 * baseline_std,
            }
        else:
            # Fallback thresholds
            thresholds = {
                'critical': -0.8,
                'high': -0.6,
                'medium': -0.4,
            }
        
        severity = np.full(len(scores), 'low', dtype=object)
        severity[scores < thresholds['medium']] = 'medium'
        severity[scores < thresholds['high']] = 'high'
        severity[scores < thresholds['critical']] = 'critical'
        
        return severity
    
    def _handle_missing_values(self, X: np.ndarray) -> np.ndarray:
        """
        Handle missing values in feature matrix.
        
        Args:
            X: Feature matrix
            
        Returns:
            Feature matrix with missing values handled
        """
        # Replace NaN with column mean
        col_mean = np.nanmean(X, axis=0)
        inds = np.where(np.isnan(X))
        X_clean = X.copy()
        X_clean[inds] = np.take(col_mean, inds[1])
        return X_clean
    
    def get_feature_importance(self) -> pd.DataFrame:
        """
        Calculate feature importance based on anomaly detection.
        
        Returns:
            DataFrame with feature importance scores
        """
        if self.model is None:
            raise ValueError("Model must be trained first")
        
        # Feature importance approximation
        # Use average path length contribution
        importance_scores = []
        
        for feature in self.feature_names:
            # This is a simplified importance metric
            # In practice, you might want to use more sophisticated methods
            importance_scores.append(1.0 / len(self.feature_names))
        
        return pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance_scores,
        }).sort_values('importance', ascending=False)
    
    def save(self, filepath: str) -> None:
        """
        Save model to disk.
        
        Args:
            filepath: Path to save model
        """
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'metadata': self.metadata,
            'alert_threshold': self.alert_threshold,
            'config': {
                'contamination': self.contamination,
                'n_estimators': self.n_estimators,
                'max_samples': self.max_samples,
                'random_state': self.random_state,
            }
        }, filepath)
        logger.info("anomaly_detector_saved", filepath=filepath)
    
    @classmethod
    def load(cls, filepath: str) -> 'IsolationForestDetector':
        """
        Load model from disk.
        
        Args:
            filepath: Path to saved model
            
        Returns:
            Loaded IsolationForestDetector instance
        """
        data = joblib.load(filepath)
        detector = cls(**data['config'])
        detector.model = data['model']
        detector.scaler = data['scaler']
        detector.feature_names = data['feature_names']
        detector.metadata = data['metadata']
        detector.alert_threshold = data['alert_threshold']
        logger.info("anomaly_detector_loaded", filepath=filepath)
        return detector
