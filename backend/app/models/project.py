"""
Project model for organizing digital twin implementations.
"""
from sqlalchemy import Column, String, Text, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class VerticalType(str, enum.Enum):
    """Industry vertical types."""
    MANUFACTURING = "manufacturing"
    ENERGY = "energy"
    RETAIL = "retail"


class Project(BaseModel):
    """Project model for organizing sites and implementations."""
    
    __tablename__ = "projects"
    
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    vertical = Column(SQLEnum(VerticalType), nullable=False, index=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="projects")
    sites = relationship("Site", back_populates="project", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="project", cascade="all, delete-orphan")
    simulations = relationship("Simulation", back_populates="project", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="project", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_project_org_vertical", "org_id", "vertical"),
    )
    
    def __repr__(self):
        return f"<Project(id={self.id}, name={self.name}, vertical={self.vertical})>"
