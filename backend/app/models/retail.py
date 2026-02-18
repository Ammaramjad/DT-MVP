"""
Retail data model for store operations and inventory monitoring.
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Index, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class RetailData(Base):
    """Time-series data for retail operations."""
    
    __tablename__ = "retail_data"
    
    time = Column(DateTime, nullable=False)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    store_id = Column(String(100), nullable=False)
    sku = Column(String(100), nullable=False)
    daily_sales_units = Column(Integer, nullable=True)
    daily_revenue = Column(Float, nullable=True)
    inventory_level = Column(Integer, nullable=True)
    promo_active = Column(Boolean, default=False, nullable=False)
    promo_discount_pct = Column(Float, nullable=True)
    footfall_count = Column(Integer, nullable=True)
    weather_condition = Column(String(50), nullable=True)
    
    # Relationships
    site = relationship("Site", back_populates="retail_data")
    
    __table_args__ = (
        PrimaryKeyConstraint("time", "site_id", "store_id", "sku"),
        Index("idx_retail_time", "time", postgresql_using="btree"),
        Index("idx_retail_site_time", "site_id", "time"),
        Index("idx_retail_store", "store_id"),
        Index("idx_retail_sku", "sku"),
    )
    
    def __repr__(self):
        return f"<RetailData(time={self.time}, site_id={self.site_id}, store_id={self.store_id}, sku={self.sku})>"
