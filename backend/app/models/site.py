"""
Site model for physical locations in digital twin system.
"""
from sqlalchemy import Column, String, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.project import VerticalType


class Site(BaseModel):
    """Site model for physical locations being monitored."""
    
    __tablename__ = "sites"
    
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    site_type = Column(String(100), nullable=True)
    vertical = Column(SQLEnum(VerticalType), nullable=False, index=True)
    location = Column(String(255), nullable=True)
    site_metadata = Column(JSONB, default=dict, nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="sites")
    project = relationship("Project", back_populates="sites")
    manufacturing_data = relationship("ManufacturingData", back_populates="site", cascade="all, delete-orphan")
    energy_data = relationship("EnergyData", back_populates="site", cascade="all, delete-orphan")
    retail_data = relationship("RetailData", back_populates="site", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="site", cascade="all, delete-orphan")
    data_quality_logs = relationship("DataQualityLog", back_populates="site", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_site_org_project", "org_id", "project_id"),
        Index("idx_site_vertical", "vertical"),
    )
    
    def __repr__(self):
        return f"<Site(id={self.id}, name={self.name}, vertical={self.vertical})>"
