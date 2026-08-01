"""
Data Preprocessing Utilities

Provides utilities for time series preprocessing, feature engineering,
and data quality improvements.
"""
from typing import Optional, List, Dict
import pandas as pd
import numpy as np
import structlog

from app.config import settings


logger = structlog.get_logger()


def preprocess_time_series(
    data: pd.DataFrame,
    resample_freq: Optional[str] = None,
    handle_missing: bool = True,
    remove_outliers: bool = False,
    outlier_threshold: Optional[float] = None,
) -> pd.DataFrame:
    """
    Preprocess time series data.
    
    Args:
        data: DataFrame with 'ds' (datetime) and 'y' (value) columns
        resample_freq: Resampling frequency (e.g., '1H', '1D')
        handle_missing: Whether to handle missing values
        remove_outliers: Whether to remove outliers
        outlier_threshold: Threshold for outlier detection (std deviations)
        
    Returns:
        Preprocessed DataFrame
    """
    logger.info(
        "preprocessing_time_series",
        data_points=len(data),
        resample_freq=resample_freq,
    )
    
    df = data.copy()
    
    # Ensure datetime index
    if 'ds' in df.columns:
        df['ds'] = pd.to_datetime(df['ds'])
        df = df.sort_values('ds')
    
    # Resample if requested
    if resample_freq:
        df = resample_time_series(df, frequency=resample_freq)
    
    # Handle missing values
    if handle_missing:
        df = handle_missing_values(df, strategy=settings.missing_value_strategy)
    
    # Remove outliers
    if remove_outliers:
        threshold = outlier_threshold or settings.outlier_std_threshold
        df = remove_outliers_from_series(df, threshold=threshold)
    
    logger.info("time_series_preprocessed", output_points=len(df))
    
    return df


def resample_time_series(
    data: pd.DataFrame,
    frequency: str = "1H",
    aggregation: str = "mean",
) -> pd.DataFrame:
    """
    Resample time series to a specific frequency.
    
    Args:
        data: DataFrame with 'ds' and 'y' columns
        frequency: Target frequency (e.g., '1H', '1D')
        aggregation: Aggregation method ('mean', 'sum', 'median')
        
    Returns:
        Resampled DataFrame
    """
    logger.info("resampling_time_series", frequency=frequency, aggregation=aggregation)
    
    df = data.copy()
    
    if 'ds' not in df.columns or 'y' not in df.columns:
        raise ValueError("Data must have 'ds' and 'y' columns")
    
    # Set datetime index
    df = df.set_index('ds')
    
    # Resample based on aggregation method
    if aggregation == "mean":
        df_resampled = df.resample(frequency).mean()
    elif aggregation == "sum":
        df_resampled = df.resample(frequency).sum()
    elif aggregation == "median":
        df_resampled = df.resample(frequency).median()
    else:
        raise ValueError(f"Unsupported aggregation method: {aggregation}")
    
    # Reset index
    df_resampled = df_resampled.reset_index()
    
    return df_resampled


