"""
KPI computation API endpoints for manufacturing, energy, and retail verticals.
"""
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.manufacturing import ManufacturingData
from app.models.energy import EnergyData
from app.models.retail import RetailData
from app.models.org_membership import OrgMembership
from app.schemas.kpi import ManufacturingKPI, EnergyKPI, RetailKPI

router = APIRouter(prefix="/kpis", tags=["kpis"])


@router.get("/manufacturing/{site_id}", response_model=ManufacturingKPI)
async def get_manufacturing_kpis(
    site_id: UUID,
    start_date: datetime = Query(None, description="Start date for KPI calculation"),
    end_date: datetime = Query(None, description="End date for KPI calculation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ManufacturingKPI:
    """
    Calculate and return manufacturing KPIs for a site.
    
    Computes OEE, availability, performance, quality, MTBF, MTTR, and first pass yield.
    
    Args:
        site_id: Site ID
        start_date: Optional start date (defaults to last 30 days)
        end_date: Optional end date (defaults to now)
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Manufacturing KPIs
        
    Raises:
        HTTPException: If site not found or user lacks access
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.id == site_id).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Check user membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == site.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site"
        )
    
    # Verify site is manufacturing vertical
    if site.vertical.value != "manufacturing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Site vertical is {site.vertical.value}, expected manufacturing"
        )
    
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Query manufacturing data
    data = db.query(ManufacturingData).filter(
        ManufacturingData.site_id == site_id,
        ManufacturingData.time >= start_date,
        ManufacturingData.time <= end_date
    ).all()
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No manufacturing data found for the specified period"
        )
    
    # Calculate KPIs
    total_uptime = sum(d.uptime_minutes or 0 for d in data)
    total_units = sum(d.throughput_units or 0 for d in data)
    total_defects = sum(d.defect_count or 0 for d in data)
    
    # Availability: (Total Uptime / Planned Production Time) * 100
    planned_time = len(data) * 60  # Assuming 60 minutes per data point
    availability = (total_uptime / planned_time * 100) if planned_time > 0 else 0
    
    # Performance: (Actual Output / Maximum Possible Output) * 100
    ideal_cycle_time = min((d.cycle_time_seconds for d in data if d.cycle_time_seconds), default=60)
    max_possible_units = (total_uptime * 60) / ideal_cycle_time if ideal_cycle_time > 0 else 0
    performance = (total_units / max_possible_units * 100) if max_possible_units > 0 else 0
    
    # Quality: ((Total Units - Defects) / Total Units) * 100
    quality = ((total_units - total_defects) / total_units * 100) if total_units > 0 else 0
    
    # OEE: Availability * Performance * Quality / 10000
    oee = (availability * performance * quality) / 10000
    
    # MTBF and MTTR calculations (simplified)
    downtime_events = [event for d in data for event in (d.downtime_events or [])]
    total_downtime = sum(event.get('duration_minutes', 0) for event in downtime_events)
    num_failures = len(downtime_events)
    
    mtbf = (total_uptime / num_failures / 60) if num_failures > 0 else 0  # hours
    mttr = (total_downtime / num_failures / 60) if num_failures > 0 else 0  # hours
    
    # First Pass Yield
    quality_scores = [d.quality_score for d in data if d.quality_score is not None]
    first_pass_yield = sum(quality_scores) / len(quality_scores) if quality_scores else 0
    
    return ManufacturingKPI(
        site_id=site_id,
        timestamp=datetime.utcnow(),
        oee=round(oee, 2),
        availability=round(availability, 2),
        performance=round(performance, 2),
        quality=round(quality, 2),
        mtbf=round(mtbf, 2),
        mttr=round(mttr, 2),
        first_pass_yield=round(first_pass_yield, 2)
    )


@router.get("/energy/{site_id}", response_model=EnergyKPI)
async def get_energy_kpis(
    site_id: UUID,
    start_date: datetime = Query(None, description="Start date for KPI calculation"),
    end_date: datetime = Query(None, description="End date for KPI calculation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> EnergyKPI:
    """
    Calculate and return energy KPIs for a site.
    
    Computes total cost, peak demand cost, energy intensity, solar contribution, load factor, and carbon emissions.
    
    Args:
        site_id: Site ID
        start_date: Optional start date (defaults to last 30 days)
        end_date: Optional end date (defaults to now)
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Energy KPIs
        
    Raises:
        HTTPException: If site not found or user lacks access
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.id == site_id).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Check user membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == site.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site"
        )
    
    # Verify site is energy vertical
    if site.vertical.value != "energy":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Site vertical is {site.vertical.value}, expected energy"
        )
    
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Query energy data
    data = db.query(EnergyData).filter(
        EnergyData.site_id == site_id,
        EnergyData.time >= start_date,
        EnergyData.time <= end_date
    ).all()
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No energy data found for the specified period"
        )
    
    # Calculate KPIs
    total_kwh = sum(d.kwh_consumed or 0 for d in data)
    total_cost = sum((d.kwh_consumed or 0) * (d.tariff_rate or 0) for d in data)
    
    # Peak demand cost (simplified - using max demand_kw)
    peak_demand_kw = max((d.demand_kw for d in data if d.demand_kw), default=0)
    peak_demand_cost = peak_demand_kw * 10  # Simplified calculation
    
    # Solar contribution
    total_solar_kwh = sum(d.solar_generation_kwh or 0 for d in data)
    solar_contribution_pct = (total_solar_kwh / (total_kwh + total_solar_kwh) * 100) if (total_kwh + total_solar_kwh) > 0 else 0
    
    # Energy intensity (kWh per unit of output - simplified)
    energy_intensity = total_kwh / len(data) if data else 0
    
    # Load factor
    avg_demand = sum(d.demand_kw or 0 for d in data) / len(data) if data else 0
    load_factor = (avg_demand / peak_demand_kw) if peak_demand_kw > 0 else 0
    
    # Carbon emissions (simplified: 0.5 kg CO2 per kWh)
    carbon_emissions = (total_kwh - total_solar_kwh) * 0.5
    
    return EnergyKPI(
        site_id=site_id,
        timestamp=datetime.utcnow(),
        total_cost=round(total_cost, 2),
        peak_demand_cost=round(peak_demand_cost, 2),
        energy_intensity=round(energy_intensity, 2),
        solar_contribution_pct=round(solar_contribution_pct, 2),
        load_factor=round(load_factor, 2),
        carbon_emissions=round(carbon_emissions, 2)
    )


