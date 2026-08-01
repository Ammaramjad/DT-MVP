"""
Model Evaluation Utilities

Provides utilities for calculating performance metrics, generating reports,
and computing confidence intervals.
"""
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
import structlog


logger = structlog.get_logger()


def evaluate_forecast(
    actual: pd.Series,
    predicted: pd.Series,
    confidence_lower: Optional[pd.Series] = None,
    confidence_upper: Optional[pd.Series] = None,
) -> Dict[str, float]:
    """
    Evaluate forecast predictions against actual values.
    
    Args:
        actual: Actual values
        predicted: Predicted values
        confidence_lower: Lower confidence bound (optional)
        confidence_upper: Upper confidence bound (optional)
        
    Returns:
        Dictionary of evaluation metrics
    """
    logger.info("evaluating_forecast", samples=len(actual))
    
    # Align series
    actual, predicted = actual.align(predicted, join='inner')
    
    if len(actual) == 0:
        logger.warning("no_overlapping_data_for_evaluation")
        return {}
    
    # Remove NaN values
    mask = ~(actual.isna() | predicted.isna())
    actual = actual[mask]
    predicted = predicted[mask]
    
    if len(actual) == 0:
        logger.warning("no_valid_data_for_evaluation")
        return {}
    
    # Calculate metrics
    metrics = {
        "mae": calculate_mae(actual, predicted),
        "rmse": calculate_rmse(actual, predicted),
        "mape": calculate_mape(actual, predicted),
        "mse": calculate_mse(actual, predicted),
        "r2": calculate_r2(actual, predicted),
        "samples": len(actual),
    }
    
    # Calculate confidence interval metrics if available
    if confidence_lower is not None and confidence_upper is not None:
        confidence_lower, _ = confidence_lower.align(actual, join='inner')
        confidence_upper, _ = confidence_upper.align(actual, join='inner')
        
        confidence_lower = confidence_lower[mask]
        confidence_upper = confidence_upper[mask]
        
        coverage = calculate_coverage(actual, confidence_lower, confidence_upper)
        metrics["confidence_coverage"] = coverage
    
    logger.info("forecast_evaluated", metrics=metrics)
    
    return metrics


def calculate_mae(actual: pd.Series, predicted: pd.Series) -> float:
    """
    Calculate Mean Absolute Error.
    
    Args:
        actual: Actual values
        predicted: Predicted values
        
    Returns:
        MAE value
    """
    return float(np.mean(np.abs(actual - predicted)))


def calculate_rmse(actual: pd.Series, predicted: pd.Series) -> float:
    """
    Calculate Root Mean Squared Error.
    
    Args:
        actual: Actual values
        predicted: Predicted values
        
    Returns:
        RMSE value
    """
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))


def calculate_mse(actual: pd.Series, predicted: pd.Series) -> float:
    """
    Calculate Mean Squared Error.
    
    Args:
        actual: Actual values
        predicted: Predicted values
        
    Returns:
        MSE value
    """
    return float(np.mean((actual - predicted) ** 2))


def calculate_mape(actual: pd.Series, predicted: pd.Series) -> float:
    """
    Calculate Mean Absolute Percentage Error.
    
    Args:
        actual: Actual values
        predicted: Predicted values
        
    Returns:
        MAPE value (as percentage)
    """
    # Avoid division by zero
    mask = actual != 0
    if mask.sum() == 0:
        return float('inf')
    
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)


def calculate_r2(actual: pd.Series, predicted: pd.Series) -> float:
    """
    Calculate R² (coefficient of determination).
    
    Args:
        actual: Actual values
        predicted: Predicted values
        
    Returns:
        R² value
    """
    ss_res = np.sum((actual - predicted) ** 2)
    ss_tot = np.sum((actual - actual.mean()) ** 2)
    
    if ss_tot == 0:
        return 0.0
    
    return float(1 - (ss_res / ss_tot))


