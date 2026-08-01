"""
Simulation service for what-if scenario analysis.
"""
from datetime import date
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.simulation import Simulation, SimulationStatus
from app.models.site import Site
from app.schemas.simulation import SimulationRequest
from app.services import kpi_service
from app.core.exceptions import ValidationError


def run_simulation(
    simulation_request: SimulationRequest, 
    db: Session
) -> Dict[str, Any]:
    """
    Orchestrate simulation execution for what-if scenario analysis.
    
    Args:
        simulation_request: Simulation request with scenario parameters
        db: Database session
        
    Returns:
        Dictionary containing simulation results with baseline and simulated KPIs
        
    Raises:
        ValidationError: If site doesn't exist or dates are invalid
    """
    # Validate site exists
    site = db.query(Site).filter(Site.id == simulation_request.site_id).first()
    if not site:
        raise ValidationError(f"Site {simulation_request.site_id} not found")
    
    # Get baseline KPIs from base period
    base_start, base_end = simulation_request.base_period
    baseline_kpis = kpi_service.compute_kpis_by_vertical(
        simulation_request.site_id, 
        base_start, 
        base_end, 
        db
    )
    
    # Apply variable overrides to generate simulated KPIs
    simulated_kpis = apply_variable_overrides(
        baseline_kpis, 
        simulation_request.variable_overrides
    )
    
    # Calculate deltas between baseline and simulated
    deltas = calculate_simulation_results(baseline_kpis, simulated_kpis)
    
    # Generate confidence score based on data quality and model metrics
    confidence_score = generate_confidence_score(
        data_quality=baseline_kpis.get('data_quality_score', 0.8),
        model_metrics={'accuracy': 0.9, 'completeness': 0.85}
    )
    
    # Generate time series data (simplified for MVP)
    forecast_start, forecast_end = simulation_request.forecast_period
    timeseries = generate_timeseries(
        baseline_kpis, 
        simulated_kpis, 
        forecast_start, 
        forecast_end
    )
    
    # Prepare simulation notes
    simulation_notes = generate_simulation_notes(
        simulation_request.variable_overrides,
        deltas
    )
    
    return {
        'site_id': simulation_request.site_id,
        'scenario_name': simulation_request.scenario_name,
        'baseline_kpis': baseline_kpis,
        'simulated_kpis': simulated_kpis,
        'deltas': deltas,
        'timeseries': timeseries,
        'confidence_score': confidence_score,
        'simulation_notes': simulation_notes
    }


def apply_variable_overrides(
    base_data: Dict[str, Any], 
    overrides: Dict[str, float]
) -> Dict[str, Any]:
    """
    Apply variable overrides to baseline data with percentage/absolute adjustments.
    
    Args:
        base_data: Baseline KPI data dictionary
        overrides: Dictionary of variable overrides (e.g., {'throughput_multiplier': 1.1})
        
    Returns:
        Dictionary with adjusted KPI values
    """
    simulated_data = base_data.copy()
    
    # Apply multipliers and direct overrides
    for key, value in overrides.items():
        if key.endswith('_multiplier'):
            # Extract base key (e.g., 'throughput_multiplier' -> 'throughput')
            base_key = key.replace('_multiplier', '')
            if base_key in simulated_data:
                simulated_data[base_key] = simulated_data[base_key] * value
        elif key.endswith('_target'):
            # Direct value override (e.g., 'quality_target' -> 'quality')
            base_key = key.replace('_target', '')
            if base_key in simulated_data or key in simulated_data:
                target_key = base_key if base_key in simulated_data else key
                simulated_data[target_key] = value
        else:
            # Direct override
            if key in simulated_data:
                simulated_data[key] = value
    
    return simulated_data


def calculate_simulation_results(
    baseline_data: Dict[str, Any], 
    simulated_data: Dict[str, Any]
) -> Dict[str, Dict[str, float]]:
    """
    Calculate deltas between baseline and simulated data.
    
    Args:
        baseline_data: Baseline KPI dictionary
        simulated_data: Simulated KPI dictionary
        
    Returns:
        Dictionary with absolute and percentage deltas for each KPI
    """
    deltas = {}
    
    for key in baseline_data.keys():
        if key in simulated_data and isinstance(baseline_data[key], (int, float)):
            baseline_value = baseline_data[key]
            simulated_value = simulated_data[key]
            
            absolute_delta = simulated_value - baseline_value
            
            # Avoid division by zero
            if baseline_value != 0:
                percentage_delta = (absolute_delta / baseline_value) * 100
            else:
                percentage_delta = 0.0 if absolute_delta == 0 else float('inf')
            
            deltas[key] = {
                'absolute': round(absolute_delta, 2),
                'percentage': round(percentage_delta, 2)
            }
    
    return deltas


def generate_confidence_score(
    data_quality: float, 
    model_metrics: Dict[str, float]
) -> float:
    """
    Generate confidence score for simulation accuracy.
    
    Args:
        data_quality: Data quality score (0-1)
        model_metrics: Dictionary of model performance metrics
        
    Returns:
        Confidence score between 0 and 1
    """
    # Weighted average of data quality and model metrics
    accuracy = model_metrics.get('accuracy', 0.8)
    completeness = model_metrics.get('completeness', 0.8)
    
    confidence = (
        data_quality * 0.4 + 
        accuracy * 0.4 + 
        completeness * 0.2
    )
    
    return round(min(max(confidence, 0.0), 1.0), 4)


def generate_timeseries(
    baseline_kpis: Dict[str, Any],
    simulated_kpis: Dict[str, Any],
    start_date: date,
    end_date: date
) -> List[Dict[str, Any]]:
    """
    Generate time series data for visualization.
    
    Args:
        baseline_kpis: Baseline KPI values
        simulated_kpis: Simulated KPI values
        start_date: Forecast start date
        end_date: Forecast end date
        
    Returns:
        List of time series data points
    """
    # Simplified implementation - generate monthly data points
    timeseries = []
    current_date = start_date
    
    while current_date <= end_date:
        point = {
            'timestamp': current_date.isoformat()
        }
        
        # Add baseline and simulated values for each KPI
        for key, value in baseline_kpis.items():
            if isinstance(value, (int, float)):
                point[f'baseline_{key}'] = value
                point[f'simulated_{key}'] = simulated_kpis.get(key, value)
        
        timeseries.append(point)
        
        # Move to next month (simplified)
        if current_date.month == 12:
            current_date = date(current_date.year + 1, 1, current_date.day)
        else:
            current_date = date(current_date.year, current_date.month + 1, current_date.day)
    
    return timeseries


def generate_simulation_notes(
    overrides: Dict[str, float],
    deltas: Dict[str, Dict[str, float]]
) -> str:
    """
    Generate human-readable simulation notes.
    
    Args:
        overrides: Variable overrides applied
        deltas: Calculated deltas
        
    Returns:
        Simulation notes string
    """
    notes = []
    
    notes.append(f"Applied {len(overrides)} variable override(s):")
    for key, value in overrides.items():
        notes.append(f"  - {key}: {value}")
    
    # Highlight significant changes
    significant_changes = [
        f"{key}: {delta['percentage']:.1f}%"
        for key, delta in deltas.items()
        if abs(delta['percentage']) > 5
    ]
    
    if significant_changes:
        notes.append("\nSignificant KPI changes (>5%):")
        notes.extend([f"  - {change}" for change in significant_changes])
    
    return "\n".join(notes)
