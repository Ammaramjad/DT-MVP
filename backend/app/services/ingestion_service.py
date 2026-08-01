"""
Data ingestion service for validating and ingesting time-series data.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from app.models.manufacturing import ManufacturingData
from app.models.energy import EnergyData, PeriodType
from app.models.retail import RetailData
from app.models.data_quality_log import DataQualityLog
from app.core.exceptions import ValidationError


def validate_manufacturing_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate manufacturing data point.
    
    Args:
        data: Dictionary containing manufacturing data fields
        
    Returns:
        Dictionary with validation results including 'is_valid' and 'errors'
        
    Raises:
        ValidationError: If required fields are missing
    """
    errors = []
    
    # Check required fields
    required_fields = ['time', 'machine_id']
    for field in required_fields:
        if field not in data:
            errors.append(f"Missing required field: {field}")
    
    # Validate ranges
    if 'uptime_minutes' in data and data['uptime_minutes'] is not None:
        if data['uptime_minutes'] < 0 or data['uptime_minutes'] > 1440:  # Max 24 hours
            errors.append(f"uptime_minutes out of range: {data['uptime_minutes']}")
    
    if 'throughput_units' in data and data['throughput_units'] is not None:
        if data['throughput_units'] < 0:
            errors.append(f"throughput_units cannot be negative: {data['throughput_units']}")
    
    if 'defect_count' in data and data['defect_count'] is not None:
        if data['defect_count'] < 0:
            errors.append(f"defect_count cannot be negative: {data['defect_count']}")
    
    if 'quality_score' in data and data['quality_score'] is not None:
        if data['quality_score'] < 0 or data['quality_score'] > 100:
            errors.append(f"quality_score out of range: {data['quality_score']}")
    
    if 'cycle_time_seconds' in data and data['cycle_time_seconds'] is not None:
        if data['cycle_time_seconds'] <= 0:
            errors.append(f"cycle_time_seconds must be positive: {data['cycle_time_seconds']}")
    
    return {
        'is_valid': len(errors) == 0,
        'errors': errors,
        'data': data
    }


def validate_energy_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate energy data point.
    
    Args:
        data: Dictionary containing energy data fields
        
    Returns:
        Dictionary with validation results including 'is_valid' and 'errors'
    """
    errors = []
    
    # Check required fields
    required_fields = ['time', 'meter_id', 'kwh_consumed']
    for field in required_fields:
        if field not in data:
            errors.append(f"Missing required field: {field}")
    
    # Validate ranges
    if 'kwh_consumed' in data:
        if data['kwh_consumed'] < 0:
            errors.append(f"kwh_consumed cannot be negative: {data['kwh_consumed']}")
    
    if 'tariff_rate' in data and data['tariff_rate'] is not None:
        if data['tariff_rate'] < 0:
            errors.append(f"tariff_rate cannot be negative: {data['tariff_rate']}")
    
    if 'solar_generation_kwh' in data and data['solar_generation_kwh'] is not None:
        if data['solar_generation_kwh'] < 0:
            errors.append(f"solar_generation_kwh cannot be negative: {data['solar_generation_kwh']}")
    
    if 'power_factor' in data and data['power_factor'] is not None:
        if data['power_factor'] < 0 or data['power_factor'] > 1:
            errors.append(f"power_factor out of range: {data['power_factor']}")
    
    if 'demand_kw' in data and data['demand_kw'] is not None:
        if data['demand_kw'] < 0:
            errors.append(f"demand_kw cannot be negative: {data['demand_kw']}")
    
    # Validate period_type enum
    if 'period_type' in data and data['period_type'] is not None:
        valid_periods = [e.value for e in PeriodType]
        if data['period_type'] not in valid_periods:
            errors.append(f"Invalid period_type: {data['period_type']}")
    
    return {
        'is_valid': len(errors) == 0,
        'errors': errors,
        'data': data
    }


def validate_retail_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate retail data point.
    
    Args:
        data: Dictionary containing retail data fields
        
    Returns:
        Dictionary with validation results including 'is_valid' and 'errors'
    """
    errors = []
    
    # Check required fields
    required_fields = ['time', 'store_id', 'sku']
    for field in required_fields:
        if field not in data:
            errors.append(f"Missing required field: {field}")
    
    # Validate ranges
    if 'daily_sales_units' in data and data['daily_sales_units'] is not None:
        if data['daily_sales_units'] < 0:
            errors.append(f"daily_sales_units cannot be negative: {data['daily_sales_units']}")
    
    if 'daily_revenue' in data and data['daily_revenue'] is not None:
        if data['daily_revenue'] < 0:
            errors.append(f"daily_revenue cannot be negative: {data['daily_revenue']}")
    
    if 'inventory_level' in data and data['inventory_level'] is not None:
        if data['inventory_level'] < 0:
            errors.append(f"inventory_level cannot be negative: {data['inventory_level']}")
    
    if 'promo_discount_pct' in data and data['promo_discount_pct'] is not None:
        if data['promo_discount_pct'] < 0 or data['promo_discount_pct'] > 100:
            errors.append(f"promo_discount_pct out of range: {data['promo_discount_pct']}")
    
    if 'footfall_count' in data and data['footfall_count'] is not None:
        if data['footfall_count'] < 0:
            errors.append(f"footfall_count cannot be negative: {data['footfall_count']}")
    
    return {
        'is_valid': len(errors) == 0,
        'errors': errors,
        'data': data
    }