def calculate_coverage(
    actual: pd.Series,
    lower: pd.Series,
    upper: pd.Series,
) -> float:
    """
    Calculate confidence interval coverage.
    
    Args:
        actual: Actual values
        lower: Lower confidence bound
        upper: Upper confidence bound
        
    Returns:
        Coverage percentage (0-100)
    """
    within_interval = ((actual >= lower) & (actual <= upper)).sum()
    return float(within_interval / len(actual) * 100)


def calculate_quantile_loss(
    actual: pd.Series,
    predicted: pd.Series,
    quantile: float = 0.5,
) -> float:
    """
    Calculate quantile loss (pinball loss).
    
    Args:
        actual: Actual values
        predicted: Predicted values
        quantile: Quantile to evaluate
        
    Returns:
        Quantile loss value
    """
    errors = actual - predicted
    loss = np.where(
        errors >= 0,
        quantile * errors,
        (quantile - 1) * errors,
    )
    return float(np.mean(loss))


def calculate_smape(actual: pd.Series, predicted: pd.Series) -> float:
    """
    Calculate Symmetric Mean Absolute Percentage Error.
    
    Args:
        actual: Actual values
        predicted: Predicted values
        
    Returns:
        SMAPE value (as percentage)
    """
    numerator = np.abs(actual - predicted)
    denominator = (np.abs(actual) + np.abs(predicted)) / 2
    
    # Avoid division by zero
    mask = denominator != 0
    if mask.sum() == 0:
        return float('inf')
    
    return float(np.mean(numerator[mask] / denominator[mask]) * 100)


def generate_evaluation_report(
    actual: pd.Series,
    predicted: pd.Series,
    model_name: str = "Model",
    confidence_lower: Optional[pd.Series] = None,
    confidence_upper: Optional[pd.Series] = None,
) -> Dict[str, any]:
    """
    Generate comprehensive evaluation report.
    
    Args:
        actual: Actual values
        predicted: Predicted values
        model_name: Name of the model
        confidence_lower: Lower confidence bound (optional)
        confidence_upper: Upper confidence bound (optional)
        
    Returns:
        Evaluation report dictionary
    """
    logger.info("generating_evaluation_report", model=model_name)
    
    # Calculate all metrics
    metrics = evaluate_forecast(actual, predicted, confidence_lower, confidence_upper)
    
    # Add additional metrics
    metrics["smape"] = calculate_smape(actual, predicted)
    
    # Calculate error statistics
    errors = actual - predicted
    error_stats = {
        "mean_error": float(errors.mean()),
        "std_error": float(errors.std()),
        "min_error": float(errors.min()),
        "max_error": float(errors.max()),
    }
    
    # Create report
    report = {
        "model_name": model_name,
        "timestamp": pd.Timestamp.now().isoformat(),
        "metrics": metrics,
        "error_statistics": error_stats,
        "summary": _generate_summary(metrics),
    }
    
    logger.info("evaluation_report_generated", model=model_name)
    
    return report


def _generate_summary(metrics: Dict[str, float]) -> str:
    """
    Generate human-readable summary from metrics.
    
    Args:
        metrics: Dictionary of metrics
        
    Returns:
        Summary string
    """
    mae = metrics.get("mae", 0)
    rmse = metrics.get("rmse", 0)
    mape = metrics.get("mape", 0)
    r2 = metrics.get("r2", 0)
    
    summary_parts = [
        f"MAE: {mae:.2f}",
        f"RMSE: {rmse:.2f}",
        f"MAPE: {mape:.2f}%",
        f"R²: {r2:.4f}",
    ]
    
    if "confidence_coverage" in metrics:
        coverage = metrics["confidence_coverage"]
        summary_parts.append(f"Coverage: {coverage:.2f}%")
    
    return ", ".join(summary_parts)


