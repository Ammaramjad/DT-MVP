"""
Integration tests for Simulation API endpoints.
Tests simulation execution and scenario analysis.
"""
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project, VerticalType
from app.models.site import Site
from app.models.simulation import Simulation
from app.models.org_membership import OrgMembership, OrgRole
from tests.test_utils.helpers import (
    assert_error_response,
    assert_field_in_response,
    extract_id_from_response,
)


@pytest.mark.integration
@pytest.mark.simulations
class TestSimulationsRun:
    """Test running simulations."""
    
    def test_run_simulation_manufacturing(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test running a manufacturing simulation."""
        response = client.post(
            "/api/v1/simulations/run",
            json={
                "site_id": str(manufacturing_site.id),
                "scenario_name": "Increased Production",
                "parameters": {
                    "production_increase_pct": 20,
                    "downtime_reduction_pct": 10
                },
                "duration_days": 30
            },
            headers=admin_auth_headers
        )
        
        # Simulation should be accepted for processing
        assert response.status_code == 202
        data = response.json()
        assert "simulation_id" in data or "job_id" in data
        assert "status" in data
    
    def test_run_simulation_energy(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        energy_site: Site, admin_membership: OrgMembership
    ):
        """Test running an energy simulation."""
        response = client.post(
            "/api/v1/simulations/run",
            json={
                "site_id": str(energy_site.id),
                "scenario_name": "Solar Panel Addition",
                "parameters": {
                    "additional_capacity_kw": 1000,
                    "efficiency_improvement_pct": 5
                },
                "duration_days": 365
            },
            headers=admin_auth_headers
        )
        
        assert response.status_code == 202
        data = response.json()
        assert "simulation_id" in data or "job_id" in data
    
    def test_run_simulation_retail(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        retail_site: Site, admin_membership: OrgMembership
    ):
        """Test running a retail simulation."""
        response = client.post(
            "/api/v1/simulations/run",
            json={
                "site_id": str(retail_site.id),
                "scenario_name": "Holiday Season",
                "parameters": {
                    "demand_increase_pct": 30,
                    "inventory_multiplier": 1.5
                },
                "duration_days": 60
            },
            headers=admin_auth_headers
        )
        
        assert response.status_code == 202
    
    def test_run_simulation_as_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        manufacturing_site: Site, member_membership: OrgMembership
    ):
        """Test member can run simulations."""
        response = client.post(
            "/api/v1/simulations/run",
            json={
                "site_id": str(manufacturing_site.id),
                "scenario_name": "Test Scenario",
                "parameters": {"test": 123},
                "duration_days": 30
            },
            headers=auth_headers
        )
        
        assert response.status_code == 202
    
    def test_run_simulation_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_site: Site, viewer_membership: OrgMembership
    ):
        """Test viewer cannot run simulations."""
        response = client.post(
            "/api/v1/simulations/run",
            json={
                "site_id": str(manufacturing_site.id),
                "scenario_name": "Viewer Test",
                "parameters": {},
                "duration_days": 30
            },
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_run_simulation_site_not_found(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test running simulation for non-existent site."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.post(
            "/api/v1/simulations/run",
            json={
                "site_id": fake_id,
                "scenario_name": "Test",
                "parameters": {},
                "duration_days": 30
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 404)
    
    def test_run_simulation_not_org_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot run simulation for site user doesn't have access to."""
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
        
        response = client.post(
            "/api/v1/simulations/run",
            json={
                "site_id": str(site.id),
                "scenario_name": "Unauthorized",
                "parameters": {},
                "duration_days": 30
            },
            headers=auth_headers
        )
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.simulations
class TestSimulationsList:
    """Test listing simulations."""
    
    def test_list_simulations_for_site(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test listing simulations for a site."""
        # Create some simulations
        for i in range(3):
            sim = Simulation(
                site_id=manufacturing_site.id,
                scenario_name=f"Scenario {i}",
                parameters={"test": i},
                status="completed",
                results={"output": i * 10}
            )
            db.add(sim)
        db.commit()
        
        response = client.get(
            f"/api/v1/simulations?site_id={manufacturing_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
    
    def test_list_simulations_filtered_by_status(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test filtering simulations by status."""
        # Create simulations with different statuses
        statuses = ["pending", "running", "completed"]
        for status in statuses:
            sim = Simulation(
                site_id=manufacturing_site.id,
                scenario_name=f"{status} scenario",
                parameters={},
                status=status,
                results={}
            )
            db.add(sim)
        db.commit()
        
        response = client.get(
            "/api/v1/simulations?status=completed",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for sim in data:
            assert sim["status"] == "completed"
    
    def test_list_simulations_no_access(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot list simulations for sites without access."""
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
        db.flush()
        
        sim = Simulation(
            site_id=site.id,
            scenario_name="Hidden Simulation",
            parameters={},
            status="completed",
            results={}
        )
        db.add(sim)
        db.commit()
        
        response = client.get("/api/v1/simulations", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        sim_ids = [s["id"] for s in data]
        assert str(sim.id) not in sim_ids


@pytest.mark.integration
@pytest.mark.simulations
class TestSimulationsGet:
    """Test retrieving simulation details."""
    
    def test_get_simulation_success(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test retrieving simulation details."""
        sim = Simulation(
            site_id=manufacturing_site.id,
            scenario_name="Test Scenario",
            parameters={"param1": 100},
            status="completed",
            results={"output": 200, "metrics": {"accuracy": 0.95}}
        )
        db.add(sim)
        db.commit()
        db.refresh(sim)
        
        response = client.get(
            f"/api/v1/simulations/{sim.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert_field_in_response(response, "id", "scenario_name", "status", "results")
        assert data["id"] == str(sim.id)
        assert data["scenario_name"] == "Test Scenario"
        assert data["status"] == "completed"
    
    def test_get_simulation_includes_results(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test simulation details include results."""
        sim = Simulation(
            site_id=manufacturing_site.id,
            scenario_name="Results Test",
            parameters={},
            status="completed",
            results={
                "predicted_oee": 85.5,
                "cost_savings": 50000,
                "recommendations": ["Action 1", "Action 2"]
            }
        )
        db.add(sim)
        db.commit()
        db.refresh(sim)
        
        response = client.get(
            f"/api/v1/simulations/{sim.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], dict)
    
    def test_get_simulation_not_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot retrieve simulation from site without access."""
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
        db.flush()
        
        sim = Simulation(
            site_id=site.id,
            scenario_name="Inaccessible",
            parameters={},
            status="completed",
            results={}
        )
        db.add(sim)
        db.commit()
        
        response = client.get(f"/api/v1/simulations/{sim.id}", headers=auth_headers)
        
        assert_error_response(response, 403)
    
    def test_get_simulation_not_found(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test retrieving non-existent simulation."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(
            f"/api/v1/simulations/{fake_id}",
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 404)


@pytest.mark.integration
@pytest.mark.simulations
class TestSimulationsCancel:
    """Test canceling simulations."""
    
    def test_cancel_simulation_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test admin can cancel running simulation."""
        sim = Simulation(
            site_id=manufacturing_site.id,
            scenario_name="Running Scenario",
            parameters={},
            status="running",
            results={}
        )
        db.add(sim)
        db.commit()
        db.refresh(sim)
        
        response = client.post(
            f"/api/v1/simulations/{sim.id}/cancel",
            headers=admin_auth_headers
        )
        
        assert response.status_code in [200, 202]
    
    def test_cancel_simulation_as_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        manufacturing_site: Site, member_membership: OrgMembership, db: Session
    ):
        """Test member can cancel their own simulation."""
        sim = Simulation(
            site_id=manufacturing_site.id,
            scenario_name="Member Scenario",
            parameters={},
            status="running",
            results={}
        )
        db.add(sim)
        db.commit()
        db.refresh(sim)
        
        response = client.post(
            f"/api/v1/simulations/{sim.id}/cancel",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 202]
    
    def test_cancel_simulation_as_viewer_forbidden(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_site: Site, viewer_membership: OrgMembership, db: Session
    ):
        """Test viewer cannot cancel simulations."""
        sim = Simulation(
            site_id=manufacturing_site.id,
            scenario_name="Test",
            parameters={},
            status="running",
            results={}
        )
        db.add(sim)
        db.commit()
        db.refresh(sim)
        
        response = client.post(
            f"/api/v1/simulations/{sim.id}/cancel",
            headers=viewer_auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_cancel_completed_simulation(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test cannot cancel already completed simulation."""
        sim = Simulation(
            site_id=manufacturing_site.id,
            scenario_name="Completed",
            parameters={},
            status="completed",
            results={}
        )
        db.add(sim)
        db.commit()
        db.refresh(sim)
        
        response = client.post(
            f"/api/v1/simulations/{sim.id}/cancel",
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 400, "cannot cancel")


@pytest.mark.integration
@pytest.mark.simulations
class TestSimulationsDelete:
    """Test deleting simulations."""
    
    def test_delete_simulation_as_admin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test admin can delete simulation."""
        sim = Simulation(
            site_id=manufacturing_site.id,
            scenario_name="To Delete",
            parameters={},
            status="completed",
            results={}
        )
        db.add(sim)
        db.commit()
        sim_id = sim.id
        
        response = client.delete(
            f"/api/v1/simulations/{sim_id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify deleted
        deleted_sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
        assert deleted_sim is None
    
    def test_delete_simulation_as_member_forbidden(
        self, client: TestClient, test_user: User, auth_headers: dict,
        manufacturing_site: Site, member_membership: OrgMembership, db: Session
    ):
        """Test member cannot delete simulations."""
        sim = Simulation(
            site_id=manufacturing_site.id,
            scenario_name="Test",
            parameters={},
            status="completed",
            results={}
        )
        db.add(sim)
        db.commit()
        
        response = client.delete(
            f"/api/v1/simulations/{sim.id}",
            headers=auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_delete_running_simulation_forbidden(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test cannot delete running simulation."""
        sim = Simulation(
            site_id=manufacturing_site.id,
            scenario_name="Running",
            parameters={},
            status="running",
            results={}
        )
        db.add(sim)
        db.commit()
        
        response = client.delete(
            f"/api/v1/simulations/{sim.id}",
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 400, "running")


@pytest.mark.integration
@pytest.mark.multitenant
@pytest.mark.simulations
class TestSimulationsIsolation:
    """Test multi-tenant simulation isolation."""
    
    def test_simulations_isolated_by_organization(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership, db: Session
    ):
        """Test simulations are isolated by organization."""
        # Create sites in both orgs
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
        db.flush()
        
        # Create simulations for both sites
        sim1 = Simulation(
            site_id=site1.id,
            scenario_name="Accessible",
            parameters={},
            status="completed",
            results={}
        )
        sim2 = Simulation(
            site_id=site2.id,
            scenario_name="Inaccessible",
            parameters={},
            status="completed",
            results={}
        )
        db.add_all([sim1, sim2])
        db.commit()
        
        # List simulations - should only see sim1
        response = client.get("/api/v1/simulations", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        sim_ids = [s["id"] for s in data]
        assert str(sim1.id) in sim_ids
        assert str(sim2.id) not in sim_ids


@pytest.mark.integration
@pytest.mark.simulations
class TestSimulationsValidation:
    """Test simulation input validation."""
    
    def test_run_simulation_missing_parameters(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test running simulation without required parameters fails."""
        response = client.post(
            "/api/v1/simulations/run",
            json={"scenario_name": "Incomplete"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_run_simulation_invalid_duration(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test running simulation with invalid duration."""
        response = client.post(
            "/api/v1/simulations/run",
            json={
                "site_id": str(manufacturing_site.id),
                "scenario_name": "Invalid Duration",
                "parameters": {},
                "duration_days": -10  # Negative duration
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_run_simulation_invalid_site_id(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test running simulation with invalid site ID format."""
        response = client.post(
            "/api/v1/simulations/run",
            json={
                "site_id": "invalid-uuid",
                "scenario_name": "Test",
                "parameters": {},
                "duration_days": 30
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