def ingest_manufacturing_batch(
    data_points: List[Dict[str, Any]], 
    site_id: UUID, 
    db: Session
) -> Dict[str, Any]:
    """
    Ingest batch of manufacturing data with upsert logic.
    
    Args:
        data_points: List of manufacturing data dictionaries
        site_id: Site identifier
        db: Database session
        
    Returns:
        Dictionary with ingestion results including counts and quality score
    """
    validated_points = []
    errors = []
    
    for idx, point in enumerate(data_points):
        validation = validate_manufacturing_data(point)
        if validation['is_valid']:
            # Add site_id to data point
            point['site_id'] = site_id
            validated_points.append(point)
        else:
            errors.extend([f"Point {idx}: {err}" for err in validation['errors']])
    
    if not validated_points:
        raise ValidationError("No valid data points to ingest")
    
    # Upsert data points using PostgreSQL INSERT ... ON CONFLICT
    inserted_count = 0
    for point in validated_points:
        stmt = insert(ManufacturingData).values(point)
        stmt = stmt.on_conflict_do_update(
            index_elements=['time', 'site_id', 'machine_id'],
            set_={
                'uptime_minutes': stmt.excluded.uptime_minutes,
                'throughput_units': stmt.excluded.throughput_units,
                'defect_count': stmt.excluded.defect_count,
                'cycle_time_seconds': stmt.excluded.cycle_time_seconds,
                'quality_score': stmt.excluded.quality_score,
                'downtime_events': stmt.excluded.downtime_events,
            }
        )
        db.execute(stmt)
        inserted_count += 1
    
    db.commit()
    
    # Calculate quality score
    quality_score = calculate_data_quality_score(validated_points)
    
    # Log data quality
    batch_id = f"mfg_{site_id}_{datetime.utcnow().isoformat()}"
    quality_log = DataQualityLog(
        site_id=site_id,
        timestamp=datetime.utcnow(),
        ingestion_batch_id=batch_id,
        quality_score=quality_score,
        errors=errors
    )
    db.add(quality_log)
    db.commit()
    
    return {
        'success': True,
        'inserted_count': inserted_count,
        'rejected_count': len(data_points) - len(validated_points),
        'quality_score': quality_score,
        'errors': errors,
        'batch_id': batch_id
    }


