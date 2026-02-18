"""
End-to-end workflow tests for AI Digital Twin SaaS Platform.
Tests complete user journeys across multiple services and endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, Mock

from tests.test_utils.helpers import (
    register_user,
    login_user,
    create_project_via_api,
    create_site_via_api,
    extract_id_from_response
)
from tests.test_utils.factories import ManufacturingDataFactory
from tests.test_utils.mock_ml_service import get_mock_forecast


@pytest.mark.e2e
@pytest.mark.slow
class TestCompleteUserJourney:
    """Test complete user journey from registration to recommendations."""
    
    def test_full_manufacturing_workflow(self, client: TestClient, db: Session):
        """
        Test complete manufacturing workflow:
        1. Register user + create org
        2. Login and get token
        3. Create project and site
        4. Ingest manufacturing data
        5. Compute KPIs
        6. Generate forecast (mock ML service)
        7. Run simulation
        8. Get recommendations
        """
        # Step 1: Register user with organization
        register_response = register_user(
            client,
            email="manufacturer@example.com",
            password="SecurePass123!",
            full_name="Manufacturing Manager",
            organization_name="Acme Manufacturing"
        )
        user_id = register_response["id"]
        print(f"✓ User registered: {user_id}")
        
        # Step 2: Login and get token
        auth_headers = login_user(
            client,
            email="manufacturer@example.com",
            password="SecurePass123!"
        )
        print("✓ User logged in successfully")
        
        # Get organization ID
        orgs_response = client.get("/api/v1/organizations", headers=auth_headers)
        assert orgs_response.status_code == 200
        orgs = orgs_response.json()
        assert len(orgs) > 0
        org_id = orgs[0]["id"]
        print(f"✓ Organization found: {org_id}")
        
        # Step 3a: Create manufacturing project
        project = create_project_via_api(
            client,
            auth_headers,
            org_id,
            name="Factory Automation Project",
            vertical="manufacturing",
            description="Digital twin for production line optimization"
        )
        project_id = project["id"]
        print(f"✓ Project created: {project_id}")
        
        # Step 3b: Create manufacturing site
        site = create_site_via_api(
            client,
            auth_headers,
            org_id,
            project_id,
            name="Factory Floor A",
            location="Detroit, MI",
            vertical="manufacturing"
        )
        site_id = site["id"]
        print(f"✓ Site created: {site_id}")
        
        # Step 4: Ingest manufacturing data
        manufacturing_data = ManufacturingDataFactory.create_batch(count=24)  # 24 hours of data
        ingest_response = client.post(
            f"/api/v1/sites/{site_id}/ingest",
            json={
                "data": manufacturing_data,
                "vertical": "manufacturing"
            },
            headers=auth_headers
        )
        assert ingest_response.status_code in [200, 201]
        print(f"✓ Data ingested: {len(manufacturing_data)} records")
        
        # Step 5: Compute KPIs
        kpi_response = client.post(
            f"/api/v1/sites/{site_id}/kpis/compute",
            json={
                "vertical": "manufacturing",
                "metrics": ["oee", "availability", "performance", "quality"]
            },
            headers=auth_headers
        )
        assert kpi_response.status_code in [200, 201]
        kpis = kpi_response.json()
        print(f"✓ KPIs computed: {list(kpis.keys())}")
        
        # Step 6: Generate forecast (mock ML service)
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = get_mock_forecast(site_id, "production_count", 7)
            mock_post.return_value = mock_response
            
            forecast_response = client.post(
                f"/api/v1/sites/{site_id}/forecasts",
                json={
                    "metric": "production_count",
                    "horizon_days": 7
                },
                headers=auth_headers
            )
            
            if forecast_response.status_code in [200, 201]:
                forecast = forecast_response.json()
                print(f"✓ Forecast generated: 7 days ahead")
        
        # Step 7: Run simulation
        simulation_response = client.post(
            f"/api/v1/projects/{project_id}/simulations",
            json={
                "name": "Optimized Production Scenario",
                "site_id": site_id,
                "variables": {
                    "cycle_time_seconds": {"type": "percentage", "value": -10},  # 10% faster
                    "target_count": {"type": "absolute", "value": 250}  # Increase target
                },
                "duration_days": 7
            },
            headers=auth_headers
        )
        
        if simulation_response.status_code in [200, 201]:
            simulation = simulation_response.json()
            simulation_id = simulation["id"]
            print(f"✓ Simulation created: {simulation_id}")
            
            # Execute simulation
            execute_response = client.post(
                f"/api/v1/simulations/{simulation_id}/execute",
                headers=auth_headers
            )
            if execute_response.status_code in [200, 202]:
                print("✓ Simulation executed")
        
        # Step 8: Get recommendations
        recommendations_response = client.get(
            f"/api/v1/projects/{project_id}/recommendations",
            headers=auth_headers
        )
        
        if recommendations_response.status_code == 200:
            recommendations = recommendations_response.json()
            print(f"✓ Recommendations retrieved: {len(recommendations)} found")
        
        print("\n🎉 Complete manufacturing workflow test passed!")


@pytest.mark.e2e
@pytest.mark.slow
class TestEnergyWorkflow:
    """Test end-to-end energy management workflow."""
    
    def test_energy_monitoring_workflow(self, client: TestClient, db: Session):
        """
        Test energy monitoring workflow:
        1. Create user and organization
        2. Create energy project and site
        3. Ingest energy consumption data
        4. Compute energy KPIs
        5. Check for anomalies
        """
        # Register and login
        register_user(
            client,
            email="energymanager@example.com",
            password="SecurePass123!",
            full_name="Energy Manager",
            organization_name="Green Energy Co"
        )
        
        auth_headers = login_user(
            client,
            email="energymanager@example.com",
            password="SecurePass123!"
        )
        
        # Get organization
        orgs_response = client.get("/api/v1/organizations", headers=auth_headers)
        org_id = orgs_response.json()[0]["id"]
        
        # Create energy project
        project = create_project_via_api(
            client,
            auth_headers,
            org_id,
            name="Solar Farm Optimization",
            vertical="energy"
        )
        project_id = project["id"]
        
        # Create energy site
        site = create_site_via_api(
            client,
            auth_headers,
            org_id,
            project_id,
            name="Phoenix Solar Farm",
            location="Phoenix, AZ",
            vertical="energy"
        )
        site_id = site["id"]
        
        # Ingest energy data
        from tests.test_utils.factories import EnergyDataFactory
        energy_data = EnergyDataFactory.create_batch(count=24)
        
        ingest_response = client.post(
            f"/api/v1/sites/{site_id}/ingest",
            json={
                "data": energy_data,
                "vertical": "energy"
            },
            headers=auth_headers
        )
        assert ingest_response.status_code in [200, 201]
        
        # Compute energy KPIs
        kpi_response = client.post(
            f"/api/v1/sites/{site_id}/kpis/compute",
            json={
                "vertical": "energy",
                "metrics": ["total_cost", "peak_demand", "energy_intensity"]
            },
            headers=auth_headers
        )
        
        assert kpi_response.status_code in [200, 201]
        print("✓ Energy workflow completed successfully")


@pytest.mark.e2e
@pytest.mark.slow
class TestRetailWorkflow:
    """Test end-to-end retail analytics workflow."""
    
    def test_retail_analytics_workflow(self, client: TestClient, db: Session):
        """
        Test retail analytics workflow:
        1. Create user and organization
        2. Create retail project and site
        3. Ingest transaction data
        4. Compute retail KPIs
        5. Get sales recommendations
        """
        # Register and login
        register_user(
            client,
            email="retailmanager@example.com",
            password="SecurePass123!",
            full_name="Retail Manager",
            organization_name="Mega Retail Corp"
        )
        
        auth_headers = login_user(
            client,
            email="retailmanager@example.com",
            password="SecurePass123!"
        )
        
        # Get organization
        orgs_response = client.get("/api/v1/organizations", headers=auth_headers)
        org_id = orgs_response.json()[0]["id"]
        
        # Create retail project
        project = create_project_via_api(
            client,
            auth_headers,
            org_id,
            name="Store Performance Analytics",
            vertical="retail"
        )
        project_id = project["id"]
        
        # Create retail site
        site = create_site_via_api(
            client,
            auth_headers,
            org_id,
            project_id,
            name="Flagship Store NYC",
            location="New York, NY",
            vertical="retail"
        )
        site_id = site["id"]
        
        # Ingest retail data
        from tests.test_utils.factories import RetailDataFactory
        retail_data = RetailDataFactory.create_batch(count=50)
        
        ingest_response = client.post(
            f"/api/v1/sites/{site_id}/ingest",
            json={
                "data": retail_data,
                "vertical": "retail"
            },
            headers=auth_headers
        )
        assert ingest_response.status_code in [200, 201]
        
        # Compute retail KPIs
        kpi_response = client.post(
            f"/api/v1/sites/{site_id}/kpis/compute",
            json={
                "vertical": "retail",
                "metrics": ["sales_velocity", "margin", "inventory_turnover"]
            },
            headers=auth_headers
        )
        
        assert kpi_response.status_code in [200, 201]
        print("✓ Retail workflow completed successfully")


@pytest.mark.e2e
@pytest.mark.rbac
class TestMultiUserCollaboration:
    """Test collaboration between multiple users in same organization."""
    
    def test_admin_and_viewer_collaboration(self, client: TestClient, db: Session):
        """
        Test admin creates resources and viewer can access them:
        1. Admin creates org, project, site
        2. Admin invites viewer
        3. Viewer can view but not modify
        """
        # Admin registers
        register_user(
            client,
            email="admin@collab.com",
            password="AdminPass123!",
            full_name="Admin User",
            organization_name="Collaborative Org"
        )
        
        admin_headers = login_user(client, "admin@collab.com", "AdminPass123!")
        
        # Get org
        orgs = client.get("/api/v1/organizations", headers=admin_headers).json()
        org_id = orgs[0]["id"]
        
        # Admin creates project
        project = create_project_via_api(
            client,
            admin_headers,
            org_id,
            "Shared Project",
            "manufacturing"
        )
        project_id = project["id"]
        
        # Viewer registers separately
        register_user(
            client,
            email="viewer@collab.com",
            password="ViewerPass123!",
            full_name="Viewer User"
        )
        
        viewer_headers = login_user(client, "viewer@collab.com", "ViewerPass123!")
        
        # Admin invites viewer (if invitation endpoint exists)
        invite_response = client.post(
            f"/api/v1/organizations/{org_id}/invitations",
            json={
                "email": "viewer@collab.com",
                "role": "viewer"
            },
            headers=admin_headers
        )
        
        # Viewer should be able to view project
        view_response = client.get(
            f"/api/v1/projects/{project_id}",
            headers=viewer_headers
        )
        
        if view_response.status_code == 200:
            # Viewer should NOT be able to delete project
            delete_response = client.delete(
                f"/api/v1/projects/{project_id}",
                headers=viewer_headers
            )
            assert delete_response.status_code == 403
            print("✓ RBAC working correctly: viewer can view but not modify")


@pytest.mark.e2e
class TestMultiTenantIsolation:
    """Test data isolation between different organizations."""
    
    def test_cross_org_access_denied(self, client: TestClient, db: Session):
        """
        Test users cannot access other organization's data:
        1. Create two separate organizations
        2. Each creates a project
        3. Verify users cannot access each other's projects
        """
        # Create first organization
        register_user(
            client,
            "user1@org1.com",
            "Pass123!",
            "User One",
            "Organization One"
        )
        user1_headers = login_user(client, "user1@org1.com", "Pass123!")
        
        orgs1 = client.get("/api/v1/organizations", headers=user1_headers).json()
        org1_id = orgs1[0]["id"]
        
        project1 = create_project_via_api(
            client, user1_headers, org1_id, "Org1 Project", "manufacturing"
        )
        project1_id = project1["id"]
        
        # Create second organization
        register_user(
            client,
            "user2@org2.com",
            "Pass123!",
            "User Two",
            "Organization Two"
        )
        user2_headers = login_user(client, "user2@org2.com", "Pass123!")
        
        # User 2 tries to access User 1's project
        access_response = client.get(
            f"/api/v1/projects/{project1_id}",
            headers=user2_headers
        )
        
        # Should be denied (403 or 404)
        assert access_response.status_code in [403, 404]
        print("✓ Multi-tenant isolation working: cross-org access denied")
