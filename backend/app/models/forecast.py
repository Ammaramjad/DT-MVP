"""
Forecast models for predictive analytics.
"""
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.project import VerticalType


class Forecast(BaseModel):
    """Forecast model for trained prediction models."""
    
    __tablename__ = "forecasts"
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    vertical = Column(SQLEnum(VerticalType), nullable=False)
    model_type = Column(String(100), nullable=False)
    trained_at = Column(DateTime, nullable=False)
    metrics = Column(JSONB, default=dict, nullable=False)
    config = Column(JSONB, default=dict, nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="forecasts")
    results = relationship("ForecastResult", back_populates="forecast", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_forecast_project_vertical", "project_id", "vertical"),
        Index("idx_forecast_trained_at", "trained_at"),
    )
    
    def __repr__(self):
        return f"<Forecast(id={self.id}, project_id={self.project_id}, model_type={self.model_type})>"


class ForecastResult(BaseModel):
    """Individual forecast prediction results."""
    
    __tablename__ = "forecast_results"
    
    forecast_id = Column(UUID(as_uuid=True), ForeignKey("forecasts.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    predicted_value = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)
    actual_value = Column(Float, nullable=True)
    
    # Relationships
    forecast = relationship("Forecast", back_populates="results")
    
    __table_args__ = (
        Index("idx_forecast_result_forecast_time", "forecast_id", "timestamp"),
    )
    
    def __repr__(self):
        return f"<ForecastResult(id={self.id}, forecast_id={self.forecast_id}, timestamp={self.timestamp})>"