def ingest_energy_batch(
    data_points: List[Dict[str, Any]], 
    site_id: UUID, 
    db: Session
) -> Dict[str, Any]:
    """
    Ingest batch of energy data with upsert logic.
    
    Args:
        data_points: List of energy data dictionaries
        site_id: Site identifier
        db: Database session
        
    Returns:
        Dictionary with ingestion results including counts and quality score
    """
    validated_points = []
    errors = []
    
    for idx, point in enumerate(data_points):
        validation = validate_energy_data(point)
        if validation['is_valid']:
            point['site_id'] = site_id
            validated_points.append(point)
        else:
            errors.extend([f"Point {idx}: {err}" for err in validation['errors']])
    
    if not validated_points:
        raise ValidationError("No valid data points to ingest")
    
    # Upsert data points
    inserted_count = 0
    for point in validated_points:
        stmt = insert(EnergyData).values(point)
        stmt = stmt.on_conflict_do_update(
            index_elements=['time', 'site_id', 'meter_id'],
            set_={
                'kwh_consumed': stmt.excluded.kwh_consumed,
                'tariff_rate': stmt.excluded.tariff_rate,
                'period_type': stmt.excluded.period_type,
                'solar_generation_kwh': stmt.excluded.solar_generation_kwh,
                'load_shedding_event': stmt.excluded.load_shedding_event,
                'power_factor': stmt.excluded.power_factor,
                'demand_kw': stmt.excluded.demand_kw,
            }
        )
        db.execute(stmt)
        inserted_count += 1
    
    db.commit()
    
    # Calculate quality score
    quality_score = calculate_data_quality_score(validated_points)
    
    # Log data quality
    batch_id = f"energy_{site_id}_{datetime.utcnow().isoformat()}"
    quality_log = DataQualityLog(
        site_id=site_id,
        timestamp=datetime.utcnow(),
        ingestion_batch_id=batch_id,
        quality_score=quality_score,
        errors=errors
    )
    db.add(quality_log)
    db.commit()
    
    return {
        'success': True,
        'inserted_count': inserted_count,
        'rejected_count': len(data_points) - len(validated_points),
        'quality_score': quality_score,
        'errors': errors,
        'batch_id': batch_id
    }


def ingest_retail_batch(
    data_points: List[Dict[str, Any]], 
    site_id: UUID, 
    db: Session
) -> Dict[str, Any]:
    """
    Ingest batch of retail data with upsert logic.
    
    Args:
        data_points: List of retail data dictionaries
        site_id: Site identifier
        db: Database session
        
    Returns:
        Dictionary with ingestion results including counts and quality score
    """
    validated_points = []
    errors = []
    
    for idx, point in enumerate(data_points):
        validation = validate_retail_data(point)
        if validation['is_valid']:
            point['site_id'] = site_id
            validated_points.append(point)
        else:
            errors.extend([f"Point {idx}: {err}" for err in validation['errors']])
    
    if not validated_points:
        raise ValidationError("No valid data points to ingest")
    
    # Upsert data points
    inserted_count = 0
    for point in validated_points:
        stmt = insert(RetailData).values(point)
        stmt = stmt.on_conflict_do_update(
            index_elements=['time', 'site_id', 'store_id', 'sku'],
            set_={
                'daily_sales_units': stmt.excluded.daily_sales_units,
                'daily_revenue': stmt.excluded.daily_revenue,
                'inventory_level': stmt.excluded.inventory_level,
                'promo_active': stmt.excluded.promo_active,
                'promo_discount_pct': stmt.excluded.promo_discount_pct,
                'footfall_count': stmt.excluded.footfall_count,
                'weather_condition': stmt.excluded.weather_condition,
            }
        )
        db.execute(stmt)
        inserted_count += 1
    
    db.commit()
    
    # Calculate quality score
    quality_score = calculate_data_quality_score(validated_points)
    
    # Log data quality
    batch_id = f"retail_{site_id}_{datetime.utcnow().isoformat()}"
    quality_log = DataQualityLog(
        site_id=site_id,
        timestamp=datetime.utcnow(),
        ingestion_batch_id=batch_id,
        quality_score=quality_score,
        errors=errors
    )
    db.add(quality_log)
    db.commit()
    
    return {
        'success': True,
        'inserted_count': inserted_count,
        'rejected_count': len(data_points) - len(validated_points),
        'quality_score': quality_score,
        'errors': errors,
        'batch_id': batch_id
    }


def calculate_data_quality_score(data_points: List[Dict[str, Any]]) -> float:
    """
    Calculate data quality score based on completeness and consistency.
    
    Args:
        data_points: List of validated data point dictionaries
        
    Returns:
        Quality score between 0 and 1
    """
    if not data_points:
        return 0.0
    
    total_fields = 0
    populated_fields = 0
    
    for point in data_points:
        for key, value in point.items():
            if key not in ['site_id']:  # Exclude added fields
                total_fields += 1
                if value is not None:
                    populated_fields += 1
    
    if total_fields == 0:
        return 0.0
    
    completeness_score = populated_fields / total_fields
    
    # Additional quality factors could be added here
    # For now, completeness is the main factor
    quality_score = completeness_score
    
    return round(quality_score, 4)
