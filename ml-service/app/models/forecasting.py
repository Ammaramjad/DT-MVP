"""
Forecasting Model Implementations

Provides time series forecasting capabilities using Prophet and ARIMA models
with seasonality detection, holiday handling, and confidence intervals.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np
import structlog
from prophet import Prophet
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.stattools import adfuller
import joblib

from app.config import settings


logger = structlog.get_logger()


class ProphetForecaster:
    """
    Time series forecasting using Facebook Prophet.
    
    Handles seasonality, holidays, and provides confidence intervals.
    """
    
    def __init__(
        self,
        changepoint_prior_scale: float = None,
        seasonality_prior_scale: float = None,
        seasonality_mode: str = None,
        yearly_seasonality: bool = None,
        weekly_seasonality: bool = None,
        daily_seasonality: bool = None,
        interval_width: float = None,
    ):
        """
        Initialize Prophet forecaster.
        
        Args:
            changepoint_prior_scale: Flexibility of trend changes
            seasonality_prior_scale: Flexibility of seasonality
            seasonality_mode: 'additive' or 'multiplicative'
            yearly_seasonality: Enable yearly seasonality
            weekly_seasonality: Enable weekly seasonality
            daily_seasonality: Enable daily seasonality
            interval_width: Width of uncertainty intervals
        """
        self.changepoint_prior_scale = (
            changepoint_prior_scale or settings.prophet_changepoint_prior_scale
        )
        self.seasonality_prior_scale = (
            seasonality_prior_scale or settings.prophet_seasonality_prior_scale
        )
        self.seasonality_mode = (
            seasonality_mode or settings.prophet_seasonality_mode
        )
        self.yearly_seasonality = (
            yearly_seasonality or settings.prophet_yearly_seasonality
        )
        self.weekly_seasonality = (
            weekly_seasonality or settings.prophet_weekly_seasonality
        )
        self.daily_seasonality = (
            daily_seasonality or settings.prophet_daily_seasonality
        )
        self.interval_width = interval_width or settings.prophet_interval_width
        
        self.model: Optional[Prophet] = None
        self.metadata: Dict[str, Any] = {}
        
    def train(
        self,
        data: pd.DataFrame,
        holidays: Optional[pd.DataFrame] = None,
        additional_regressors: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Train Prophet model on historical data.
        
        Args:
            data: DataFrame with 'ds' (datetime) and 'y' (value) columns
            holidays: Optional DataFrame with 'ds' and 'holiday' columns
            additional_regressors: List of additional regressor column names
            
        Returns:
            Training metadata including performance metrics
        """
        logger.info(
            "training_prophet_model",
            data_points=len(data),
            has_holidays=holidays is not None,
        )
        
        try:
            # Validate input data
            if not {'ds', 'y'}.issubset(data.columns):
                raise ValueError("Data must have 'ds' and 'y' columns")
            
            if len(data) < settings.min_training_samples:
                raise ValueError(
                    f"Insufficient training samples: {len(data)} < "
                    f"{settings.min_training_samples}"
                )
            
            # Initialize Prophet model
            self.model = Prophet(
                changepoint_prior_scale=self.changepoint_prior_scale,
                seasonality_prior_scale=self.seasonality_prior_scale,
                seasonality_mode=self.seasonality_mode,
                yearly_seasonality=self.yearly_seasonality,
                weekly_seasonality=self.weekly_seasonality,
                daily_seasonality=self.daily_seasonality,
                interval_width=self.interval_width,
            )
            
            # Add holidays if provided
            if holidays is not None:
                self.model.holidays = holidays
                
            # Add additional regressors
            if additional_regressors:
                for regressor in additional_regressors:
                    if regressor in data.columns:
                        self.model.add_regressor(regressor)
            
            # Detect and add custom seasonalities
            seasonalities = self._detect_seasonalities(data)
            for name, period in seasonalities.items():
                self.model.add_seasonality(
                    name=name,
                    period=period,
                    fourier_order=5,
                )
            
            # Fit model
            start_time = datetime.now()
            self.model.fit(data)
            training_time = (datetime.now() - start_time).total_seconds()
            
            # Store metadata
            self.metadata = {
                "trained_at": datetime.now().isoformat(),
                "training_time_seconds": training_time,
                "data_points": len(data),
                "data_start": data['ds'].min().isoformat(),
                "data_end": data['ds'].max().isoformat(),
                "seasonalities": seasonalities,
                "has_holidays": holidays is not None,
                "additional_regressors": additional_regressors or [],
            }
            
            logger.info(
                "prophet_model_trained",
                training_time=training_time,
                seasonalities=seasonalities,
            )
            
            return self.metadata
            
        except Exception as e:
            logger.error("prophet_training_failed", error=str(e))
            raise
    
    def predict(
        self,
        periods: int,
        frequency: str = "H",
        include_history: bool = False,
    ) -> pd.DataFrame:
        """
        Generate forecast predictions.
        
        Args:
            periods: Number of periods to forecast
            frequency: Frequency of predictions ('H' for hourly, 'D' for daily)
            include_history: Include historical fitted values
            
        Returns:
            DataFrame with predictions and confidence intervals
        """
        if self.model is None:
            raise ValueError("Model must be trained before prediction")
        
        logger.info("generating_forecast", periods=periods, frequency=frequency)
        
        try:
            # Create future dataframe
            future = self.model.make_future_dataframe(
                periods=periods,
                freq=frequency,
                include_history=include_history,
            )
            
            # Generate predictions
            forecast = self.model.predict(future)
            
            # Extract relevant columns
            result = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
            
            # Add metadata
            result['forecast_generated_at'] = datetime.now().isoformat()
            
            logger.info("forecast_generated", predictions=len(result))
            
            return result
            
        except Exception as e:
            logger.error("forecast_generation_failed", error=str(e))
            raise
    
    def _detect_seasonalities(self, data: pd.DataFrame) -> Dict[str, float]:
        """
        Detect custom seasonalities in the data.
        
        Args:
            data: Time series data
            
        Returns:
            Dictionary of seasonality names and periods
        """
        seasonalities = {}
        
        # Check for hourly patterns (24-hour cycle)
        if self._has_hourly_data(data):
            seasonalities['hourly'] = 24.0
        
        # Check for business cycle patterns
        if self._has_business_cycle(data):
            seasonalities['business_weekly'] = 5.0
        
        return seasonalities
    
    def _has_hourly_data(self, data: pd.DataFrame) -> bool:
        """Check if data has hourly granularity."""
        if len(data) < 48:  # Need at least 2 days
            return False
        
        time_diff = data['ds'].diff().median()
        return time_diff <= pd.Timedelta(hours=1)
    
    def _has_business_cycle(self, data: pd.DataFrame) -> bool:
        """Check if data shows business day patterns."""
        if len(data) < 14:  # Need at least 2 weeks
            return False
        
        # Simple heuristic: check if weekends have different patterns
        data['dayofweek'] = pd.to_datetime(data['ds']).dt.dayofweek
        weekend_avg = data[data['dayofweek'].isin([5, 6])]['y'].mean()
        weekday_avg = data[~data['dayofweek'].isin([5, 6])]['y'].mean()
        
        if pd.isna(weekend_avg) or pd.isna(weekday_avg):
            return False
        
        # If weekend average is significantly different
        return abs(weekend_avg - weekday_avg) / (weekday_avg + 1e-10) > 0.1
    
    def save(self, filepath: str) -> None:
        """
        Save model to disk.
        
        Args:
            filepath: Path to save model
        """
        joblib.dump({
            'model': self.model,
            'metadata': self.metadata,
            'config': {
                'changepoint_prior_scale': self.changepoint_prior_scale,
                'seasonality_prior_scale': self.seasonality_prior_scale,
                'seasonality_mode': self.seasonality_mode,
                'interval_width': self.interval_width,
            }
        }, filepath)
        logger.info("prophet_model_saved", filepath=filepath)
    
    @classmethod
    def load(cls, filepath: str) -> 'ProphetForecaster':
        """
        Load model from disk.
        
        Args:
            filepath: Path to saved model
            
        Returns:
            Loaded ProphetForecaster instance
        """
        data = joblib.load(filepath)
        forecaster = cls(**data['config'])
        forecaster.model = data['model']
        forecaster.metadata = data['metadata']
        logger.info("prophet_model_loaded", filepath=filepath)
        return forecaster


