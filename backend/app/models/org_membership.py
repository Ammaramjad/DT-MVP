"""
Organization membership model for user-organization relationships.
"""
from sqlalchemy import Column, ForeignKey, Enum as SQLEnum, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class OrgRole(str, enum.Enum):
    """Organization member role types."""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class OrgMembership(BaseModel):
    """User membership in organizations with roles."""
    
    __tablename__ = "org_memberships"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(SQLEnum(OrgRole), default=OrgRole.MEMBER, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="memberships")
    
    __table_args__ = (
        UniqueConstraint("user_id", "org_id", name="uq_user_org"),
        Index("idx_membership_user_org", "user_id", "org_id"),
    )
    
    def __repr__(self):
        return f"<OrgMembership(user_id={self.user_id}, org_id={self.org_id}, role={self.role})>"
