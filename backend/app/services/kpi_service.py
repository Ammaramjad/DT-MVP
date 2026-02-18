"""
KPI service for computing industry-specific Key Performance Indicators.
"""
from datetime import date
from typing import Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.project import VerticalType
from app.models.site import Site
from app.services.verticals import manufacturing, energy, retail
from app.core.exceptions import ValidationError


def compute_manufacturing_kpis(
    site_id: UUID, 
    start_date: date, 
    end_date: date, 
    db: Session
) -> Dict[str, Any]:
    """
    Compute manufacturing KPIs for a site and date range.
    
    Args:
        site_id: Site identifier
        start_date: Start date for KPI calculation
        end_date: End date for KPI calculation
        db: Database session
        
    Returns:
        Dictionary containing computed KPIs
        
    Raises:
        ValidationError: If site doesn't exist or vertical mismatch
    """
    # Validate site exists and is manufacturing vertical
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise ValidationError(f"Site {site_id} not found")
    
    if site.vertical != VerticalType.MANUFACTURING:
        raise ValidationError(f"Site {site_id} is not a manufacturing site")
    
    if end_date <= start_date:
        raise ValidationError("end_date must be after start_date")
    
    # Delegate to manufacturing vertical service
    return manufacturing.compute_kpis(site_id, start_date, end_date, db)


def compute_energy_kpis(
    site_id: UUID, 
    start_date: date, 
    end_date: date, 
    db: Session
) -> Dict[str, Any]:
    """
    Compute energy KPIs for a site and date range.
    
    Args:
        site_id: Site identifier
        start_date: Start date for KPI calculation
        end_date: End date for KPI calculation
        db: Database session
        
    Returns:
        Dictionary containing computed KPIs
        
    Raises:
        ValidationError: If site doesn't exist or vertical mismatch
    """
    # Validate site exists and is energy vertical
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise ValidationError(f"Site {site_id} not found")
    
    if site.vertical != VerticalType.ENERGY:
        raise ValidationError(f"Site {site_id} is not an energy site")
    
    if end_date <= start_date:
        raise ValidationError("end_date must be after start_date")
    
    # Delegate to energy vertical service
    return energy.compute_kpis(site_id, start_date, end_date, db)


def compute_retail_kpis(
    site_id: UUID, 
    start_date: date, 
    end_date: date, 
    db: Session
) -> Dict[str, Any]:
    """
    Compute retail KPIs for a site and date range.
    
    Args:
        site_id: Site identifier
        start_date: Start date for KPI calculation
        end_date: End date for KPI calculation
        db: Database session
        
    Returns:
        Dictionary containing computed KPIs
        
    Raises:
        ValidationError: If site doesn't exist or vertical mismatch
    """
    # Validate site exists and is retail vertical
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise ValidationError(f"Site {site_id} not found")
    
    if site.vertical != VerticalType.RETAIL:
        raise ValidationError(f"Site {site_id} is not a retail site")
    
    if end_date <= start_date:
        raise ValidationError("end_date must be after start_date")
    
    # Delegate to retail vertical service
    return retail.compute_kpis(site_id, start_date, end_date, db)


def compute_kpis_by_vertical(
    site_id: UUID,
    start_date: date,
    end_date: date,
    db: Session
) -> Dict[str, Any]:
    """
    Compute KPIs for any vertical by detecting site type.
    
    Args:
        site_id: Site identifier
        start_date: Start date for KPI calculation
        end_date: End date for KPI calculation
        db: Database session
        
    Returns:
        Dictionary containing computed KPIs
        
    Raises:
        ValidationError: If site doesn't exist
    """
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise ValidationError(f"Site {site_id} not found")
    
    if site.vertical == VerticalType.MANUFACTURING:
        return compute_manufacturing_kpis(site_id, start_date, end_date, db)
    elif site.vertical == VerticalType.ENERGY:
        return compute_energy_kpis(site_id, start_date, end_date, db)
    elif site.vertical == VerticalType.RETAIL:
        return compute_retail_kpis(site_id, start_date, end_date, db)
    else:
        raise ValidationError(f"Unknown vertical type: {site.vertical}")