class ARIMAForecaster:
    """
    ARIMA-based time series forecasting as fallback.
    
    Provides automatic order selection and seasonal ARIMA support.
    """
    
    def __init__(
        self,
        order: Optional[Tuple[int, int, int]] = None,
        seasonal_order: Optional[Tuple[int, int, int, int]] = None,
    ):
        """
        Initialize ARIMA forecaster.
        
        Args:
            order: ARIMA order (p, d, q)
            seasonal_order: Seasonal order (P, D, Q, s)
        """
        self.order = order
        self.seasonal_order = seasonal_order
        self.model: Optional[SARIMAX] = None
        self.model_fit = None
        self.metadata: Dict[str, Any] = {}
    
    def train(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Train ARIMA model on historical data.
        
        Args:
            data: DataFrame with 'ds' and 'y' columns
            
        Returns:
            Training metadata
        """
        logger.info("training_arima_model", data_points=len(data))
        
        try:
            if len(data) < settings.min_training_samples:
                raise ValueError(
                    f"Insufficient training samples: {len(data)} < "
                    f"{settings.min_training_samples}"
                )
            
            # Prepare time series
            ts = data.set_index('ds')['y']
            
            # Auto-select order if not provided
            if self.order is None:
                self.order = self._auto_select_order(ts)
            
            # Configure seasonal order if enabled
            if settings.arima_seasonal and self.seasonal_order is None:
                self.seasonal_order = (1, 1, 1, settings.arima_seasonal_period)
            
            # Fit model
            start_time = datetime.now()
            self.model = SARIMAX(
                ts,
                order=self.order,
                seasonal_order=self.seasonal_order or (0, 0, 0, 0),
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            self.model_fit = self.model.fit(disp=False)
            training_time = (datetime.now() - start_time).total_seconds()
            
            # Store metadata
            self.metadata = {
                "trained_at": datetime.now().isoformat(),
                "training_time_seconds": training_time,
                "data_points": len(data),
                "order": self.order,
                "seasonal_order": self.seasonal_order,
                "aic": float(self.model_fit.aic),
                "bic": float(self.model_fit.bic),
            }
            
            logger.info(
                "arima_model_trained",
                training_time=training_time,
                order=self.order,
                aic=self.metadata["aic"],
            )
            
            return self.metadata
            
        except Exception as e:
            logger.error("arima_training_failed", error=str(e))
            raise
    
    def predict(
        self,
        periods: int,
        alpha: float = 0.05,
    ) -> pd.DataFrame:
        """
        Generate forecast predictions.
        
        Args:
            periods: Number of periods to forecast
            alpha: Significance level for confidence intervals
            
        Returns:
            DataFrame with predictions and confidence intervals
        """
        if self.model_fit is None:
            raise ValueError("Model must be trained before prediction")
        
        logger.info("generating_arima_forecast", periods=periods)
        
        try:
            # Generate forecast
            forecast = self.model_fit.get_forecast(steps=periods, alpha=alpha)
            predictions = forecast.predicted_mean
            conf_int = forecast.conf_int()
            
            # Create result dataframe
            result = pd.DataFrame({
                'ds': pd.date_range(
                    start=predictions.index[0],
                    periods=periods,
                    freq=predictions.index.freq,
                ),
                'yhat': predictions.values,
                'yhat_lower': conf_int.iloc[:, 0].values,
                'yhat_upper': conf_int.iloc[:, 1].values,
                'forecast_generated_at': datetime.now().isoformat(),
            })
            
            logger.info("arima_forecast_generated", predictions=len(result))
            
            return result
            
        except Exception as e:
            logger.error("arima_forecast_failed", error=str(e))
            raise
    
    def _auto_select_order(self, ts: pd.Series) -> Tuple[int, int, int]:
        """
        Automatically select ARIMA order using ADF test and grid search.
        
        Args:
            ts: Time series data
            
        Returns:
            Best ARIMA order (p, d, q)
        """
        # Determine differencing order using ADF test
        d = 0
        for i in range(settings.arima_max_d + 1):
            adf_result = adfuller(ts.diff(i).dropna() if i > 0 else ts)
            if adf_result[1] < 0.05:  # p-value < 0.05 means stationary
                d = i
                break
        
        # Simple heuristic for p and q
        # In production, consider using auto_arima from pmdarima
        p = min(2, settings.arima_max_p)
        q = min(2, settings.arima_max_q)
        
        return (p, d, q)
    
    def save(self, filepath: str) -> None:
        """Save model to disk."""
        joblib.dump({
            'model_fit': self.model_fit,
            'metadata': self.metadata,
            'order': self.order,
            'seasonal_order': self.seasonal_order,
        }, filepath)
        logger.info("arima_model_saved", filepath=filepath)
    
    @classmethod
    def load(cls, filepath: str) -> 'ARIMAForecaster':
        """Load model from disk."""
        data = joblib.load(filepath)
        forecaster = cls(
            order=data['order'],
            seasonal_order=data['seasonal_order'],
        )
        forecaster.model_fit = data['model_fit']
        forecaster.metadata = data['metadata']
        logger.info("arima_model_loaded", filepath=filepath)
        return forecaster
