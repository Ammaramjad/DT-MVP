"""
Simulation Model Implementation

Provides what-if simulation capabilities using ElasticNet regression
to predict outcomes based on variable overrides.
"""
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
import numpy as np
import structlog
from sklearn.linear_model import ElasticNet
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
import joblib

from app.config import settings


logger = structlog.get_logger()


class ElasticNetSimulator:
    """
    Simulation model using ElasticNet regression.
    
    Learns relationships from historical data and simulates outcomes
    when variables are overridden.
    """
    
    def __init__(
        self,
        alpha: float = None,
        l1_ratio: float = None,
        max_iter: int = None,
        random_state: int = 42,
    ):
        """
        Initialize ElasticNet simulator.
        
        Args:
            alpha: Regularization strength
            l1_ratio: ElasticNet mixing parameter (0=L2, 1=L1)
            max_iter: Maximum iterations for optimization
            random_state: Random seed for reproducibility
        """
        self.alpha = alpha or settings.simulation_alpha
        self.l1_ratio = l1_ratio or settings.simulation_l1_ratio
        self.max_iter = max_iter or settings.simulation_max_iter
        self.random_state = random_state
        
        self.model: Optional[ElasticNet] = None
        self.scaler_X: Optional[StandardScaler] = None
        self.scaler_y: Optional[StandardScaler] = None
        self.feature_names: List[str] = []
        self.target_name: str = ""
        self.metadata: Dict[str, Any] = {}
    
    def train(
        self,
        data: pd.DataFrame,
        features: List[str],
        target: str,
        vertical_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Train simulation model on historical data.
        
        Args:
            data: DataFrame with feature and target columns
            features: List of feature column names (controllable variables)
            target: Target column name (outcome to simulate)
            vertical_type: Optional vertical type for domain-specific logic
            
        Returns:
            Training metadata including model performance
        """
        logger.info(
            "training_simulation_model",
            data_points=len(data),
            features=features,
            target=target,
            vertical_type=vertical_type,
        )
        
        try:
            # Validate input
            all_columns = features + [target]
            if not all(col in data.columns for col in all_columns):
                missing = [col for col in all_columns if col not in data.columns]
                raise ValueError(f"Missing columns in data: {missing}")
            
            if len(data) < settings.min_training_samples:
                raise ValueError(
                    f"Insufficient training samples: {len(data)} < "
                    f"{settings.min_training_samples}"
                )
            
            # Store configuration
            self.feature_names = features
            self.target_name = target
            
            # Prepare data
            X = data[features].values
            y = data[target].values
            
            # Handle missing values
            X = self._handle_missing_values(X)
            y = self._handle_missing_values(y.reshape(-1, 1)).flatten()
            
            # Scale features and target
            self.scaler_X = StandardScaler()
            self.scaler_y = StandardScaler()
            
            X_scaled = self.scaler_X.fit_transform(X)
            y_scaled = self.scaler_y.fit_transform(y.reshape(-1, 1)).flatten()
            
            # Train ElasticNet model
            start_time = datetime.now()
            self.model = ElasticNet(
                alpha=self.alpha,
                l1_ratio=self.l1_ratio,
                max_iter=self.max_iter,
                random_state=self.random_state,
            )
            self.model.fit(X_scaled, y_scaled)
            training_time = (datetime.now() - start_time).total_seconds()
            
            # Evaluate model performance
            train_score = self.model.score(X_scaled, y_scaled)
            cv_scores = cross_val_score(
                self.model, X_scaled, y_scaled, cv=min(5, len(data) // 20)
            )
            
            # Calculate feature importance
            feature_importance = self._calculate_feature_importance()
            
            # Assess data quality
            data_quality = self._assess_data_quality(data, features, target)
            
            # Store metadata
            self.metadata = {
                "trained_at": datetime.now().isoformat(),
                "training_time_seconds": training_time,
                "data_points": len(data),
                "features": features,
                "target": target,
                "vertical_type": vertical_type,
                "performance": {
                    "train_r2": float(train_score),
                    "cv_r2_mean": float(np.mean(cv_scores)),
                    "cv_r2_std": float(np.std(cv_scores)),
                },
                "feature_importance": feature_importance,
                "data_quality": data_quality,
                "model_config": {
                    "alpha": self.alpha,
                    "l1_ratio": self.l1_ratio,
                    "max_iter": self.max_iter,
                },
            }
            
            logger.info(
                "simulation_model_trained",
                training_time=training_time,
                train_r2=train_score,
                cv_r2=np.mean(cv_scores),
                data_quality_score=data_quality["overall_score"],
            )
            
            return self.metadata
            
        except Exception as e:
            logger.error("simulation_training_failed", error=str(e))
            raise
    
    def simulate(
        self,
        baseline_data: pd.DataFrame,
        overrides: Dict[str, float],
        num_scenarios: int = 1,
    ) -> pd.DataFrame:
        """
        Run simulation with variable overrides.
        
        Args:
            baseline_data: DataFrame with baseline feature values
            overrides: Dictionary of feature overrides {feature_name: value}
            num_scenarios: Number of scenarios to simulate
            
        Returns:
            DataFrame with simulation results and confidence scores
        """
        if self.model is None:
            raise ValueError("Model must be trained before simulation")
        
        logger.info(
            "running_simulation",
            scenarios=num_scenarios,
            overrides=list(overrides.keys()),
        )
        
        try:
            # Validate overrides
            invalid_features = [f for f in overrides if f not in self.feature_names]
            if invalid_features:
                raise ValueError(f"Invalid override features: {invalid_features}")
            
            # Prepare scenarios
            scenarios = []
            
            for i in range(num_scenarios):
                # Start with baseline or sample from baseline distribution
                if len(baseline_data) > 0:
                    baseline_idx = np.random.choice(len(baseline_data))
                    scenario = baseline_data.iloc[baseline_idx][self.feature_names].to_dict()
                else:
                    # Use feature means as baseline
                    scenario = {f: 0.0 for f in self.feature_names}
                
                # Apply overrides
                scenario.update(overrides)
                scenarios.append(scenario)
            
            # Convert to DataFrame
            scenarios_df = pd.DataFrame(scenarios)
            
            # Scale features
            X_scaled = self.scaler_X.transform(scenarios_df.values)
            
            # Generate predictions
            y_scaled = self.model.predict(X_scaled)
            y_pred = self.scaler_y.inverse_transform(y_scaled.reshape(-1, 1)).flatten()
            
            # Calculate confidence scores
            confidence_scores = self._calculate_confidence(scenarios_df)
            
            # Create results DataFrame
            results = pd.DataFrame({
                'scenario_id': range(num_scenarios),
                f'predicted_{self.target_name}': y_pred,
                'confidence_score': confidence_scores,
                'simulation_time': datetime.now().isoformat(),
            })
            
            # Add override information
            for feature, value in overrides.items():
                results[f'override_{feature}'] = value
            
            # Add baseline values for comparison
            if len(baseline_data) > 0:
                baseline_mean = baseline_data[self.target_name].mean()
                results['baseline_value'] = baseline_mean
                results['delta_from_baseline'] = y_pred - baseline_mean
                results['delta_percent'] = (
                    (y_pred - baseline_mean) / (baseline_mean + 1e-10) * 100
                )
            
            logger.info(
                "simulation_completed",
                scenarios=num_scenarios,
                mean_prediction=float(np.mean(y_pred)),
                mean_confidence=float(np.mean(confidence_scores)),
            )
            
            return results
            
        except Exception as e:
            logger.error("simulation_failed", error=str(e))
            raise
    
    def sensitivity_analysis(
        self,
        baseline_data: pd.DataFrame,
        feature: str,
        value_range: Tuple[float, float],
        num_points: int = 10,
    ) -> pd.DataFrame:
        """
        Perform sensitivity analysis for a single feature.
        
        Args:
            baseline_data: DataFrame with baseline feature values
            feature: Feature to analyze
            value_range: Tuple of (min_value, max_value)
            num_points: Number of points to sample
            
        Returns:
            DataFrame with sensitivity analysis results
        """
        if feature not in self.feature_names:
            raise ValueError(f"Feature '{feature}' not in trained features")
        
        logger.info(
            "running_sensitivity_analysis",
            feature=feature,
            value_range=value_range,
            num_points=num_points,
        )
        
        # Generate value range
        values = np.linspace(value_range[0], value_range[1], num_points)
        
        # Run simulations for each value
        results = []
        for value in values:
            sim_result = self.simulate(
                baseline_data=baseline_data,
                overrides={feature: float(value)},
                num_scenarios=1,
            )
            results.append({
                feature: value,
                f'predicted_{self.target_name}': sim_result[f'predicted_{self.target_name}'].iloc[0],
                'confidence_score': sim_result['confidence_score'].iloc[0],
            })
        
        return pd.DataFrame(results)
    
    def _calculate_feature_importance(self) -> Dict[str, float]:
        """
        Calculate feature importance from model coefficients.
        
        Returns:
            Dictionary of feature importance scores
        """
        if self.model is None:
            return {}
        
        # Use absolute coefficients as importance
        importance = np.abs(self.model.coef_)
        
        # Normalize to sum to 1
        importance = importance / (np.sum(importance) + 1e-10)
        
        return {
            feature: float(imp)
            for feature, imp in zip(self.feature_names, importance)
        }
    
    def _calculate_confidence(self, scenarios_df: pd.DataFrame) -> np.ndarray:
        """
        Calculate confidence scores for simulations.
        
        Confidence is based on:
        - How far scenarios are from training data distribution
        - Model R² score
        - Data quality score
        
        Args:
            scenarios_df: DataFrame with scenario features
            
        Returns:
            Array of confidence scores (0-1)
        """
        # Base confidence from model performance
        if self.metadata and 'performance' in self.metadata:
            base_confidence = max(0.0, self.metadata['performance']['cv_r2_mean'])
        else:
            base_confidence = 0.5
        
        # Adjust based on data quality
        if self.metadata and 'data_quality' in self.metadata:
            data_quality_score = self.metadata['data_quality']['overall_score']
            base_confidence *= data_quality_score
        
        # Check if scenarios are within training data distribution
        X_scaled = self.scaler_X.transform(scenarios_df.values)
        
        # Calculate distance from training data centroid (simplified)
        distances = np.linalg.norm(X_scaled, axis=1)
        max_distance = np.max(distances) if len(distances) > 0 else 1.0
        
        # Normalize distances to [0, 1] and invert
        distance_scores = 1.0 - (distances / (max_distance + 1e-10))
        
        # Combine base confidence with distance scores
        confidence_scores = base_confidence * (0.7 + 0.3 * distance_scores)
        
        # Clip to [0, 1]
        return np.clip(confidence_scores, 0.0, 1.0)
    
    def _assess_data_quality(
        self,
        data: pd.DataFrame,
        features: List[str],
        target: str,
    ) -> Dict[str, Any]:
        """
        Assess quality of training data.
        
        Args:
            data: Training data
            features: Feature columns
            target: Target column
            
        Returns:
            Dictionary with data quality metrics
        """
        quality = {
            "total_samples": len(data),
            "missing_values": {},
            "outliers": {},
            "correlation_with_target": {},
        }
        
        # Check missing values
        for col in features + [target]:
            missing_pct = data[col].isna().sum() / len(data) * 100
            quality["missing_values"][col] = float(missing_pct)
        
        # Check for outliers using IQR method
        for col in features:
            Q1 = data[col].quantile(0.25)
            Q3 = data[col].quantile(0.75)
            IQR = Q3 - Q1
            outliers = ((data[col] < Q1 - 1.5 * IQR) | (data[col] > Q3 + 1.5 * IQR)).sum()
            quality["outliers"][col] = int(outliers)
        
        # Calculate correlation with target
        for col in features:
            if data[col].std() > 0:
                corr = data[col].corr(data[target])
                quality["correlation_with_target"][col] = float(corr) if not pd.isna(corr) else 0.0
        
        # Calculate overall quality score
        avg_missing = np.mean(list(quality["missing_values"].values()))
        avg_outlier_pct = np.mean(list(quality["outliers"].values())) / len(data) * 100
        
        quality_score = 1.0
        quality_score *= (1.0 - avg_missing / 100)  # Penalize missing values
        quality_score *= (1.0 - avg_outlier_pct / 100)  # Penalize outliers
        quality_score = max(0.0, min(1.0, quality_score))
        
        quality["overall_score"] = float(quality_score)
        
        return quality
    
    def _handle_missing_values(self, X: np.ndarray) -> np.ndarray:
        """
        Handle missing values in feature matrix.
        
        Args:
            X: Feature matrix
            
        Returns:
            Feature matrix with missing values handled
        """
        col_mean = np.nanmean(X, axis=0)
        inds = np.where(np.isnan(X))
        X_clean = X.copy()
        X_clean[inds] = np.take(col_mean, inds[1])
        return X_clean
    
    def save(self, filepath: str) -> None:
        """
        Save model to disk.
        
        Args:
            filepath: Path to save model
        """
        joblib.dump({
            'model': self.model,
            'scaler_X': self.scaler_X,
            'scaler_y': self.scaler_y,
            'feature_names': self.feature_names,
            'target_name': self.target_name,
            'metadata': self.metadata,
            'config': {
                'alpha': self.alpha,
                'l1_ratio': self.l1_ratio,
                'max_iter': self.max_iter,
                'random_state': self.random_state,
            }
        }, filepath)
        logger.info("simulation_model_saved", filepath=filepath)
    
    @classmethod
    def load(cls, filepath: str) -> 'ElasticNetSimulator':
        """
        Load model from disk.
        
        Args:
            filepath: Path to saved model
            
        Returns:
            Loaded ElasticNetSimulator instance
        """
        data = joblib.load(filepath)
        simulator = cls(**data['config'])
        simulator.model = data['model']
        simulator.scaler_X = data['scaler_X']
        simulator.scaler_y = data['scaler_y']
        simulator.feature_names = data['feature_names']
        simulator.target_name = data['target_name']
        simulator.metadata = data['metadata']
        logger.info("simulation_model_loaded", filepath=filepath)
        return simulator
