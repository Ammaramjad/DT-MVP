"""
API key model for authentication and authorization.
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class APIKey(BaseModel):
    """API key for programmatic access."""
    
    __tablename__ = "api_keys"
    
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    permissions = Column(JSONB, default=dict, nullable=False)
    last_used = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="api_keys")
    
    __table_args__ = (
        Index("idx_api_key_org_expires", "org_id", "expires_at"),
    )
    
    def __repr__(self):
        return f"<APIKey(id={self.id}, name={self.name}, org_id={self.org_id})>"
