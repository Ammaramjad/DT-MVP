"""
Unit tests for SQLAlchemy models.
Tests model creation, relationships, constraints, and basic operations.
"""
import pytest
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.organization import Organization, PlanType
from app.models.org_membership import OrgMembership, OrgRole
from app.models.project import Project, VerticalType
from app.models.site import Site
from tests.test_utils.factories import (
    UserFactory,
    OrganizationFactory,
    OrgMembershipFactory,
    ProjectFactory,
    SiteFactory
)


@pytest.mark.unit
@pytest.mark.database
class TestUserModel:
    """Test User model functionality."""
    
    def test_create_user(self, db: Session):
        """Test creating a user with required fields."""
        user = UserFactory.create(
            email="test@example.com",
            full_name="Test User"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.full_name == "Test User"
        assert user.is_active is True
        assert user.created_at is not None
        assert user.updated_at is not None
    
    def test_user_email_unique_constraint(self, db: Session):
        """Test that user email must be unique."""
        user1 = UserFactory.create(email="duplicate@example.com")
        db.add(user1)
        db.commit()
        
        user2 = UserFactory.create(email="duplicate@example.com")
        db.add(user2)
        
        with pytest.raises(IntegrityError):
            db.commit()
    
    def test_user_password_hashed(self, db: Session):
        """Test that user password is properly hashed."""
        user = UserFactory.create(password="TestPass123!")
        db.add(user)
        db.commit()
        
        # Hashed password should not match plain password
        assert user.hashed_password != "TestPass123!"
        assert len(user.hashed_password) > 20
    
    def test_user_relationships(self, db: Session, test_user: User, test_org: Organization):
        """Test user memberships relationship."""
        membership = OrgMembershipFactory.create(
            user_id=test_user.id,
            org_id=test_org.id,
            role=OrgRole.ADMIN
        )
        db.add(membership)
        db.commit()
        
        db.refresh(test_user)
        assert len(test_user.memberships) == 1
        assert test_user.memberships[0].org_id == test_org.id
    
    def test_user_repr(self, db: Session):
        """Test user string representation."""
        user = UserFactory.create(email="repr@example.com", full_name="Repr User")
        db.add(user)
        db.commit()
        
        repr_str = repr(user)
        assert "User" in repr_str
        assert "repr@example.com" in repr_str


@pytest.mark.unit
@pytest.mark.database
class TestOrganizationModel:
    """Test Organization model functionality."""
    
    def test_create_organization(self, db: Session):
        """Test creating an organization."""
        org = OrganizationFactory.create(
            name="Test Org",
            slug="test-org",
            plan_type=PlanType.PROFESSIONAL
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        assert org.id is not None
        assert org.name == "Test Org"
        assert org.slug == "test-org"
        assert org.plan_type == PlanType.PROFESSIONAL
        assert org.settings == {}
    
    def test_organization_slug_unique(self, db: Session):
        """Test that organization slug must be unique."""
        org1 = OrganizationFactory.create(slug="unique-slug")
        db.add(org1)
        db.commit()
        
        org2 = OrganizationFactory.create(slug="unique-slug")
        db.add(org2)
        
        with pytest.raises(IntegrityError):
            db.commit()
    
    def test_organization_plan_types(self, db: Session):
        """Test all organization plan types."""
        for plan in [PlanType.FREE, PlanType.STARTER, PlanType.PROFESSIONAL, PlanType.ENTERPRISE]:
            org = OrganizationFactory.create(plan_type=plan)
            db.add(org)
            db.commit()
            db.refresh(org)
            
            assert org.plan_type == plan
            db.delete(org)
            db.commit()
    
    def test_organization_settings_jsonb(self, db: Session):
        """Test organization settings JSONB field."""
        settings = {
            "features": ["manufacturing", "energy"],
            "limits": {"users": 10, "projects": 5}
        }
        org = OrganizationFactory.create(settings=settings)
        db.add(org)
        db.commit()
        db.refresh(org)
        
        assert org.settings == settings
        assert org.settings["features"] == ["manufacturing", "energy"]
    
    def test_organization_cascade_delete(self, db: Session):
        """Test cascade delete of organization deletes projects and sites."""
        org = OrganizationFactory.create()
        db.add(org)
        db.commit()
        
        project = ProjectFactory.create(org_id=org.id)
        db.add(project)
        db.commit()
        
        org_id = org.id
        project_id = project.id
        
        db.delete(org)
        db.commit()
        
        # Verify project was cascade deleted
        assert db.query(Project).filter(Project.id == project_id).first() is None


@pytest.mark.unit
@pytest.mark.database
class TestOrgMembershipModel:
    """Test OrgMembership model functionality."""
    
    def test_create_membership(self, db: Session, test_user: User, test_org: Organization):
        """Test creating organization membership."""
        membership = OrgMembershipFactory.create(
            user_id=test_user.id,
            org_id=test_org.id,
            role=OrgRole.ADMIN
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)
        
        assert membership.id is not None
        assert membership.user_id == test_user.id
        assert membership.org_id == test_org.id
        assert membership.role == OrgRole.ADMIN
    
    def test_membership_unique_constraint(self, db: Session, test_user: User, test_org: Organization):
        """Test that user can't have duplicate membership in same org."""
        membership1 = OrgMembershipFactory.create(
            user_id=test_user.id,
            org_id=test_org.id,
            role=OrgRole.MEMBER
        )
        db.add(membership1)
        db.commit()
        
        membership2 = OrgMembershipFactory.create(
            user_id=test_user.id,
            org_id=test_org.id,
            role=OrgRole.ADMIN
        )
        db.add(membership2)
        
        with pytest.raises(IntegrityError):
            db.commit()
    
    def test_membership_roles(self, db: Session, test_user: User, test_org: Organization):
        """Test all membership role types."""
        for role in [OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER, OrgRole.VIEWER]:
            membership = OrgMembershipFactory.create(
                user_id=test_user.id,
                org_id=test_org.id,
                role=role
            )
            db.add(membership)
            db.commit()
            db.refresh(membership)
            
            assert membership.role == role
            db.delete(membership)
            db.commit()
    
    def test_membership_relationships(self, db: Session, test_user: User, test_org: Organization):
        """Test membership relationships to user and organization."""
        membership = OrgMembershipFactory.create(
            user_id=test_user.id,
            org_id=test_org.id
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)
        
        assert membership.user.id == test_user.id
        assert membership.organization.id == test_org.id


@pytest.mark.unit
@pytest.mark.database
class TestProjectModel:
    """Test Project model functionality."""
    
    def test_create_project(self, db: Session, test_org: Organization):
        """Test creating a project."""
        project = ProjectFactory.create(
            org_id=test_org.id,
            name="Test Project",
            vertical=VerticalType.MANUFACTURING
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        assert project.id is not None
        assert project.org_id == test_org.id
        assert project.name == "Test Project"
        assert project.vertical == VerticalType.MANUFACTURING
    
    def test_project_verticals(self, db: Session, test_org: Organization):
        """Test all project vertical types."""
        for vertical in [VerticalType.MANUFACTURING, VerticalType.ENERGY, VerticalType.RETAIL]:
            project = ProjectFactory.create(
                org_id=test_org.id,
                vertical=vertical
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            
            assert project.vertical == vertical
            db.delete(project)
            db.commit()
    
    def test_project_organization_relationship(self, db: Session, test_org: Organization):
        """Test project relationship to organization."""
        project = ProjectFactory.create(org_id=test_org.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        
        assert project.organization.id == test_org.id
        assert project.organization.name == test_org.name
    
    def test_project_cascade_delete(self, db: Session, test_org: Organization):
        """Test cascade delete of project deletes sites."""
        project = ProjectFactory.create(org_id=test_org.id)
        db.add(project)
        db.commit()
        
        site = SiteFactory.create(
            org_id=test_org.id,
            project_id=project.id,
            vertical=project.vertical
        )
        db.add(site)
        db.commit()
        
        project_id = project.id
        site_id = site.id
        
        db.delete(project)
        db.commit()
        
        # Verify site was cascade deleted
        assert db.query(Site).filter(Site.id == site_id).first() is None


@pytest.mark.unit
@pytest.mark.database
class TestSiteModel:
    """Test Site model functionality."""
    
    def test_create_site(self, db: Session, test_org: Organization, manufacturing_project: Project):
        """Test creating a site."""
        site = SiteFactory.create(
            org_id=test_org.id,
            project_id=manufacturing_project.id,
            name="Test Site",
            location="Test Location",
            vertical=VerticalType.MANUFACTURING
        )
        db.add(site)
        db.commit()
        db.refresh(site)
        
        assert site.id is not None
        assert site.org_id == test_org.id
        assert site.project_id == manufacturing_project.id
        assert site.name == "Test Site"
        assert site.location == "Test Location"
        assert site.vertical == VerticalType.MANUFACTURING
    
    def test_site_config_jsonb(self, db: Session, test_org: Organization, manufacturing_project: Project):
        """Test site config JSONB field."""
        config = {
            "line_count": 5,
            "shift_hours": 24,
            "capacity": 1000
        }
        site = SiteFactory.create(
            org_id=test_org.id,
            project_id=manufacturing_project.id,
            vertical=VerticalType.MANUFACTURING,
            config=config
        )
        db.add(site)
        db.commit()
        db.refresh(site)
        
        assert site.config == config
        assert site.config["line_count"] == 5
    
    def test_site_relationships(self, db: Session, test_org: Organization, manufacturing_project: Project):
        """Test site relationships to organization and project."""
        site = SiteFactory.create(
            org_id=test_org.id,
            project_id=manufacturing_project.id,
            vertical=VerticalType.MANUFACTURING
        )
        db.add(site)
        db.commit()
        db.refresh(site)
        
        assert site.organization.id == test_org.id
        assert site.project.id == manufacturing_project.id
    
    def test_site_timestamps(self, db: Session, test_org: Organization, manufacturing_project: Project):
        """Test site has created_at and updated_at timestamps."""
        site = SiteFactory.create(
            org_id=test_org.id,
            project_id=manufacturing_project.id,
            vertical=VerticalType.MANUFACTURING
        )
        db.add(site)
        db.commit()
        db.refresh(site)
        
        assert site.created_at is not None
        assert site.updated_at is not None
        assert isinstance(site.created_at, datetime)
        assert isinstance(site.updated_at, datetime)