@router.get("/retail/{site_id}", response_model=RetailKPI)
async def get_retail_kpis(
    site_id: UUID,
    start_date: datetime = Query(None, description="Start date for KPI calculation"),
    end_date: datetime = Query(None, description="End date for KPI calculation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> RetailKPI:
    """
    Calculate and return retail KPIs for a site.
    
    Computes sales velocity, margin, inventory turnover, stockout rate, promo effectiveness, and conversion rate.
    
    Args:
        site_id: Site ID
        start_date: Optional start date (defaults to last 30 days)
        end_date: Optional end date (defaults to now)
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Retail KPIs
        
    Raises:
        HTTPException: If site not found or user lacks access
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.id == site_id).first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Check user membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.org_id == site.org_id,
        OrgMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site"
        )
    
    # Verify site is retail vertical
    if site.vertical.value != "retail":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Site vertical is {site.vertical.value}, expected retail"
        )
    
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Query retail data
    data = db.query(RetailData).filter(
        RetailData.site_id == site_id,
        RetailData.time >= start_date,
        RetailData.time <= end_date
    ).all()
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No retail data found for the specified period"
        )
    
    # Calculate KPIs
    total_sales_units = sum(d.daily_sales_units or 0 for d in data)
    total_revenue = sum(d.daily_revenue or 0 for d in data)
    total_footfall = sum(d.footfall_count or 0 for d in data)
    
    # Sales velocity (average daily sales)
    num_days = (end_date - start_date).days or 1
    sales_velocity = total_sales_units / num_days
    
    # Margin (simplified - assuming 35% margin)
    margin_pct = 35.0
    
    # Inventory turnover (simplified)
    avg_inventory = sum(d.inventory_level or 0 for d in data) / len(data) if data else 0
    inventory_turnover = (total_sales_units / avg_inventory) if avg_inventory > 0 else 0
    
    # Stockout rate (simplified - counting zero inventory days)
    stockout_days = sum(1 for d in data if (d.inventory_level or 0) == 0)
    stockout_rate = (stockout_days / len(data) * 100) if data else 0
    
    # Promo effectiveness (sales lift during promo)
    promo_data = [d for d in data if d.promo_active]
    non_promo_data = [d for d in data if not d.promo_active]
    
    promo_avg_sales = (sum(d.daily_sales_units or 0 for d in promo_data) / len(promo_data)) if promo_data else 0
    non_promo_avg_sales = (sum(d.daily_sales_units or 0 for d in non_promo_data) / len(non_promo_data)) if non_promo_data else 0
    promo_effectiveness = (promo_avg_sales / non_promo_avg_sales) if non_promo_avg_sales > 0 else 1.0
    
    # Conversion rate (sales / footfall)
    conversion_rate = (total_sales_units / total_footfall * 100) if total_footfall > 0 else 0
    
    return RetailKPI(
        site_id=site_id,
        timestamp=datetime.utcnow(),
        sales_velocity=round(sales_velocity, 2),
        margin_pct=round(margin_pct, 2),
        inventory_turnover=round(inventory_turnover, 2),
        stockout_rate=round(stockout_rate, 2),
        promo_effectiveness=round(promo_effectiveness, 2),
        conversion_rate=round(conversion_rate, 2)
    )
