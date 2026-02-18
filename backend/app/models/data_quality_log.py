"""
Data quality logging model for monitoring data ingestion quality.
"""
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class DataQualityLog(BaseModel):
    """Data quality metrics and validation logs."""
    
    __tablename__ = "data_quality_logs"
    
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    ingestion_batch_id = Column(String(100), nullable=False, index=True)
    quality_score = Column(Float, nullable=False)
    errors = Column(JSONB, default=list, nullable=False)
    
    # Relationships
    site = relationship("Site", back_populates="data_quality_logs")
    
    __table_args__ = (
        Index("idx_data_quality_site_time", "site_id", "timestamp"),
        Index("idx_data_quality_batch", "ingestion_batch_id"),
    )
    
    def __repr__(self):
        return f"<DataQualityLog(id={self.id}, site_id={self.site_id}, quality_score={self.quality_score})>"
