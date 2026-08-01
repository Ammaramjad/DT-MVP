"""
Retail vertical KPI calculations.
"""
from datetime import date
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.retail import RetailData
from app.core.exceptions import ValidationError


def calculate_sales_velocity(units_sold: float, days: int) -> float:
    """
    Calculate sales velocity (average daily sales).
    
    Args:
        units_sold: Total units sold
        days: Number of days in period
        
    Returns:
        Average daily sales units
    """
    if days <= 0:
        return 0.0
    
    velocity = units_sold / days
    return round(velocity, 2)


def calculate_margin(revenue: float, cost: float) -> float:
    """
    Calculate profit margin percentage.
    
    Args:
        revenue: Total revenue
        cost: Total cost
        
    Returns:
        Margin percentage (0-100)
    """
    if revenue <= 0:
        return 0.0
    
    margin = ((revenue - cost) / revenue) * 100
    return round(max(margin, 0.0), 2)


def calculate_inventory_turnover(cogs: float, avg_inventory: float) -> float:
    """
    Calculate inventory turnover ratio.
    
    Args:
        cogs: Cost of Goods Sold
        avg_inventory: Average inventory value
        
    Returns:
        Inventory turnover ratio
    """
    if avg_inventory <= 0:
        return 0.0
    
    turnover = cogs / avg_inventory
    return round(turnover, 2)


def calculate_stockout_rate(stockout_days: int, total_days: int) -> float:
    """
    Calculate stockout rate percentage.
    
    Args:
        stockout_days: Number of days with stockouts
        total_days: Total days in period
        
    Returns:
        Stockout rate percentage (0-100)
    """
    if total_days <= 0:
        return 0.0
    
    rate = (stockout_days / total_days) * 100
    return round(rate, 2)


def calculate_promo_effectiveness(promo_sales: float, baseline_sales: float) -> float:
    """
    Calculate promotion effectiveness as revenue lift multiplier.
    
    Args:
        promo_sales: Sales during promotion period
        baseline_sales: Baseline sales (no promotion)
        
    Returns:
        Effectiveness multiplier (e.g., 1.5 means 50% lift)
    """
    if baseline_sales <= 0:
        return 0.0
    
    effectiveness = promo_sales / baseline_sales
    return round(effectiveness, 2)


def calculate_conversion_rate(sales: float, footfall: float) -> float:
    """
    Calculate conversion rate percentage (sales / footfall).
    
    Args:
        sales: Number of transactions or sales units
        footfall: Number of store visitors
        
    Returns:
        Conversion rate percentage (0-100)
    """
    if footfall <= 0:
        return 0.0
    
    conversion = (sales / footfall) * 100
    return round(min(conversion, 100.0), 2)


