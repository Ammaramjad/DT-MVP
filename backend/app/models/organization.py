"""
Organization model for multi-tenant SaaS platform.
"""
from sqlalchemy import Column, String, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class PlanType(str, enum.Enum):
    """Organization subscription plan types."""
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class Organization(BaseModel):
    """Organization model for multi-tenant architecture."""
    
    __tablename__ = "organizations"
    
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    plan_type = Column(SQLEnum(PlanType), default=PlanType.FREE, nullable=False)
    settings = Column(JSONB, default=dict, nullable=False)
    
    # Relationships
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
    sites = relationship("Site", back_populates="organization", cascade="all, delete-orphan")
    memberships = relationship("OrgMembership", back_populates="organization", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="organization", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Organization(id={self.id}, name={self.name}, slug={self.slug})>"
