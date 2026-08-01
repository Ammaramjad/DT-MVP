"""
Integration tests for Recommendations API endpoints.
Tests recommendation retrieval, status updates, and filtering.
"""
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project, VerticalType
from app.models.site import Site
from app.models.recommendation import Recommendation, RecommendationStatus, RecommendationPriority, RecommendationCategory
from app.models.org_membership import OrgMembership, OrgRole
from tests.test_utils.helpers import (
    assert_error_response,
    assert_field_in_response,
)


@pytest.mark.integration
@pytest.mark.recommendations
class TestRecommendationsList:
    """Test listing recommendations."""
    
    def test_list_all_recommendations(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_project: Project,
        admin_membership: OrgMembership, db: Session
    ):
        """Test listing all accessible recommendations."""
        # Create some recommendations
        for i in range(3):
            rec = Recommendation(
                project_id=manufacturing_project.id,
                title=f"Recommendation {i}",
                description=f"Description {i}",
                category=RecommendationCategory.EFFICIENCY,
                priority=RecommendationPriority.MEDIUM,
                confidence_score=0.85,
                status=RecommendationStatus.PENDING,
                vertical=VerticalType.MANUFACTURING,
                actions=["Action 1", "Action 2"]
            )
            db.add(rec)
        db.commit()
        
        response = client.get("/api/v1/recommendations/", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        assert_field_in_response(response, "id", "title", "priority", "status")
    
    def test_list_recommendations_filtered_by_project(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, energy_project: Project,
        admin_membership: OrgMembership, db: Session
    ):
        """Test filtering recommendations by project."""
        rec1 = Recommendation(
            project_id=manufacturing_project.id,
            title="Manufacturing Rec",
            description="Test",
            category=RecommendationCategory.COST_REDUCTION,
            priority=RecommendationPriority.HIGH,
            confidence_score=0.9,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        rec2 = Recommendation(
            project_id=energy_project.id,
            title="Energy Rec",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.LOW,
            confidence_score=0.75,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.ENERGY,
            actions=[]
        )
        db.add_all([rec1, rec2])
        db.commit()
        
        response = client.get(
            f"/api/v1/recommendations/?project_id={manufacturing_project.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for rec in data:
            assert rec["project_id"] == str(manufacturing_project.id)
    
    def test_list_recommendations_filtered_by_status(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test filtering recommendations by status."""
        statuses = [RecommendationStatus.PENDING, RecommendationStatus.IN_PROGRESS, RecommendationStatus.COMPLETED]
        
        for status in statuses:
            rec = Recommendation(
                project_id=manufacturing_project.id,
                title=f"{status.value} Recommendation",
                description="Test",
                category=RecommendationCategory.EFFICIENCY,
                priority=RecommendationPriority.MEDIUM,
                confidence_score=0.8,
                status=status,
                vertical=VerticalType.MANUFACTURING,
                actions=[]
            )
            db.add(rec)
        db.commit()
        
        response = client.get(
            "/api/v1/recommendations/?status=pending",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for rec in data:
            assert rec["status"] == "pending"
    
    def test_list_recommendations_filtered_by_priority(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test filtering recommendations by priority."""
        priorities = [RecommendationPriority.HIGH, RecommendationPriority.MEDIUM, RecommendationPriority.LOW]
        
        for priority in priorities:
            rec = Recommendation(
                project_id=manufacturing_project.id,
                title=f"{priority.value} Priority Rec",
                description="Test",
                category=RecommendationCategory.QUALITY,
                priority=priority,
                confidence_score=0.85,
                status=RecommendationStatus.PENDING,
                vertical=VerticalType.MANUFACTURING,
                actions=[]
            )
            db.add(rec)
        db.commit()
        
        response = client.get(
            "/api/v1/recommendations/?priority=high",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for rec in data:
            assert rec["priority"] == "high"
    
    def test_list_recommendations_no_access(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot list recommendations from inaccessible projects."""
        project = Project(
            org_id=second_org.id,
            name="Other Project",
            vertical=VerticalType.MANUFACTURING
        )
        db.add(project)
        db.flush()
        
        rec = Recommendation(
            project_id=project.id,
            title="Inaccessible Rec",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.MEDIUM,
            confidence_score=0.8,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        
        response = client.get("/api/v1/recommendations/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        rec_ids = [r["id"] for r in data]
        assert str(rec.id) not in rec_ids
    
    def test_list_recommendations_unauthorized(self, client: TestClient):
        """Test listing recommendations requires authentication."""
        response = client.get("/api/v1/recommendations/")
        assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.recommendations
class TestRecommendationsGet:
    """Test retrieving recommendation details."""
    
    def test_get_recommendation_success(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test retrieving recommendation details."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Optimize Production Line",
            description="Detailed description of optimization",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.HIGH,
            confidence_score=0.92,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=["Step 1", "Step 2", "Step 3"],
            metadata={"expected_roi": 1.5}
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        
        response = client.get(
            f"/api/v1/recommendations/{rec.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(rec.id)
        assert data["title"] == "Optimize Production Line"
        assert data["priority"] == "high"
        assert data["confidence_score"] == 0.92
    
    def test_get_recommendation_includes_actions(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test recommendation includes implementation steps."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Test Recommendation",
            description="Test",
            category=RecommendationCategory.COST_REDUCTION,
            priority=RecommendationPriority.MEDIUM,
            confidence_score=0.85,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=["Action A", "Action B", "Action C"]
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        
        response = client.get(
            f"/api/v1/recommendations/{rec.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "implementation_steps" in data or "actions" in data
        actions = data.get("implementation_steps", data.get("actions", []))
        assert len(actions) == 3
    
    def test_get_recommendation_not_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot retrieve recommendation from inaccessible project."""
        project = Project(
            org_id=second_org.id,
            name="Other Project",
            vertical=VerticalType.ENERGY
        )
        db.add(project)
        db.flush()
        
        rec = Recommendation(
            project_id=project.id,
            title="Inaccessible",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.LOW,
            confidence_score=0.7,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.ENERGY,
            actions=[]
        )
        db.add(rec)
        db.commit()
        
        response = client.get(f"/api/v1/recommendations/{rec.id}", headers=auth_headers)
        
        assert_error_response(response, 403)
    
    def test_get_recommendation_not_found(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test retrieving non-existent recommendation."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(
            f"/api/v1/recommendations/{fake_id}",
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 404)


@pytest.mark.integration
@pytest.mark.recommendations
class TestRecommendationsUpdateStatus:
    """Test updating recommendation status."""
    
    def test_update_recommendation_status_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test admin can update recommendation status."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Test Recommendation",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.HIGH,
            confidence_score=0.9,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        
        response = client.patch(
            f"/api/v1/recommendations/{rec.id}/status",
            json={"status": "in_progress"},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
    
    def test_update_recommendation_status_as_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        manufacturing_project: Project, member_membership: OrgMembership, db: Session
    ):
        """Test member can update recommendation status."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Member Test",
            description="Test",
            category=RecommendationCategory.QUALITY,
            priority=RecommendationPriority.MEDIUM,
            confidence_score=0.8,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        
        response = client.patch(
            f"/api/v1/recommendations/{rec.id}/status",
            json={"status": "in_progress"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
    
    def test_update_recommendation_status_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_project: Project, viewer_membership: OrgMembership, db: Session
    ):
        """Test viewer cannot update recommendation status."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Viewer Test",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.LOW,
            confidence_score=0.75,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        
        response = client.patch(
            f"/api/v1/recommendations/{rec.id}/status",
            json={"status": "in_progress"},
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_update_recommendation_status_progression(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test recommendation status can progress through states."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Status Test",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.HIGH,
            confidence_score=0.9,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        
        # Pending -> In Progress
        response = client.patch(
            f"/api/v1/recommendations/{rec.id}/status",
            json={"status": "in_progress"},
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        
        # In Progress -> Completed
        response = client.patch(
            f"/api/v1/recommendations/{rec.id}/status",
            json={"status": "completed"},
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
    
    def test_update_recommendation_status_rejected(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test recommendation can be rejected."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="To Reject",
            description="Test",
            category=RecommendationCategory.COST_REDUCTION,
            priority=RecommendationPriority.LOW,
            confidence_score=0.6,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        
        response = client.patch(
            f"/api/v1/recommendations/{rec.id}/status",
            json={"status": "rejected"},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rejected"
    
    def test_update_recommendation_invalid_status(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test updating recommendation with invalid status fails."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Invalid Status Test",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.MEDIUM,
            confidence_score=0.8,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        
        response = client.patch(
            f"/api/v1/recommendations/{rec.id}/status",
            json={"status": "invalid_status"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)


@pytest.mark.integration
@pytest.mark.recommendations
class TestRecommendationsDelete:
    """Test deleting recommendations."""
    
    def test_delete_recommendation_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test admin can delete recommendations."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="To Delete",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.LOW,
            confidence_score=0.7,
            status=RecommendationStatus.REJECTED,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        rec_id = rec.id
        
        response = client.delete(
            f"/api/v1/recommendations/{rec_id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify deleted
        deleted_rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
        assert deleted_rec is None
    
    def test_delete_recommendation_as_member_forbidden(
        self, client: TestClient, test_user: User, auth_headers: dict,
        manufacturing_project: Project, member_membership: OrgMembership, db: Session
    ):
        """Test member cannot delete recommendations."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Test",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.MEDIUM,
            confidence_score=0.8,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        
        response = client.delete(
            f"/api/v1/recommendations/{rec.id}",
            headers=auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_delete_recommendation_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_project: Project, viewer_membership: OrgMembership, db: Session
    ):
        """Test viewer cannot delete recommendations."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Test",
            description="Test",
            category=RecommendationCategory.QUALITY,
            priority=RecommendationPriority.LOW,
            confidence_score=0.75,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        
        response = client.delete(
            f"/api/v1/recommendations/{rec.id}",
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.multitenant
@pytest.mark.recommendations
class TestRecommendationsIsolation:
    """Test multi-tenant recommendation isolation."""
    
    def test_recommendations_isolated_by_organization(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership, db: Session
    ):
        """Test recommendations are isolated by organization."""
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
        db.flush()
        
        # Create recommendations for both projects
        rec1 = Recommendation(
            project_id=project1.id,
            title="Accessible Rec",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.HIGH,
            confidence_score=0.9,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        rec2 = Recommendation(
            project_id=project2.id,
            title="Inaccessible Rec",
            description="Test",
            category=RecommendationCategory.COST_REDUCTION,
            priority=RecommendationPriority.MEDIUM,
            confidence_score=0.85,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add_all([rec1, rec2])
        db.commit()
        
        # List recommendations - should only see rec1
        response = client.get("/api/v1/recommendations/", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        rec_ids = [r["id"] for r in data]
        assert str(rec1.id) in rec_ids
        assert str(rec2.id) not in rec_ids


@pytest.mark.integration
@pytest.mark.recommendations
class TestRecommendationsValidation:
    """Test recommendation input validation."""
    
    def test_update_status_invalid_recommendation_id(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test updating status with invalid recommendation ID."""
        response = client.patch(
            "/api/v1/recommendations/invalid-uuid/status",
            json={"status": "in_progress"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_update_status_missing_status_field(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_project: Project, admin_membership: OrgMembership, db: Session
    ):
        """Test updating status without status field fails."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="Test",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.MEDIUM,
            confidence_score=0.8,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        
        response = client.patch(
            f"/api/v1/recommendations/{rec.id}/status",
            json={},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)


@pytest.mark.integration
@pytest.mark.rbac
@pytest.mark.recommendations
class TestRecommendationsRBAC:
    """Test recommendation RBAC."""
    
    def test_viewer_can_view_recommendations(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_project: Project, viewer_membership: OrgMembership, db: Session
    ):
        """Test viewer can view recommendations but not modify them."""
        rec = Recommendation(
            project_id=manufacturing_project.id,
            title="View Test",
            description="Test",
            category=RecommendationCategory.EFFICIENCY,
            priority=RecommendationPriority.HIGH,
            confidence_score=0.9,
            status=RecommendationStatus.PENDING,
            vertical=VerticalType.MANUFACTURING,
            actions=[]
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        
        # Can view
        response = client.get(
            f"/api/v1/recommendations/{rec.id}",
            headers=viewer_auth_headers
        )
        assert response.status_code == 200
        
        # Cannot update
        response = client.patch(
            f"/api/v1/recommendations/{rec.id}/status",
            json={"status": "in_progress"},
            headers=viewer_auth_headers
        )
        assert_error_response(response, 403)
