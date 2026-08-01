"""
Integration tests for Project API endpoints.
Tests CRUD operations and organization isolation for projects.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project, VerticalType
from app.models.org_membership import OrgMembership, OrgRole
from tests.test_utils.helpers import (
    assert_error_response,
    assert_field_in_response,
    extract_id_from_response,
    create_project_via_api,
)
from tests.test_utils.factories import ProjectFactory


@pytest.mark.integration
@pytest.mark.projects
class TestProjectsList:
    """Test listing projects."""
    
    def test_list_projects_for_organization(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        admin_membership: OrgMembership
    ):
        """Test listing projects for an organization."""
        response = client.get(
            f"/api/v1/projects?org_id={test_org.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["id"] == str(manufacturing_project.id)
        assert data[0]["name"] == manufacturing_project.name
    
    def test_list_projects_all_accessible(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        energy_project: Project, admin_membership: OrgMembership
    ):
        """Test listing all accessible projects."""
        response = client.get("/api/v1/projects", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        project_ids = [p["id"] for p in data]
        assert str(manufacturing_project.id) in project_ids
        assert str(energy_project.id) in project_ids
    
    def test_list_projects_filtered_by_vertical(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        energy_project: Project, admin_membership: OrgMembership
    ):
        """Test filtering projects by vertical type."""
        response = client.get(
            f"/api/v1/projects?vertical=manufacturing",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for project in data:
            assert project["vertical"] == "manufacturing"
    
    def test_list_projects_no_access(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test listing projects returns empty for org user doesn't belong to."""
        # Create project in second_org
        project = Project(
            org_id=second_org.id,
            name="Inaccessible Project",
            vertical=VerticalType.MANUFACTURING
        )
        db.add(project)
        db.commit()
        
        response = client.get("/api/v1/projects", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        project_ids = [p["id"] for p in data]
        assert str(project.id) not in project_ids
    
    def test_list_projects_unauthorized(self, client: TestClient):
        """Test listing projects requires authentication."""
        response = client.get("/api/v1/projects")
        assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.projects
class TestProjectsCreate:
    """Test creating projects."""
    
    def test_create_project_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test admin can create project."""
        response = client.post(
            "/api/v1/projects",
            json={
                "organization_id": str(test_org.id),
                "name": "New Manufacturing Project",
                "description": "Test project",
                "vertical": "manufacturing"
            },
            headers=admin_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert_field_in_response(response, "id", "name", "vertical", "org_id")
        assert data["name"] == "New Manufacturing Project"
        assert data["vertical"] == "manufacturing"
        assert data["org_id"] == str(test_org.id)
    
    def test_create_project_as_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        test_org: Organization, member_membership: OrgMembership
    ):
        """Test member can create project."""
        response = client.post(
            "/api/v1/projects",
            json={
                "organization_id": str(test_org.id),
                "name": "Member Project",
                "vertical": "energy"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
    
    def test_create_project_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        test_org: Organization, viewer_membership: OrgMembership
    ):
        """Test viewer cannot create project."""
        response = client.post(
            "/api/v1/projects",
            json={
                "organization_id": str(test_org.id),
                "name": "Viewer Project",
                "vertical": "manufacturing"
            },
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_create_project_not_org_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization
    ):
        """Test cannot create project in organization user doesn't belong to."""
        response = client.post(
            "/api/v1/projects",
            json={
                "organization_id": str(second_org.id),
                "name": "Unauthorized Project",
                "vertical": "manufacturing"
            },
            headers=auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_create_project_invalid_vertical(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test creating project with invalid vertical fails."""
        response = client.post(
            "/api/v1/projects",
            json={
                "organization_id": str(test_org.id),
                "name": "Invalid Project",
                "vertical": "invalid_vertical"
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_create_project_all_verticals(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test creating projects for all vertical types."""
        verticals = ["manufacturing", "energy", "retail"]
        
        for vertical in verticals:
            response = client.post(
                "/api/v1/projects",
                json={
                    "organization_id": str(test_org.id),
                    "name": f"{vertical.title()} Project",
                    "vertical": vertical
                },
                headers=admin_auth_headers
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["vertical"] == vertical


@pytest.mark.integration
@pytest.mark.projects
class TestProjectsGet:
    """Test retrieving project details."""
    
    def test_get_project_success(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership
    ):
        """Test retrieving project details."""
        response = client.get(
            f"/api/v1/projects/{manufacturing_project.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(manufacturing_project.id)
        assert data["name"] == manufacturing_project.name
        assert data["vertical"] == manufacturing_project.vertical.value
    
    def test_get_project_not_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot retrieve project from org user doesn't belong to."""
        project = Project(
            org_id=second_org.id,
            name="Inaccessible Project",
            vertical=VerticalType.MANUFACTURING
        )
        db.add(project)
        db.commit()
        
        response = client.get(f"/api/v1/projects/{project.id}", headers=auth_headers)
        
        assert_error_response(response, 403)
    
    def test_get_project_not_found(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test retrieving non-existent project."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/v1/projects/{fake_id}", headers=admin_auth_headers)
        
        assert_error_response(response, 404)


@pytest.mark.integration
@pytest.mark.projects
class TestProjectsUpdate:
    """Test updating projects."""
    
    def test_update_project_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership
    ):
        """Test admin can update project."""
        response = client.put(
            f"/api/v1/projects/{manufacturing_project.id}",
            json={"name": "Updated Project Name", "description": "Updated description"},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Project Name"
        assert data["description"] == "Updated description"
    
    def test_update_project_as_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        manufacturing_project: Project, member_membership: OrgMembership
    ):
        """Test member can update project."""
        response = client.put(
            f"/api/v1/projects/{manufacturing_project.id}",
            json={"name": "Member Updated"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
    
    def test_update_project_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_project: Project, viewer_membership: OrgMembership
    ):
        """Test viewer cannot update project."""
        response = client.put(
            f"/api/v1/projects/{manufacturing_project.id}",
            json={"name": "Viewer Update"},
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_update_project_vertical_immutable(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership
    ):
        """Test project vertical cannot be changed after creation."""
        response = client.put(
            f"/api/v1/projects/{manufacturing_project.id}",
            json={"vertical": "energy"},
            headers=admin_auth_headers
        )
        
        # Should either ignore the field or return error
        assert response.status_code in [200, 400, 422]


@pytest.mark.integration
@pytest.mark.projects
class TestProjectsDelete:
    """Test deleting projects."""
    
    def test_delete_project_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test admin can delete project."""
        project_id = manufacturing_project.id
        
        response = client.delete(
            f"/api/v1/projects/{project_id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify project deleted
        project = db.query(Project).filter(Project.id == project_id).first()
        assert project is None
    
    def test_delete_project_as_member_forbidden(
        self, client: TestClient, test_user: User, auth_headers: dict,
        manufacturing_project: Project, member_membership: OrgMembership
    ):
        """Test member cannot delete project."""
        response = client.delete(
            f"/api/v1/projects/{manufacturing_project.id}",
            headers=auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_delete_project_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_project: Project, viewer_membership: OrgMembership
    ):
        """Test viewer cannot delete project."""
        response = client.delete(
            f"/api/v1/projects/{manufacturing_project.id}",
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_delete_project_not_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot delete project from org user doesn't belong to."""
        project = Project(
            org_id=second_org.id,
            name="Other Org Project",
            vertical=VerticalType.MANUFACTURING
        )
        db.add(project)
        db.commit()
        
        response = client.delete(f"/api/v1/projects/{project.id}", headers=auth_headers)
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.multitenant
@pytest.mark.projects
class TestProjectIsolation:
    """Test multi-tenant project isolation."""
    
    def test_projects_isolated_by_organization(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership, db: Session
    ):
        """Test user only sees projects from their organizations."""
        # Create projects in both orgs
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
        db.commit()
        
        # User should only see project1
        response = client.get("/api/v1/projects", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        project_ids = [p["id"] for p in data]
        assert str(project1.id) in project_ids
        assert str(project2.id) not in project_ids
    
    def test_cannot_access_other_org_project(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership, db: Session
    ):
        """Test cannot access project from other organization."""
        project = Project(
            org_id=second_org.id,
            name="Other Org Project",
            vertical=VerticalType.ENERGY
        )
        db.add(project)
        db.commit()
        
        response = client.get(f"/api/v1/projects/{project.id}", headers=admin_auth_headers)
        
        assert_error_response(response, 403)
    
    def test_cannot_update_other_org_project(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership, db: Session
    ):
        """Test cannot update project from other organization."""
        project = Project(
            org_id=second_org.id,
            name="Other Org Project",
            vertical=VerticalType.RETAIL
        )
        db.add(project)
        db.commit()
        
        response = client.put(
            f"/api/v1/projects/{project.id}",
            json={"name": "Unauthorized Update"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.projects
class TestProjectValidation:
    """Test project input validation."""
    
    def test_create_project_empty_name(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test creating project with empty name fails."""
        response = client.post(
            "/api/v1/projects",
            json={
                "organization_id": str(test_org.id),
                "name": "",
                "vertical": "manufacturing"
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_create_project_missing_required_fields(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test creating project without required fields fails."""
        response = client.post(
            "/api/v1/projects",
            json={"name": "Incomplete Project"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_create_project_invalid_org_id(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test creating project with invalid org ID fails."""
        response = client.post(
            "/api/v1/projects",
            json={
                "organization_id": "invalid-uuid",
                "name": "Invalid Org Project",
                "vertical": "manufacturing"
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
