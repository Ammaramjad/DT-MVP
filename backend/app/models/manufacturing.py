"""
Manufacturing data model for factory and production monitoring.
"""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Index, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class ManufacturingData(Base):
    """Time-series data for manufacturing operations."""
    
    __tablename__ = "manufacturing_data"
    
    time = Column(DateTime, nullable=False)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    machine_id = Column(String(100), nullable=False)
    uptime_minutes = Column(Integer, nullable=True)
    throughput_units = Column(Integer, nullable=True)
    defect_count = Column(Integer, default=0, nullable=False)
    cycle_time_seconds = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=True)
    downtime_events = Column(JSONB, default=list, nullable=False)
    
    # Relationships
    site = relationship("Site", back_populates="manufacturing_data")
    
    __table_args__ = (
        PrimaryKeyConstraint("time", "site_id", "machine_id"),
        Index("idx_manufacturing_time", "time", postgresql_using="btree"),
        Index("idx_manufacturing_site_time", "site_id", "time"),
        Index("idx_manufacturing_machine", "machine_id"),
    )
    
    def __repr__(self):
        return f"<ManufacturingData(time={self.time}, site_id={self.site_id}, machine_id={self.machine_id})>"
