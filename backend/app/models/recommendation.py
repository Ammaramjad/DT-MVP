"""
Recommendation model for AI-generated insights and actions.
"""
from sqlalchemy import Column, String, Text, Float, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel
from app.models.project import VerticalType


class RecommendationCategory(str, enum.Enum):
    """Recommendation category types."""
    OPTIMIZATION = "optimization"
    MAINTENANCE = "maintenance"
    EFFICIENCY = "efficiency"
    QUALITY = "quality"
    COST_REDUCTION = "cost_reduction"
    SAFETY = "safety"


class Priority(str, enum.Enum):
    """Recommendation priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecommendationStatus(str, enum.Enum):
    """Recommendation action status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISMISSED = "dismissed"


class Recommendation(BaseModel):
    """AI-generated recommendations for optimization."""
    
    __tablename__ = "recommendations"
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(SQLEnum(RecommendationCategory), nullable=False, index=True)
    confidence_score = Column(Float, nullable=False)
    priority = Column(SQLEnum(Priority), nullable=False, index=True)
    actions = Column(JSONB, default=list, nullable=False)
    vertical = Column(SQLEnum(VerticalType), nullable=False)
    status = Column(SQLEnum(RecommendationStatus), default=RecommendationStatus.PENDING, nullable=False, index=True)
    
    # Relationships
    project = relationship("Project", back_populates="recommendations")
    
    __table_args__ = (
        Index("idx_recommendation_project_status", "project_id", "status"),
        Index("idx_recommendation_priority", "priority"),
        Index("idx_recommendation_category", "category"),
    )
    
    def __repr__(self):
        return f"<Recommendation(id={self.id}, title={self.title}, priority={self.priority})>"