def handle_missing_values(
    data: pd.DataFrame,
    strategy: str = "interpolate",
    columns: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Handle missing values in DataFrame.
    
    Args:
        data: Input DataFrame
        strategy: Strategy to use ('interpolate', 'forward_fill', 'backward_fill', 'mean', 'drop')
        columns: Specific columns to process (default: all numeric columns)
        
    Returns:
        DataFrame with missing values handled
    """
    df = data.copy()
    
    # Determine columns to process
    if columns is None:
        columns = df.select_dtypes(include=[np.number]).columns.tolist()
    
    missing_count = df[columns].isna().sum().sum()
    
    if missing_count == 0:
        return df
    
    logger.info(
        "handling_missing_values",
        strategy=strategy,
        missing_count=missing_count,
    )
    
    if strategy == "interpolate":
        # Time-aware interpolation for time series
        df[columns] = df[columns].interpolate(method='time', limit_direction='both')
        
    elif strategy == "forward_fill":
        df[columns] = df[columns].fillna(method='ffill')
        
    elif strategy == "backward_fill":
        df[columns] = df[columns].fillna(method='bfill')
        
    elif strategy == "mean":
        df[columns] = df[columns].fillna(df[columns].mean())
        
    elif strategy == "drop":
        df = df.dropna(subset=columns)
        
    else:
        raise ValueError(f"Unsupported strategy: {strategy}")
    
    # Final check - if still NaN, fill with 0
    remaining_missing = df[columns].isna().sum().sum()
    if remaining_missing > 0:
        logger.warning(
            "remaining_missing_values_filled_with_zero",
            count=remaining_missing,
        )
        df[columns] = df[columns].fillna(0)
    
    return df


def remove_outliers_from_series(
    data: pd.DataFrame,
    threshold: float = 3.0,
    columns: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Remove outliers using z-score method.
    
    Args:
        data: Input DataFrame
        threshold: Number of standard deviations for outlier detection
        columns: Specific columns to check (default: 'y' column)
        
    Returns:
        DataFrame with outliers removed
    """
    df = data.copy()
    
    # Default to 'y' column for time series
    if columns is None:
        columns = ['y'] if 'y' in df.columns else df.select_dtypes(include=[np.number]).columns.tolist()
    
    initial_count = len(df)
    
    for col in columns:
        if col not in df.columns:
            continue
        
        # Calculate z-scores
        mean = df[col].mean()
        std = df[col].std()
        
        if std == 0:
            continue
        
        z_scores = np.abs((df[col] - mean) / std)
        
        # Remove outliers
        df = df[z_scores < threshold]
    
    outliers_removed = initial_count - len(df)
    
    if outliers_removed > 0:
        logger.info(
            "outliers_removed",
            count=outliers_removed,
            threshold=threshold,
        )
    
    return df


def engineer_time_features(data: pd.DataFrame, datetime_col: str = 'ds') -> pd.DataFrame:
    """
    Engineer time-based features from datetime column.
    
    Args:
        data: Input DataFrame
        datetime_col: Name of datetime column
        
    Returns:
        DataFrame with additional time features
    """
    df = data.copy()
    
    if datetime_col not in df.columns:
        raise ValueError(f"Column '{datetime_col}' not found in data")
    
    # Ensure datetime type
    df[datetime_col] = pd.to_datetime(df[datetime_col])
    
    # Extract time features
    df['hour'] = df[datetime_col].dt.hour
    df['day_of_week'] = df[datetime_col].dt.dayofweek
    df['day_of_month'] = df[datetime_col].dt.day
    df['month'] = df[datetime_col].dt.month
    df['quarter'] = df[datetime_col].dt.quarter
    df['year'] = df[datetime_col].dt.year
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # Cyclical encoding for periodic features
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    logger.info("time_features_engineered", features_added=12)
    
    return df


def create_lag_features(
    data: pd.DataFrame,
    value_col: str = 'y',
    lags: List[int] = [1, 7, 24],
) -> pd.DataFrame:
    """
    Create lag features for time series.
    
    Args:
        data: Input DataFrame
        value_col: Column to create lags from
        lags: List of lag periods
        
    Returns:
        DataFrame with lag features
    """
    df = data.copy()
    
    if value_col not in df.columns:
        raise ValueError(f"Column '{value_col}' not found in data")
    
    for lag in lags:
        df[f'{value_col}_lag_{lag}'] = df[value_col].shift(lag)
    
    logger.info("lag_features_created", lags=lags)
    
    return df


def create_rolling_features(
    data: pd.DataFrame,
    value_col: str = 'y',
    windows: List[int] = [7, 14, 30],
) -> pd.DataFrame:
    """
    Create rolling window features.
    
    Args:
        data: Input DataFrame
        value_col: Column to create rolling features from
        windows: List of window sizes
        
    Returns:
        DataFrame with rolling features
    """
    df = data.copy()
    
    if value_col not in df.columns:
        raise ValueError(f"Column '{value_col}' not found in data")
    
    for window in windows:
        df[f'{value_col}_rolling_mean_{window}'] = (
            df[value_col].rolling(window=window, min_periods=1).mean()
        )
        df[f'{value_col}_rolling_std_{window}'] = (
            df[value_col].rolling(window=window, min_periods=1).std()
        )
    
    logger.info("rolling_features_created", windows=windows)
    
    return df


def prepare_features(
    data: pd.DataFrame,
    feature_names: List[str],
    handle_missing: bool = True,
    scale: bool = False,
) -> pd.DataFrame:
    """
    Prepare features for model training.
    
    Args:
        data: Input DataFrame
        feature_names: List of feature column names
        handle_missing: Whether to handle missing values
        scale: Whether to scale features (handled by models)
        
    Returns:
        Preprocessed DataFrame with selected features
    """
    logger.info(
        "preparing_features",
        features=feature_names,
        handle_missing=handle_missing,
    )
    
    df = data.copy()
    
    # Select features
    available_features = [f for f in feature_names if f in df.columns]
    
    if len(available_features) < len(feature_names):
        missing = [f for f in feature_names if f not in df.columns]
        logger.warning("missing_features", features=missing)
    
    df = df[available_features]
    
    # Handle missing values
    if handle_missing:
        df = handle_missing_values(df, strategy=settings.missing_value_strategy)
    
    return df


def detect_seasonality(
    data: pd.DataFrame,
    value_col: str = 'y',
    periods: Optional[List[int]] = None,
) -> Dict[str, float]:
    """
    Detect seasonality in time series data.
    
    Args:
        data: Time series DataFrame
        value_col: Column name for values
        periods: Periods to test (default: [24, 168, 8760] for hourly data)
        
    Returns:
        Dictionary of detected seasonalities with strength scores
    """
    from scipy import signal
    
    if periods is None:
        periods = [24, 168, 8760]  # Daily, weekly, yearly for hourly data
    
    if value_col not in data.columns:
        raise ValueError(f"Column '{value_col}' not found in data")
    
    values = data[value_col].values
    
    # Remove NaN
    values = values[~np.isnan(values)]
    
    if len(values) < 100:
        logger.warning("insufficient_data_for_seasonality_detection")
        return {}
    
    seasonalities = {}
    
    for period in periods:
        if len(values) < period * 2:
            continue
        
        # Calculate autocorrelation at the period
        if period < len(values):
            autocorr = np.corrcoef(values[:-period], values[period:])[0, 1]
            
            if not np.isnan(autocorr) and autocorr > 0.3:  # Threshold for significance
                seasonalities[f'period_{period}'] = float(autocorr)
    
    logger.info("seasonality_detected", seasonalities=seasonalities)
    
    return seasonalities
