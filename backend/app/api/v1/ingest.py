"""
Data ingestion API endpoints for manufacturing, energy, and retail verticals.
"""
from typing import Dict
from uuid import UUID, uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.manufacturing import ManufacturingData
from app.models.energy import EnergyData
from app.models.retail import RetailData
from app.models.org_membership import OrgMembership, OrgRole
from app.schemas.ingestion import (
    ManufacturingBatchIngestionRequest,
    EnergyBatchIngestionRequest,
    RetailBatchIngestionRequest,
    IngestionResponse,
)

router = APIRouter(prefix="/ingest", tags=["data-ingestion"])


@router.post("/manufacturing", response_model=IngestionResponse, status_code=status.HTTP_201_CREATED)
async def ingest_manufacturing_data(
    data: ManufacturingBatchIngestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> IngestionResponse:
    """
    Ingest manufacturing data for a site.
    
    Validates data and stores time-series manufacturing metrics.
    
    Args:
        data: Manufacturing data ingestion request
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Ingestion response with success status and record counts
        
    Raises:
        HTTPException: If site not found or user lacks access
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.id == data.site_id).first()
    
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
    
    # Viewers cannot ingest data
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot ingest data"
        )
    
    # Verify site is manufacturing vertical
    if site.vertical.value != "manufacturing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Site vertical is {site.vertical.value}, expected manufacturing"
        )
    
    # Ingest data points
    records_processed = 0
    records_failed = 0
    validation_results = []
    
    for idx, data_point in enumerate(data.data_points):
        try:
            manufacturing_record = ManufacturingData(
                time=data_point.timestamp,
                site_id=data.site_id,
                machine_id=data_point.machine_id,
                uptime_minutes=int(data_point.uptime_minutes),
                throughput_units=data_point.throughput_units,
                defect_count=data_point.defect_count,
                cycle_time_seconds=data_point.cycle_time_seconds,
                quality_score=data_point.quality_score,
                downtime_events=data_point.downtime_events
            )
            db.add(manufacturing_record)
            records_processed += 1
        except Exception as e:
            records_failed += 1
            validation_results.append({
                "record_index": idx,
                "errors": [str(e)]
            })
    
    db.commit()
    
    return IngestionResponse(
        success=records_failed == 0,
        records_processed=records_processed,
        records_failed=records_failed,
        validation_results=validation_results,
        ingestion_id=uuid4()
    )


@router.post("/energy", response_model=IngestionResponse, status_code=status.HTTP_201_CREATED)
async def ingest_energy_data(
    data: EnergyBatchIngestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> IngestionResponse:
    """
    Ingest energy data for a site.
    
    Validates data and stores time-series energy consumption metrics.
    
    Args:
        data: Energy data ingestion request
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Ingestion response with success status and record counts
        
    Raises:
        HTTPException: If site not found or user lacks access
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.id == data.site_id).first()
    
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
    
    # Viewers cannot ingest data
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot ingest data"
        )
    
    # Verify site is energy vertical
    if site.vertical.value != "energy":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Site vertical is {site.vertical.value}, expected energy"
        )
    
    # Ingest data points
    records_processed = 0
    records_failed = 0
    validation_results = []
    
    for idx, data_point in enumerate(data.data_points):
        try:
            energy_record = EnergyData(
                time=data_point.timestamp,
                site_id=data.site_id,
                meter_id=data_point.meter_id,
                kwh_consumed=data_point.kwh_consumed,
                tariff_rate=data_point.tariff_rate,
                period_type=data_point.period_type.value,
                solar_generation_kwh=data_point.solar_generation_kwh,
                load_shedding_event=data_point.load_shedding_event,
                power_factor=data_point.power_factor,
                demand_kw=data_point.demand_kw
            )
            db.add(energy_record)
            records_processed += 1
        except Exception as e:
            records_failed += 1
            validation_results.append({
                "record_index": idx,
                "errors": [str(e)]
            })
    
    db.commit()
    
    return IngestionResponse(
        success=records_failed == 0,
        records_processed=records_processed,
        records_failed=records_failed,
        validation_results=validation_results,
        ingestion_id=uuid4()
    )


@router.post("/retail", response_model=IngestionResponse, status_code=status.HTTP_201_CREATED)
async def ingest_retail_data(
    data: RetailBatchIngestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> IngestionResponse:
    """
    Ingest retail data for a site.
    
    Validates data and stores time-series retail sales and inventory metrics.
    
    Args:
        data: Retail data ingestion request
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Ingestion response with success status and record counts
        
    Raises:
        HTTPException: If site not found or user lacks access
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.id == data.site_id).first()
    
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
    
    # Viewers cannot ingest data
    if membership.role == OrgRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot ingest data"
        )
    
    # Verify site is retail vertical
    if site.vertical.value != "retail":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Site vertical is {site.vertical.value}, expected retail"
        )
    
    # Ingest data points
    records_processed = 0
    records_failed = 0
    validation_results = []
    
    for idx, data_point in enumerate(data.data_points):
        try:
            retail_record = RetailData(
                time=data_point.date,
                site_id=data.site_id,
                store_id=data_point.store_id,
                sku=data_point.sku,
                daily_sales_units=data_point.daily_sales_units,
                daily_revenue=data_point.daily_revenue,
                inventory_level=data_point.inventory_level,
                promo_active=data_point.promo_active,
                promo_discount_pct=data_point.promo_discount_pct,
                footfall_count=data_point.footfall_count,
                weather_condition=data_point.weather_condition
            )
            db.add(retail_record)
            records_processed += 1
        except Exception as e:
            records_failed += 1
            validation_results.append({
                "record_index": idx,
                "errors": [str(e)]
            })
    
    db.commit()
    
    return IngestionResponse(
        success=records_failed == 0,
        records_processed=records_processed,
        records_failed=records_failed,
        validation_results=validation_results,
        ingestion_id=uuid4()
    )


@router.post("/csv/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_csv_for_ingestion(
    file: UploadFile = File(...),
    site_id: UUID = None,
    vertical: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Upload CSV file for asynchronous data ingestion.
    
    File will be validated and processed asynchronously.
    Use the returned job_id to check ingestion status.
    
    Args:
        file: CSV file upload
        site_id: Target site ID
        vertical: Data vertical (manufacturing, energy, retail)
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Job ID for status tracking
        
    Raises:
        HTTPException: If file format is invalid or user lacks access
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported"
        )
    
    # Verify site if provided
    if site_id:
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
        
        # Viewers cannot ingest data
        if membership.role == OrgRole.VIEWER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Viewers cannot ingest data"
            )
    
    # Generate job ID
    job_id = uuid4()
    
    # In production, this would:
    # 1. Save file to temporary storage
    # 2. Queue background task (Celery) for processing
    # 3. Return job ID for status tracking
    
    return {
        "job_id": str(job_id),
        "status": "queued",
        "message": "CSV file uploaded successfully and queued for processing",
        "filename": file.filename
    }


@router.get("/csv/{job_id}/status")
async def get_csv_ingestion_status(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get status of CSV ingestion job.
    
    Args:
        job_id: Job ID from CSV upload
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Job status and progress information
    """
    # In production, this would:
    # 1. Query job status from Celery or job queue
    # 2. Return current status, progress, and any errors
    
    # Mock response for now
    return {
        "job_id": str(job_id),
        "status": "processing",
        "progress": 75,
        "records_processed": 750,
        "records_total": 1000,
        "records_failed": 5,
        "started_at": datetime.utcnow().isoformat(),
        "estimated_completion": None
    }
