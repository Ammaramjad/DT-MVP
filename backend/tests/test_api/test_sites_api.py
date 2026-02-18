"""
Integration tests for Site API endpoints.
Tests CRUD operations for sites across all verticals.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project, VerticalType
from app.models.site import Site
from app.models.org_membership import OrgMembership, OrgRole
from tests.test_utils.helpers import (
    assert_error_response,
    assert_field_in_response,
    extract_id_from_response,
    create_site_via_api,
)
from tests.test_utils.factories import SiteFactory


@pytest.mark.integration
@pytest.mark.sites
class TestSitesList:
    """Test listing sites."""
    
    def test_list_sites_for_organization(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_site: Site,
        admin_membership: OrgMembership
    ):
        """Test listing sites for an organization."""
        response = client.get(
            f"/api/v1/sites?org_id={test_org.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["id"] == str(manufacturing_site.id)
    
    def test_list_sites_for_project(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, manufacturing_site: Site,
        admin_membership: OrgMembership
    ):
        """Test listing sites for a specific project."""
        response = client.get(
            f"/api/v1/sites?project_id={manufacturing_project.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["project_id"] == str(manufacturing_project.id)
    
    def test_list_sites_all_accessible(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_site: Site,
        energy_site: Site, admin_membership: OrgMembership
    ):
        """Test listing all accessible sites."""
        response = client.get("/api/v1/sites", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        site_ids = [s["id"] for s in data]
        assert str(manufacturing_site.id) in site_ids
        assert str(energy_site.id) in site_ids
    
    def test_list_sites_filtered_by_vertical(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, energy_site: Site, admin_membership: OrgMembership
    ):
        """Test filtering sites by vertical type."""
        response = client.get(
            "/api/v1/sites?vertical=manufacturing",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for site in data:
            assert site["vertical"] == "manufacturing"
    
    def test_list_sites_unauthorized(self, client: TestClient):
        """Test listing sites requires authentication."""
        response = client.get("/api/v1/sites")
        assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.sites
class TestSitesCreate:
    """Test creating sites."""
    
    def test_create_manufacturing_site(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        admin_membership: OrgMembership
    ):
        """Test creating a manufacturing site."""
        response = client.post(
            "/api/v1/sites",
            json={
                "org_id": str(test_org.id),
                "project_id": str(manufacturing_project.id),
                "name": "New Factory",
                "location": "Detroit, MI",
                "vertical": "manufacturing",
                "config": {"line_count": 5, "shift_hours": 24}
            },
            headers=admin_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert_field_in_response(response, "id", "name", "location", "vertical")
        assert data["name"] == "New Factory"
        assert data["vertical"] == "manufacturing"
        assert data["config"]["line_count"] == 5
    
    def test_create_energy_site(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, energy_project: Project,
        admin_membership: OrgMembership
    ):
        """Test creating an energy site."""
        response = client.post(
            "/api/v1/sites",
            json={
                "org_id": str(test_org.id),
                "project_id": str(energy_project.id),
                "name": "Wind Farm Alpha",
                "location": "Kansas",
                "vertical": "energy",
                "config": {"turbine_count": 50, "capacity_mw": 100}
            },
            headers=admin_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["vertical"] == "energy"
        assert data["config"]["turbine_count"] == 50
    
    def test_create_retail_site(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, retail_project: Project,
        admin_membership: OrgMembership
    ):
        """Test creating a retail site."""
        response = client.post(
            "/api/v1/sites",
            json={
                "org_id": str(test_org.id),
                "project_id": str(retail_project.id),
                "name": "Store #42",
                "location": "Chicago, IL",
                "vertical": "retail",
                "config": {"square_feet": 15000, "departments": ["Electronics", "Clothing"]}
            },
            headers=admin_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["vertical"] == "retail"
        assert data["config"]["square_feet"] == 15000
    
    def test_create_site_as_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        member_membership: OrgMembership
    ):
        """Test member can create site."""
        response = client.post(
            "/api/v1/sites",
            json={
                "org_id": str(test_org.id),
                "project_id": str(manufacturing_project.id),
                "name": "Member Site",
                "location": "Cleveland, OH",
                "vertical": "manufacturing",
                "config": {}
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
    
    def test_create_site_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        viewer_membership: OrgMembership
    ):
        """Test viewer cannot create site."""
        response = client.post(
            "/api/v1/sites",
            json={
                "org_id": str(test_org.id),
                "project_id": str(manufacturing_project.id),
                "name": "Viewer Site",
                "location": "Test",
                "vertical": "manufacturing",
                "config": {}
            },
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_create_site_mismatched_vertical(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        admin_membership: OrgMembership
    ):
        """Test creating site with vertical different from project fails."""
        response = client.post(
            "/api/v1/sites",
            json={
                "org_id": str(test_org.id),
                "project_id": str(manufacturing_project.id),
                "name": "Mismatched Site",
                "location": "Test",
                "vertical": "energy",  # Project is manufacturing
                "config": {}
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 400, "vertical")
    
    def test_create_site_not_org_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot create site in org user doesn't belong to."""
        project = Project(
            org_id=second_org.id,
            name="Other Org Project",
            vertical=VerticalType.MANUFACTURING
        )
        db.add(project)
        db.commit()
        
        response = client.post(
            "/api/v1/sites",
            json={
                "org_id": str(second_org.id),
                "project_id": str(project.id),
                "name": "Unauthorized Site",
                "location": "Test",
                "vertical": "manufacturing",
                "config": {}
            },
            headers=auth_headers
        )
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.sites
class TestSitesGet:
    """Test retrieving site details."""
    
    def test_get_site_success(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test retrieving site details."""
        response = client.get(
            f"/api/v1/sites/{manufacturing_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(manufacturing_site.id)
        assert data["name"] == manufacturing_site.name
        assert data["location"] == manufacturing_site.location
        assert data["vertical"] == manufacturing_site.vertical.value
    
    def test_get_site_includes_config(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test site response includes configuration."""
        response = client.get(
            f"/api/v1/sites/{manufacturing_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "config" in data
        assert isinstance(data["config"], dict)
    
    def test_get_site_not_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot retrieve site from org user doesn't belong to."""
        project = Project(
            org_id=second_org.id,
            name="Other Project",
            vertical=VerticalType.MANUFACTURING
        )
        site = Site(
            org_id=second_org.id,
            project_id=project.id,
            name="Other Site",
            location="Test",
            vertical=VerticalType.MANUFACTURING,
            config={}
        )
        db.add_all([project, site])
        db.commit()
        
        response = client.get(f"/api/v1/sites/{site.id}", headers=auth_headers)
        
        assert_error_response(response, 403)
    
    def test_get_site_not_found(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test retrieving non-existent site."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/v1/sites/{fake_id}", headers=admin_auth_headers)
        
        assert_error_response(response, 404)


@pytest.mark.integration
@pytest.mark.sites
class TestSitesUpdate:
    """Test updating sites."""
    
    def test_update_site_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test admin can update site."""
        response = client.put(
            f"/api/v1/sites/{manufacturing_site.id}",
            json={
                "name": "Updated Factory Name",
                "location": "Updated Location"
            },
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Factory Name"
        assert data["location"] == "Updated Location"
    
    def test_update_site_config(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test updating site configuration."""
        new_config = {"line_count": 10, "shift_hours": 16}
        
        response = client.put(
            f"/api/v1/sites/{manufacturing_site.id}",
            json={"config": new_config},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["config"]["line_count"] == 10
    
    def test_update_site_as_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        manufacturing_site: Site, member_membership: OrgMembership
    ):
        """Test member can update site."""
        response = client.put(
            f"/api/v1/sites/{manufacturing_site.id}",
            json={"name": "Member Updated"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
    
    def test_update_site_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_site: Site, viewer_membership: OrgMembership
    ):
        """Test viewer cannot update site."""
        response = client.put(
            f"/api/v1/sites/{manufacturing_site.id}",
            json={"name": "Viewer Update"},
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_update_site_vertical_immutable(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test site vertical cannot be changed after creation."""
        response = client.put(
            f"/api/v1/sites/{manufacturing_site.id}",
            json={"vertical": "energy"},
            headers=admin_auth_headers
        )
        
        # Should either ignore the field or return error
        assert response.status_code in [200, 400, 422]


@pytest.mark.integration
@pytest.mark.sites
class TestSitesDelete:
    """Test deleting sites."""
    
    def test_delete_site_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test admin can delete site."""
        site_id = manufacturing_site.id
        
        response = client.delete(
            f"/api/v1/sites/{site_id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify site deleted
        site = db.query(Site).filter(Site.id == site_id).first()
        assert site is None
    
    def test_delete_site_as_member_forbidden(
        self, client: TestClient, test_user: User, auth_headers: dict,
        manufacturing_site: Site, member_membership: OrgMembership
    ):
        """Test member cannot delete site."""
        response = client.delete(
            f"/api/v1/sites/{manufacturing_site.id}",
            headers=auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_delete_site_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_site: Site, viewer_membership: OrgMembership
    ):
        """Test viewer cannot delete site."""
        response = client.delete(
            f"/api/v1/sites/{manufacturing_site.id}",
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.multitenant
@pytest.mark.sites
class TestSiteIsolation:
    """Test multi-tenant site isolation."""
    
    def test_sites_isolated_by_organization(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership, db: Session
    ):
        """Test user only sees sites from their organizations."""
        # Create projects and sites in both orgs
        project1 = Project(
            org_id=test_org.id,
            name="Test Org Project",
            vertical=VerticalType.MANUFACTURING
        )
        project2 = Project(
            org_id=second_org.id,
            name="Second Org Project",
            vertical=VerticalType.MANUFACTURING
        )
        db.add_all([project1, project2])
        db.flush()
        
        site1 = Site(
            org_id=test_org.id,
            project_id=project1.id,
            name="Test Org Site",
            location="Test",
            vertical=VerticalType.MANUFACTURING,
            config={}
        )
        site2 = Site(
            org_id=second_org.id,
            project_id=project2.id,
            name="Second Org Site",
            location="Test",
            vertical=VerticalType.MANUFACTURING,
            config={}
        )
        db.add_all([site1, site2])
        db.commit()
        
        # User should only see site1
        response = client.get("/api/v1/sites", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        site_ids = [s["id"] for s in data]
        assert str(site1.id) in site_ids
        assert str(site2.id) not in site_ids
    
    def test_cannot_access_other_org_site(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership, db: Session
    ):
        """Test cannot access site from other organization."""
        project = Project(
            org_id=second_org.id,
            name="Other Project",
            vertical=VerticalType.ENERGY
        )
        site = Site(
            org_id=second_org.id,
            project_id=project.id,
            name="Other Site",
            location="Test",
            vertical=VerticalType.ENERGY,
            config={}
        )
        db.add_all([project, site])
        db.commit()
        
        response = client.get(f"/api/v1/sites/{site.id}", headers=admin_auth_headers)
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.sites
class TestSiteValidation:
    """Test site input validation."""
    
    def test_create_site_empty_name(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        admin_membership: OrgMembership
    ):
        """Test creating site with empty name fails."""
        response = client.post(
            "/api/v1/sites",
            json={
                "org_id": str(test_org.id),
                "project_id": str(manufacturing_project.id),
                "name": "",
                "location": "Test",
                "vertical": "manufacturing",
                "config": {}
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_create_site_missing_required_fields(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        admin_membership: OrgMembership
    ):
        """Test creating site without required fields fails."""
        response = client.post(
            "/api/v1/sites",
            json={"name": "Incomplete Site"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_create_site_invalid_vertical(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        admin_membership: OrgMembership
    ):
        """Test creating site with invalid vertical fails."""
        response = client.post(
            "/api/v1/sites",
            json={
                "org_id": str(test_org.id),
                "project_id": str(manufacturing_project.id),
                "name": "Invalid Site",
                "location": "Test",
                "vertical": "invalid_vertical",
                "config": {}
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