def compute_kpis(
    site_id: UUID,
    start_date: date,
    end_date: date,
    db: Session
) -> Dict[str, Any]:
    """
    Compute all retail KPIs for a site and date range.
    
    Args:
        site_id: Site identifier
        start_date: Start date for KPI calculation
        end_date: End date for KPI calculation
        db: Database session
        
    Returns:
        Dictionary containing all computed retail KPIs
    """
    # Query retail data for the date range
    data_query = db.query(RetailData).filter(
        RetailData.site_id == site_id,
        RetailData.time >= start_date,
        RetailData.time < end_date
    )
    
    data_points = data_query.all()
    
    if not data_points:
        raise ValidationError(f"No retail data found for site {site_id} in date range")
    
    # Aggregate metrics
    total_sales_units = sum(d.daily_sales_units or 0 for d in data_points)
    total_revenue = sum(d.daily_revenue or 0 for d in data_points)
    total_footfall = sum(d.footfall_count or 0 for d in data_points)
    
    # Calculate days in period
    days = (end_date - start_date).days
    if days == 0:
        days = 1
    
    # Calculate sales velocity
    sales_velocity = calculate_sales_velocity(total_sales_units, days)
    
    # Calculate margin (assume 35% margin for demo)
    # In production, actual cost data should be available
    assumed_cost = total_revenue * 0.65  # 35% margin
    margin_pct = calculate_margin(total_revenue, assumed_cost)
    
    # Calculate inventory turnover
    # Get average inventory level across the period
    inventory_levels = [d.inventory_level for d in data_points if d.inventory_level is not None]
    if inventory_levels:
        avg_inventory_units = sum(inventory_levels) / len(inventory_levels)
        # Assume average unit cost of $10 for demo
        avg_inventory_value = avg_inventory_units * 10
        # COGS approximation
        cogs = assumed_cost
        inventory_turnover = calculate_inventory_turnover(cogs, avg_inventory_value)
    else:
        inventory_turnover = 0.0
    
    # Calculate stockout rate
    # Detect stockouts (inventory level = 0)
    stockout_days = sum(1 for d in data_points if d.inventory_level == 0)
    stockout_rate = calculate_stockout_rate(stockout_days, days)
    
    # Calculate promotion effectiveness
    promo_points = [d for d in data_points if d.promo_active]
    non_promo_points = [d for d in data_points if not d.promo_active]
    
    if promo_points and non_promo_points:
        promo_sales = sum(d.daily_sales_units or 0 for d in promo_points)
        promo_days = len(promo_points)
        avg_promo_sales = promo_sales / promo_days if promo_days > 0 else 0
        
        baseline_sales = sum(d.daily_sales_units or 0 for d in non_promo_points)
        baseline_days = len(non_promo_points)
        avg_baseline_sales = baseline_sales / baseline_days if baseline_days > 0 else 1
        
        promo_effectiveness = calculate_promo_effectiveness(avg_promo_sales, avg_baseline_sales)
    else:
        promo_effectiveness = 1.0
    
    # Calculate conversion rate
    # Use unique daily footfall divided by daily transactions
    conversion_rate = calculate_conversion_rate(total_sales_units, total_footfall)
    
    # Calculate data quality score
    data_quality_score = calculate_data_quality(data_points)
    
    # Calculate average inventory level
    avg_inventory = sum(inventory_levels) / len(inventory_levels) if inventory_levels else 0
    
    # Calculate average discount during promotions
    promo_discounts = [d.promo_discount_pct for d in data_points if d.promo_active and d.promo_discount_pct]
    avg_promo_discount = sum(promo_discounts) / len(promo_discounts) if promo_discounts else 0
    
    return {
        'site_id': site_id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'sales_velocity': sales_velocity,
        'margin_pct': margin_pct,
        'inventory_turnover': inventory_turnover,
        'stockout_rate': stockout_rate,
        'promo_effectiveness': promo_effectiveness,
        'conversion_rate': conversion_rate,
        'total_sales_units': total_sales_units,
        'total_revenue': round(total_revenue, 2),
        'total_footfall': total_footfall,
        'avg_inventory': round(avg_inventory, 2),
        'avg_promo_discount': round(avg_promo_discount, 2),
        'data_quality_score': data_quality_score
    }


def calculate_data_quality(data_points: List[RetailData]) -> float:
    """
    Calculate data quality score based on completeness.
    
    Args:
        data_points: List of retail data points
        
    Returns:
        Quality score between 0 and 1
    """
    if not data_points:
        return 0.0
    
    total_fields = 0
    populated_fields = 0
    
    for point in data_points:
        fields = [
            point.daily_sales_units,
            point.daily_revenue,
            point.inventory_level,
            point.promo_discount_pct if point.promo_active else 0,  # Count as populated if not promo
            point.footfall_count,
            point.weather_condition
        ]
        
        for field in fields:
            total_fields += 1
            if field is not None:
                populated_fields += 1
    
    if total_fields == 0:
        return 0.0
    
    return round(populated_fields / total_fields, 4)
