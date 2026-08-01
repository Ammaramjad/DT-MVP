"""
Energy data model for power consumption and generation monitoring.
"""
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Boolean, Enum as SQLEnum, Index, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class PeriodType(str, enum.Enum):
    """Energy tariff period types."""
    PEAK = "peak"
    OFF_PEAK = "off_peak"
    STANDARD = "standard"


class EnergyData(Base):
    """Time-series data for energy consumption and generation."""
    
    __tablename__ = "energy_data"
    
    time = Column(DateTime, nullable=False)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    meter_id = Column(String(100), nullable=False)
    kwh_consumed = Column(Float, nullable=False)
    tariff_rate = Column(Float, nullable=True)
    period_type = Column(SQLEnum(PeriodType), nullable=True)
    solar_generation_kwh = Column(Float, default=0.0, nullable=True)
    load_shedding_event = Column(Boolean, default=False, nullable=False)
    power_factor = Column(Float, nullable=True)
    demand_kw = Column(Float, nullable=True)
    
    # Relationships
    site = relationship("Site", back_populates="energy_data")
    
    __table_args__ = (
        PrimaryKeyConstraint("time", "site_id", "meter_id"),
        Index("idx_energy_time", "time", postgresql_using="btree"),
        Index("idx_energy_site_time", "site_id", "time"),
        Index("idx_energy_meter", "meter_id"),
        Index("idx_energy_period", "period_type"),
    )
    
    def __repr__(self):
        return f"<EnergyData(time={self.time}, site_id={self.site_id}, meter_id={self.meter_id})>"
