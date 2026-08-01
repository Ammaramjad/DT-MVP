"""
Anomaly detection model for identifying unusual patterns.
"""
from sqlalchemy import Column, String, DateTime, Float, Boolean, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class Severity(str, enum.Enum):
    """Anomaly severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Anomaly(BaseModel):
    """Anomaly detection results."""
    
    __tablename__ = "anomalies"
    
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    metric_name = Column(String(100), nullable=False)
    anomaly_score = Column(Float, nullable=False)
    severity = Column(SQLEnum(Severity), nullable=False, index=True)
    acknowledged = Column(Boolean, default=False, nullable=False, index=True)
    
    # Relationships
    site = relationship("Site", back_populates="anomalies")
    
    __table_args__ = (
        Index("idx_anomaly_site_time", "site_id", "timestamp"),
        Index("idx_anomaly_severity_ack", "severity", "acknowledged"),
    )
    
    def __repr__(self):
        return f"<Anomaly(id={self.id}, site_id={self.site_id}, metric_name={self.metric_name}, severity={self.severity})>"