def calculate_prediction_intervals(
    predictions: pd.Series,
    residuals: pd.Series,
    confidence_level: float = 0.95,
) -> Tuple[pd.Series, pd.Series]:
    """
    Calculate prediction intervals from residuals.
    
    Args:
        predictions: Predicted values
        residuals: Residuals from training
        confidence_level: Confidence level (default: 0.95)
        
    Returns:
        Tuple of (lower_bound, upper_bound)
    """
    # Calculate standard error
    std_error = residuals.std()
    
    # Calculate z-score for confidence level
    from scipy import stats
    alpha = 1 - confidence_level
    z_score = stats.norm.ppf(1 - alpha / 2)
    
    # Calculate intervals
    margin = z_score * std_error
    lower_bound = predictions - margin
    upper_bound = predictions + margin
    
    return lower_bound, upper_bound


def cross_validate_time_series(
    data: pd.DataFrame,
    model_func,
    n_splits: int = 5,
    test_size: int = 30,
) -> List[Dict[str, float]]:
    """
    Perform time series cross-validation.
    
    Args:
        data: Time series data
        model_func: Function that trains and returns predictions
        n_splits: Number of splits
        test_size: Size of test set
        
    Returns:
        List of evaluation metrics for each split
    """
    logger.info(
        "performing_cross_validation",
        n_splits=n_splits,
        test_size=test_size,
    )
    
    results = []
    min_train_size = len(data) // (n_splits + 1)
    
    for i in range(n_splits):
        # Define train/test split
        split_point = min_train_size + i * test_size
        train_end = split_point
        test_end = min(split_point + test_size, len(data))
        
        if test_end >= len(data):
            break
        
        train_data = data.iloc[:train_end]
        test_data = data.iloc[train_end:test_end]
        
        try:
            # Train and predict
            predictions = model_func(train_data, test_data)
            
            # Evaluate
            metrics = evaluate_forecast(
                actual=test_data['y'],
                predicted=predictions,
            )
            
            metrics['split'] = i
            results.append(metrics)
            
        except Exception as e:
            logger.warning(
                "cross_validation_split_failed",
                split=i,
                error=str(e),
            )
    
    logger.info("cross_validation_completed", splits=len(results))
    
    return results


def aggregate_cv_results(cv_results: List[Dict[str, float]]) -> Dict[str, float]:
    """
    Aggregate cross-validation results.
    
    Args:
        cv_results: List of CV metrics
        
    Returns:
        Aggregated metrics with mean and std
    """
    if not cv_results:
        return {}
    
    # Extract metric names (excluding 'split')
    metric_names = [k for k in cv_results[0].keys() if k != 'split']
    
    aggregated = {}
    
    for metric in metric_names:
        values = [result[metric] for result in cv_results if metric in result]
        
        if values:
            aggregated[f"{metric}_mean"] = float(np.mean(values))
            aggregated[f"{metric}_std"] = float(np.std(values))
            aggregated[f"{metric}_min"] = float(np.min(values))
            aggregated[f"{metric}_max"] = float(np.max(values))
    
    return aggregated


def calculate_bias(actual: pd.Series, predicted: pd.Series) -> float:
    """
    Calculate forecast bias.
    
    Args:
        actual: Actual values
        predicted: Predicted values
        
    Returns:
        Bias value (positive = over-forecast, negative = under-forecast)
    """
    return float(np.mean(predicted - actual))


def calculate_forecast_skill(
    actual: pd.Series,
    predicted: pd.Series,
    baseline_predictions: pd.Series,
) -> float:
    """
    Calculate forecast skill compared to baseline.
    
    Args:
        actual: Actual values
        predicted: Model predictions
        baseline_predictions: Baseline predictions (e.g., naive forecast)
        
    Returns:
        Skill score (0-1, where 1 is perfect)
    """
    model_mse = calculate_mse(actual, predicted)
    baseline_mse = calculate_mse(actual, baseline_predictions)
    
    if baseline_mse == 0:
        return 0.0
    
    skill = 1 - (model_mse / baseline_mse)
    return float(max(0.0, skill))
