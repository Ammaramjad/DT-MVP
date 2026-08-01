"""
Energy vertical KPI calculations.
"""
from datetime import date
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.energy import EnergyData, PeriodType
from app.core.exceptions import ValidationError


def calculate_total_cost(consumption_data: List[Dict[str, Any]]) -> float:
    """
    Calculate total energy cost from consumption data.
    
    Args:
        consumption_data: List of consumption records with 'kwh' and 'tariff_rate'
        
    Returns:
        Total cost in currency units
    """
    if not consumption_data:
        return 0.0
    
    total_cost = 0.0
    for record in consumption_data:
        kwh = record.get('kwh', 0)
        tariff = record.get('tariff_rate', 0)
        total_cost += kwh * tariff
    
    return round(total_cost, 2)


def calculate_peak_demand_cost(demand_data: List[float], demand_charge: float) -> float:
    """
    Calculate peak demand cost.
    
    Args:
        demand_data: List of demand readings in kW
        demand_charge: Demand charge rate per kW
        
    Returns:
        Peak demand cost in currency units
    """
    if not demand_data or demand_charge <= 0:
        return 0.0
    
    peak_demand = max(demand_data)
    peak_cost = peak_demand * demand_charge
    
    return round(peak_cost, 2)


def calculate_energy_intensity(kwh: float, production_units: float) -> float:
    """
    Calculate energy intensity (kWh per unit of output).
    
    Args:
        kwh: Total energy consumed in kWh
        production_units: Total production units
        
    Returns:
        Energy intensity (kWh per unit)
    """
    if production_units <= 0:
        return 0.0
    
    intensity = kwh / production_units
    return round(intensity, 4)


def calculate_solar_contribution(solar_kwh: float, total_kwh: float) -> float:
    """
    Calculate solar generation contribution percentage.
    
    Args:
        solar_kwh: Solar generation in kWh
        total_kwh: Total energy consumption in kWh
        
    Returns:
        Solar contribution percentage (0-100)
    """
    if total_kwh <= 0:
        return 0.0
    
    contribution = (solar_kwh / total_kwh) * 100
    return round(min(contribution, 100.0), 2)


def calculate_load_factor(avg_demand: float, peak_demand: float) -> float:
    """
    Calculate load factor (average load / peak load).
    
    Args:
        avg_demand: Average demand in kW
        peak_demand: Peak demand in kW
        
    Returns:
        Load factor (0-1)
    """
    if peak_demand <= 0:
        return 0.0
    
    load_factor = avg_demand / peak_demand
    return round(min(load_factor, 1.0), 4)


def calculate_carbon_emissions(kwh: float, grid_factor: float = 0.5) -> float:
    """
    Calculate carbon emissions from energy consumption.
    
    Args:
        kwh: Total energy consumed in kWh
        grid_factor: Carbon intensity factor (kg CO2 per kWh), default 0.5
        
    Returns:
        Carbon emissions in kg CO2
    """
    if kwh <= 0:
        return 0.0
    
    emissions = kwh * grid_factor
    return round(emissions, 2)


def compute_kpis(
    site_id: UUID,
    start_date: date,
    end_date: date,
    db: Session
) -> Dict[str, Any]:
    """
    Compute all energy KPIs for a site and date range.
    
    Args:
        site_id: Site identifier
        start_date: Start date for KPI calculation
        end_date: End date for KPI calculation
        db: Database session
        
    Returns:
        Dictionary containing all computed energy KPIs
    """
    # Query energy data for the date range
    data_query = db.query(EnergyData).filter(
        EnergyData.site_id == site_id,
        EnergyData.time >= start_date,
        EnergyData.time < end_date
    )
    
    data_points = data_query.all()
    
    if not data_points:
        raise ValidationError(f"No energy data found for site {site_id} in date range")
    
    # Aggregate metrics
    total_kwh = sum(d.kwh_consumed for d in data_points)
    total_solar_kwh = sum(d.solar_generation_kwh or 0 for d in data_points)
    
    # Calculate total cost
    consumption_data = [
        {
            'kwh': d.kwh_consumed,
            'tariff_rate': d.tariff_rate or 0.12  # Default tariff if not provided
        }
        for d in data_points
    ]
    total_cost = calculate_total_cost(consumption_data)
    
    # Calculate peak demand cost
    demand_data = [d.demand_kw for d in data_points if d.demand_kw is not None]
    peak_demand_cost = calculate_peak_demand_cost(demand_data, demand_charge=15.0)
    
    # Calculate energy intensity (assume 1000 production units for demo)
    # In production, this should come from manufacturing data or site metadata
    assumed_production_units = 1000
    energy_intensity = calculate_energy_intensity(total_kwh, assumed_production_units)
    
    # Calculate solar contribution
    solar_contribution_pct = calculate_solar_contribution(total_solar_kwh, total_kwh)
    
    # Calculate load factor
    if demand_data:
        avg_demand = sum(demand_data) / len(demand_data)
        peak_demand = max(demand_data)
        load_factor = calculate_load_factor(avg_demand, peak_demand)
    else:
        load_factor = 0.0
    
    # Calculate carbon emissions (using default grid factor)
    carbon_emissions = calculate_carbon_emissions(total_kwh, grid_factor=0.5)
    
    # Calculate data quality score
    data_quality_score = calculate_data_quality(data_points)
    
    # Calculate average tariff rate
    tariff_rates = [d.tariff_rate for d in data_points if d.tariff_rate is not None]
    avg_tariff_rate = sum(tariff_rates) / len(tariff_rates) if tariff_rates else 0.12
    
    # Breakdown by period type
    peak_kwh = sum(d.kwh_consumed for d in data_points if d.period_type == PeriodType.PEAK)
    off_peak_kwh = sum(d.kwh_consumed for d in data_points if d.period_type == PeriodType.OFF_PEAK)
    standard_kwh = sum(d.kwh_consumed for d in data_points if d.period_type == PeriodType.STANDARD)
    
    return {
        'site_id': site_id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_cost': total_cost,
        'peak_demand_cost': peak_demand_cost,
        'energy_intensity': energy_intensity,
        'solar_contribution_pct': solar_contribution_pct,
        'load_factor': load_factor,
        'carbon_emissions': carbon_emissions,
        'total_kwh': total_kwh,
        'total_solar_kwh': total_solar_kwh,
        'avg_tariff_rate': round(avg_tariff_rate, 4),
        'peak_kwh': peak_kwh,
        'off_peak_kwh': off_peak_kwh,
        'standard_kwh': standard_kwh,
        'data_quality_score': data_quality_score
    }


def calculate_data_quality(data_points: List[EnergyData]) -> float:
    """
    Calculate data quality score based on completeness.
    
    Args:
        data_points: List of energy data points
        
    Returns:
        Quality score between 0 and 1
    """
    if not data_points:
        return 0.0
    
    total_fields = 0
    populated_fields = 0
    
    for point in data_points:
        fields = [
            point.kwh_consumed,
            point.tariff_rate,
            point.period_type,
            point.solar_generation_kwh,
            point.power_factor,
            point.demand_kw
        ]
        
        for field in fields:
            total_fields += 1
            if field is not None:
                populated_fields += 1
    
    if total_fields == 0:
        return 0.0
    
    return round(populated_fields / total_fields, 4)
