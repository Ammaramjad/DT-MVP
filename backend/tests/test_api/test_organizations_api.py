"""
Integration tests for Organization API endpoints.
Tests CRUD operations, user invitations, and RBAC for organizations.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.organization import Organization
from app.models.org_membership import OrgMembership, OrgRole
from tests.test_utils.helpers import (
    assert_error_response,
    assert_field_in_response,
    extract_id_from_response,
    get_auth_headers,
)
from tests.test_utils.factories import OrganizationFactory, UserFactory


@pytest.mark.integration
@pytest.mark.organizations
class TestOrganizationsList:
    """Test listing organizations."""
    
    def test_list_organizations_as_member(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test listing organizations user is member of."""
        response = client.get("/api/v1/orgs", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(test_org.id)
        assert data[0]["name"] == test_org.name
    
    def test_list_organizations_multiple_orgs(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization, db: Session
    ):
        """Test listing multiple organizations."""
        # Add user to both orgs
        membership1 = OrgMembership(user_id=admin_user.id, org_id=test_org.id, role=OrgRole.ADMIN)
        membership2 = OrgMembership(user_id=admin_user.id, org_id=second_org.id, role=OrgRole.MEMBER)
        db.add_all([membership1, membership2])
        db.commit()
        
        response = client.get("/api/v1/orgs", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        org_ids = [org["id"] for org in data]
        assert str(test_org.id) in org_ids
        assert str(second_org.id) in org_ids
    
    def test_list_organizations_no_memberships(
        self, client: TestClient, test_user: User, auth_headers: dict
    ):
        """Test listing organizations returns empty for user with no memberships."""
        response = client.get("/api/v1/orgs", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
    
    def test_list_organizations_unauthorized(self, client: TestClient):
        """Test listing organizations requires authentication."""
        response = client.get("/api/v1/orgs")
        assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.organizations
class TestOrganizationsCreate:
    """Test creating organizations."""
    
    def test_create_organization_success(
        self, client: TestClient, test_user: User, auth_headers: dict
    ):
        """Test successful organization creation."""
        response = client.post(
            "/api/v1/orgs",
            json={"name": "New Organization", "plan_type": "professional"},
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert_field_in_response(response, "id", "name", "slug")
        assert data["name"] == "New Organization"
        assert "slug" in data
    
    def test_create_organization_auto_owner(
        self, client: TestClient, test_user: User, auth_headers: dict, db: Session
    ):
        """Test creator becomes organization owner."""
        response = client.post(
            "/api/v1/orgs",
            json={"name": "Owner Test Org"},
            headers=auth_headers
        )
        
        assert response.status_code == 201
        org_id = extract_id_from_response(response)
        
        # Verify user is owner
        membership = db.query(OrgMembership).filter(
            OrgMembership.org_id == org_id,
            OrgMembership.user_id == test_user.id
        ).first()
        
        assert membership is not None
        assert membership.role == OrgRole.OWNER
    
    def test_create_organization_invalid_data(
        self, client: TestClient, auth_headers: dict
    ):
        """Test creating organization with invalid data fails."""
        response = client.post(
            "/api/v1/orgs",
            json={"name": ""},  # Empty name
            headers=auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_create_organization_unauthorized(self, client: TestClient):
        """Test creating organization requires authentication."""
        response = client.post(
            "/api/v1/orgs",
            json={"name": "Unauthorized Org"}
        )
        assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.organizations
class TestOrganizationsGet:
    """Test retrieving organization details."""
    
    def test_get_organization_success(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test retrieving organization details."""
        response = client.get(f"/api/v1/orgs/{test_org.id}", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_org.id)
        assert data["name"] == test_org.name
    
    def test_get_organization_not_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization
    ):
        """Test cannot retrieve organization user is not member of."""
        response = client.get(f"/api/v1/orgs/{second_org.id}", headers=auth_headers)
        
        assert_error_response(response, 403)
    
    def test_get_organization_not_found(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test retrieving non-existent organization."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/v1/orgs/{fake_id}", headers=admin_auth_headers)
        
        assert_error_response(response, 404)


@pytest.mark.integration
@pytest.mark.organizations
class TestOrganizationsUpdate:
    """Test updating organizations."""
    
    def test_update_organization_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test admin can update organization."""
        response = client.put(
            f"/api/v1/orgs/{test_org.id}",
            json={"name": "Updated Organization Name"},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Organization Name"
    
    def test_update_organization_as_member_forbidden(
        self, client: TestClient, test_user: User, auth_headers: dict,
        test_org: Organization, member_membership: OrgMembership
    ):
        """Test member cannot update organization."""
        response = client.put(
            f"/api/v1/orgs/{test_org.id}",
            json={"name": "Unauthorized Update"},
            headers=auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_update_organization_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        test_org: Organization, viewer_membership: OrgMembership
    ):
        """Test viewer cannot update organization."""
        response = client.put(
            f"/api/v1/orgs/{test_org.id}",
            json={"name": "Unauthorized Update"},
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.organizations
class TestOrganizationsDelete:
    """Test deleting organizations."""
    
    def test_delete_organization_as_owner(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, db: Session
    ):
        """Test owner can delete organization."""
        # Make user owner
        membership = db.query(OrgMembership).filter(
            OrgMembership.org_id == test_org.id,
            OrgMembership.user_id == admin_user.id
        ).first()
        membership.role = OrgRole.OWNER
        db.commit()
        
        response = client.delete(f"/api/v1/orgs/{test_org.id}", headers=admin_auth_headers)
        
        assert response.status_code == 204
        
        # Verify organization deleted
        org = db.query(Organization).filter(Organization.id == test_org.id).first()
        assert org is None
    
    def test_delete_organization_as_admin_forbidden(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test admin (non-owner) cannot delete organization."""
        response = client.delete(f"/api/v1/orgs/{test_org.id}", headers=admin_auth_headers)
        
        assert_error_response(response, 403)
    
    def test_delete_organization_as_member_forbidden(
        self, client: TestClient, test_user: User, auth_headers: dict,
        test_org: Organization, member_membership: OrgMembership
    ):
        """Test member cannot delete organization."""
        response = client.delete(f"/api/v1/orgs/{test_org.id}", headers=auth_headers)
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.rbac
@pytest.mark.organizations
class TestOrganizationInvitations:
    """Test user invitation system."""
    
    def test_invite_user_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, admin_membership: OrgMembership
    ):
        """Test admin can invite users to organization."""
        response = client.post(
            f"/api/v1/orgs/{test_org.id}/invitations",
            json={"email": "newuser@example.com", "role": "member"},
            headers=admin_auth_headers
        )
        
        assert response.status_code in [201, 202]
    
    def test_invite_user_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        test_org: Organization, viewer_membership: OrgMembership
    ):
        """Test viewer cannot invite users."""
        response = client.post(
            f"/api/v1/orgs/{test_org.id}/invitations",
            json={"email": "newuser@example.com", "role": "member"},
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_invite_duplicate_member(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, test_user: User, admin_membership: OrgMembership,
        member_membership: OrgMembership
    ):
        """Test inviting existing member returns appropriate response."""
        response = client.post(
            f"/api/v1/orgs/{test_org.id}/invitations",
            json={"email": test_user.email, "role": "member"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 400, "already a member")


@pytest.mark.integration
@pytest.mark.organizations
class TestOrganizationMembers:
    """Test organization member management."""
    
    def test_list_organization_members(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, test_user: User,
        admin_membership: OrgMembership, member_membership: OrgMembership
    ):
        """Test listing organization members."""
        response = client.get(
            f"/api/v1/orgs/{test_org.id}/members",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        member_emails = [m["email"] for m in data]
        assert admin_user.email in member_emails
        assert test_user.email in member_emails
    
    def test_update_member_role_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, test_user: User,
        admin_membership: OrgMembership, member_membership: OrgMembership
    ):
        """Test admin can update member roles."""
        response = client.put(
            f"/api/v1/orgs/{test_org.id}/members/{test_user.id}",
            json={"role": "admin"},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
    
    def test_remove_member_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, test_user: User,
        admin_membership: OrgMembership, member_membership: OrgMembership
    ):
        """Test admin can remove members."""
        response = client.delete(
            f"/api/v1/orgs/{test_org.id}/members/{test_user.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 204
    
    def test_remove_member_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        test_org: Organization, test_user: User,
        viewer_membership: OrgMembership, member_membership: OrgMembership
    ):
        """Test viewer cannot remove members."""
        response = client.delete(
            f"/api/v1/orgs/{test_org.id}/members/{test_user.id}",
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.multitenant
@pytest.mark.organizations
class TestOrganizationIsolation:
    """Test multi-tenant organization isolation."""
    
    def test_cannot_access_other_org_data(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership
    ):
        """Test user cannot access organization they don't belong to."""
        response = client.get(f"/api/v1/orgs/{second_org.id}", headers=admin_auth_headers)
        
        assert_error_response(response, 403)
    
    def test_cannot_update_other_org(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership
    ):
        """Test user cannot update organization they don't belong to."""
        response = client.put(
            f"/api/v1/orgs/{second_org.id}",
            json={"name": "Unauthorized Update"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_cannot_invite_to_other_org(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership
    ):
        """Test user cannot invite to organization they don't belong to."""
        response = client.post(
            f"/api/v1/orgs/{second_org.id}/invitations",
            json={"email": "newuser@example.com", "role": "member"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 403)
