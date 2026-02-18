"""
Manufacturing vertical KPI calculations.
"""
from datetime import date
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.manufacturing import ManufacturingData
from app.core.exceptions import ValidationError


def calculate_oee(availability: float, performance: float, quality: float) -> float:
    """
    Calculate Overall Equipment Effectiveness (OEE).
    
    Args:
        availability: Availability percentage (0-100)
        performance: Performance percentage (0-100)
        quality: Quality percentage (0-100)
        
    Returns:
        OEE percentage (0-100)
    """
    if availability < 0 or performance < 0 or quality < 0:
        return 0.0
    
    # OEE = Availability × Performance × Quality
    oee = (availability / 100) * (performance / 100) * (quality / 100) * 100
    return round(oee, 2)


def calculate_availability(uptime: float, planned_time: float) -> float:
    """
    Calculate machine availability percentage.
    
    Args:
        uptime: Actual uptime in minutes
        planned_time: Planned production time in minutes
        
    Returns:
        Availability percentage (0-100)
    """
    if planned_time <= 0:
        return 0.0
    
    availability = (uptime / planned_time) * 100
    return round(min(availability, 100.0), 2)


def calculate_performance(actual_output: float, planned_output: float) -> float:
    """
    Calculate machine performance percentage.
    
    Args:
        actual_output: Actual units produced
        planned_output: Planned units to produce
        
    Returns:
        Performance percentage (0-100)
    """
    if planned_output <= 0:
        return 0.0
    
    performance = (actual_output / planned_output) * 100
    return round(min(performance, 100.0), 2)


def calculate_quality(good_units: float, total_units: float) -> float:
    """
    Calculate quality percentage (first-time quality).
    
    Args:
        good_units: Number of good units produced
        total_units: Total units produced
        
    Returns:
        Quality percentage (0-100)
    """
    if total_units <= 0:
        return 0.0
    
    quality = (good_units / total_units) * 100
    return round(min(quality, 100.0), 2)


def calculate_mtbf(downtime_events: List[Dict[str, Any]]) -> float:
    """
    Calculate Mean Time Between Failures (MTBF).
    
    Args:
        downtime_events: List of downtime event dictionaries with 'duration' and timestamps
        
    Returns:
        MTBF in hours
    """
    if not downtime_events or len(downtime_events) == 0:
        return 0.0
    
    # Extract timestamps and sort
    timestamps = []
    for event in downtime_events:
        if 'timestamp' in event:
            timestamps.append(event['timestamp'])
    
    if len(timestamps) < 2:
        return 0.0
    
    timestamps.sort()
    
    # Calculate time between failures
    total_time = 0.0
    for i in range(1, len(timestamps)):
        # Simplified: assume timestamps are in hours
        time_diff = timestamps[i] - timestamps[0]
        total_time = time_diff
    
    mtbf = total_time / (len(timestamps) - 1) if len(timestamps) > 1 else 0.0
    return round(mtbf, 2)


def calculate_mttr(downtime_events: List[Dict[str, Any]]) -> float:
    """
    Calculate Mean Time To Repair (MTTR).
    
    Args:
        downtime_events: List of downtime event dictionaries with 'duration' field
        
    Returns:
        MTTR in hours
    """
    if not downtime_events or len(downtime_events) == 0:
        return 0.0
    
    total_duration = 0.0
    count = 0
    
    for event in downtime_events:
        if 'duration' in event and event['duration'] is not None:
            total_duration += event['duration']
            count += 1
    
    if count == 0:
        return 0.0
    
    mttr = total_duration / count
    return round(mttr, 2)


def calculate_first_pass_yield(defect_data: List[Dict[str, Any]]) -> float:
    """
    Calculate First Pass Yield (FPY).
    
    Args:
        defect_data: List of production batches with 'defects' and 'total_units'
        
    Returns:
        First pass yield percentage (0-100)
    """
    if not defect_data or len(defect_data) == 0:
        return 0.0
    
    total_good = 0
    total_produced = 0
    
    for batch in defect_data:
        if 'total_units' in batch:
            total_units = batch['total_units']
            defects = batch.get('defects', 0)
            good_units = total_units - defects
            
            total_good += good_units
            total_produced += total_units
    
    if total_produced == 0:
        return 0.0
    
    fpy = (total_good / total_produced) * 100
    return round(fpy, 2)


def compute_kpis(
    site_id: UUID,
    start_date: date,
    end_date: date,
    db: Session
) -> Dict[str, Any]:
    """
    Compute all manufacturing KPIs for a site and date range.
    
    Args:
        site_id: Site identifier
        start_date: Start date for KPI calculation
        end_date: End date for KPI calculation
        db: Database session
        
    Returns:
        Dictionary containing all computed manufacturing KPIs
    """
    # Query manufacturing data for the date range
    data_query = db.query(ManufacturingData).filter(
        ManufacturingData.site_id == site_id,
        ManufacturingData.time >= start_date,
        ManufacturingData.time < end_date
    )
    
    data_points = data_query.all()
    
    if not data_points:
        raise ValidationError(f"No manufacturing data found for site {site_id} in date range")
    
    # Aggregate metrics
    total_uptime = sum(d.uptime_minutes or 0 for d in data_points)
    total_throughput = sum(d.throughput_units or 0 for d in data_points)
    total_defects = sum(d.defect_count or 0 for d in data_points)
    
    # Calculate planned time (assume 24*60 minutes per day)
    days = (end_date - start_date).days
    planned_time = days * 24 * 60  # minutes
    
    # Calculate availability
    availability = calculate_availability(total_uptime, planned_time)
    
    # Calculate performance (assume ideal throughput is 10% higher)
    ideal_throughput = total_throughput * 1.1
    performance = calculate_performance(total_throughput, ideal_throughput)
    
    # Calculate quality
    quality = calculate_quality(total_throughput - total_defects, total_throughput)
    
    # Calculate OEE
    oee = calculate_oee(availability, performance, quality)
    
    # Collect downtime events
    all_downtime_events = []
    for d in data_points:
        if d.downtime_events:
            all_downtime_events.extend(d.downtime_events)
    
    # Calculate MTBF and MTTR
    mtbf = calculate_mtbf(all_downtime_events)
    mttr = calculate_mttr(all_downtime_events)
    
    # Calculate first pass yield
    defect_data = [
        {'total_units': d.throughput_units or 0, 'defects': d.defect_count or 0}
        for d in data_points
    ]
    first_pass_yield = calculate_first_pass_yield(defect_data)
    
    # Calculate data quality score
    data_quality_score = calculate_data_quality(data_points)
    
    return {
        'site_id': site_id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'oee': oee,
        'availability': availability,
        'performance': performance,
        'quality': quality,
        'mtbf': mtbf,
        'mttr': mttr,
        'first_pass_yield': first_pass_yield,
        'total_throughput': total_throughput,
        'total_defects': total_defects,
        'data_quality_score': data_quality_score
    }


def calculate_data_quality(data_points: List[ManufacturingData]) -> float:
    """
    Calculate data quality score based on completeness.
    
    Args:
        data_points: List of manufacturing data points
        
    Returns:
        Quality score between 0 and 1
    """
    if not data_points:
        return 0.0
    
    total_fields = 0
    populated_fields = 0
    
    for point in data_points:
        fields = [
            point.uptime_minutes,
            point.throughput_units,
            point.defect_count,
            point.cycle_time_seconds,
            point.quality_score
        ]
        
        for field in fields:
            total_fields += 1
            if field is not None:
                populated_fields += 1
    
    if total_fields == 0:
        return 0.0
    
    return round(populated_fields / total_fields, 4)
