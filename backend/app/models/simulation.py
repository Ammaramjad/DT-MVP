"""
Simulation model for what-if scenario analysis.
"""
from sqlalchemy import Column, String, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class SimulationStatus(str, enum.Enum):
    """Simulation execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Simulation(BaseModel):
    """Simulation model for what-if analysis."""
    
    __tablename__ = "simulations"
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    parameters = Column(JSONB, default=dict, nullable=False)
    status = Column(SQLEnum(SimulationStatus), default=SimulationStatus.PENDING, nullable=False, index=True)
    results = Column(JSONB, default=dict, nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="simulations")
    
    __table_args__ = (
        Index("idx_simulation_project_status", "project_id", "status"),
    )
    
    def __repr__(self):
        return f"<Simulation(id={self.id}, name={self.name}, status={self.status})>"
