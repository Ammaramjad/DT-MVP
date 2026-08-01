"""
Integration tests for KPI computation API endpoints.
Tests KPI calculations for manufacturing, energy, and retail verticals.
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project, VerticalType
from app.models.site import Site
from app.models.org_membership import OrgMembership, OrgRole
from app.models.manufacturing import ManufacturingData
from app.models.energy import EnergyData
from app.models.retail import RetailData
from tests.test_utils.helpers import assert_error_response, assert_field_in_response
from tests.test_utils.factories import (
    ManufacturingDataFactory,
    EnergyDataFactory,
    RetailDataFactory,
)


@pytest.mark.integration
@pytest.mark.kpis
class TestManufacturingKPIs:
    """Test manufacturing KPI computation."""
    
    def test_get_manufacturing_kpis_success(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, manufacturing_site: Site,
        admin_membership: OrgMembership, db: Session
    ):
        """Test retrieving manufacturing KPIs."""
        # Add sample manufacturing data
        base_time = datetime.utcnow()
        for i in range(10):
            data = ManufacturingData(
                site_id=manufacturing_site.id,
                timestamp=base_time + timedelta(hours=i),
                machine_id=f"MACHINE-{i:03d}",
                production_count=100 + i * 10,
                target_count=150,
                downtime_minutes=10 + i,
                defect_count=2,
                cycle_time_seconds=120.0,
                temperature_celsius=85.0,
                pressure_psi=150.0,
                vibration_hz=60.0
            )
            db.add(data)
        db.commit()
        
        response = client.get(
            f"/api/v1/kpis/manufacturing/{manufacturing_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert_field_in_response(response, "oee", "availability", "performance", "quality")
        assert 0 <= data["oee"] <= 100
        assert 0 <= data["availability"] <= 100
        assert 0 <= data["performance"] <= 100
        assert 0 <= data["quality"] <= 100
    
    def test_get_manufacturing_kpis_with_date_range(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test manufacturing KPIs with custom date range."""
        base_time = datetime.utcnow() - timedelta(days=7)
        
        for i in range(5):
            data = ManufacturingData(
                site_id=manufacturing_site.id,
                timestamp=base_time + timedelta(days=i),
                machine_id="MACHINE-001",
                production_count=100,
                target_count=150,
                downtime_minutes=15,
                defect_count=1,
                cycle_time_seconds=100.0,
                temperature_celsius=80.0,
                pressure_psi=140.0,
                vibration_hz=55.0
            )
            db.add(data)
        db.commit()
        
        start = (base_time - timedelta(days=1)).isoformat()
        end = (base_time + timedelta(days=10)).isoformat()
        
        response = client.get(
            f"/api/v1/kpis/manufacturing/{manufacturing_site.id}",
            params={"start_date": start, "end_date": end},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
    
    def test_get_manufacturing_kpis_includes_mtbf_mttr(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test manufacturing KPIs include MTBF and MTTR."""
        base_time = datetime.utcnow()
        data = ManufacturingData(
            site_id=manufacturing_site.id,
            timestamp=base_time,
            machine_id="MACHINE-001",
            production_count=100,
            target_count=150,
            downtime_minutes=30,
            defect_count=2,
            cycle_time_seconds=120.0,
            temperature_celsius=85.0,
            pressure_psi=150.0,
            vibration_hz=60.0
        )
        db.add(data)
        db.commit()
        
        response = client.get(
            f"/api/v1/kpis/manufacturing/{manufacturing_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "mtbf" in data or "mean_time_between_failures" in data
        assert "mttr" in data or "mean_time_to_repair" in data
    
    def test_get_manufacturing_kpis_wrong_vertical(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        energy_site: Site, admin_membership: OrgMembership
    ):
        """Test manufacturing KPIs fail for non-manufacturing site."""
        response = client.get(
            f"/api/v1/kpis/manufacturing/{energy_site.id}",
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 400, "vertical")
    
    def test_get_manufacturing_kpis_not_member(
        self, client: TestClient, test_user: User, auth_headers: dict,
        second_org: Organization, db: Session
    ):
        """Test cannot get KPIs for site user doesn't have access to."""
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
        
        response = client.get(
            f"/api/v1/kpis/manufacturing/{site.id}",
            headers=auth_headers
        )
        
        assert_error_response(response, 403)
    
    def test_get_manufacturing_kpis_no_data(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test manufacturing KPIs with no data returns empty or zero values."""
        response = client.get(
            f"/api/v1/kpis/manufacturing/{manufacturing_site.id}",
            headers=admin_auth_headers
        )
        
        # Should return 200 with null/zero values or 404
        assert response.status_code in [200, 404]


@pytest.mark.integration
@pytest.mark.kpis
class TestEnergyKPIs:
    """Test energy KPI computation."""
    
    def test_get_energy_kpis_success(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, energy_site: Site,
        admin_membership: OrgMembership, db: Session
    ):
        """Test retrieving energy KPIs."""
        # Add sample energy data
        base_time = datetime.utcnow()
        for i in range(10):
            data = EnergyData(
                site_id=energy_site.id,
                timestamp=base_time + timedelta(hours=i),
                meter_id=f"METER-{i:03d}",
                consumption_kwh=1000.0 + i * 50,
                generation_kwh=800.0 + i * 30,
                grid_import_kwh=200.0,
                grid_export_kwh=0.0,
                cost_usd=120.0,
                power_factor=0.95,
                voltage=240.0,
                frequency=60.0
            )
            db.add(data)
        db.commit()
        
        response = client.get(
            f"/api/v1/kpis/energy/{energy_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert_field_in_response(response, "total_consumption", "total_generation")
        assert data["total_consumption"] >= 0
        assert data["total_generation"] >= 0
    
    def test_get_energy_kpis_includes_efficiency(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        energy_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test energy KPIs include efficiency metrics."""
        base_time = datetime.utcnow()
        data = EnergyData(
            site_id=energy_site.id,
            timestamp=base_time,
            meter_id="METER-001",
            consumption_kwh=1200.0,
            generation_kwh=900.0,
            grid_import_kwh=300.0,
            grid_export_kwh=0.0,
            cost_usd=144.0,
            power_factor=0.92,
            voltage=235.0,
            frequency=60.0
        )
        db.add(data)
        db.commit()
        
        response = client.get(
            f"/api/v1/kpis/energy/{energy_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "efficiency" in data or "self_sufficiency" in data
        assert "carbon_offset" in data or "emissions_saved" in data
    
    def test_get_energy_kpis_cost_savings(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        energy_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test energy KPIs include cost information."""
        base_time = datetime.utcnow()
        data = EnergyData(
            site_id=energy_site.id,
            timestamp=base_time,
            meter_id="METER-001",
            consumption_kwh=1000.0,
            generation_kwh=800.0,
            grid_import_kwh=200.0,
            grid_export_kwh=0.0,
            cost_usd=120.0,
            power_factor=0.95,
            voltage=240.0,
            frequency=60.0
        )
        db.add(data)
        db.commit()
        
        response = client.get(
            f"/api/v1/kpis/energy/{energy_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_cost" in data or "cost_savings" in data
    
    def test_get_energy_kpis_wrong_vertical(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test energy KPIs fail for non-energy site."""
        response = client.get(
            f"/api/v1/kpis/energy/{manufacturing_site.id}",
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 400, "vertical")


@pytest.mark.integration
@pytest.mark.kpis
class TestRetailKPIs:
    """Test retail KPI computation."""
    
    def test_get_retail_kpis_success(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, retail_site: Site,
        admin_membership: OrgMembership, db: Session
    ):
        """Test retrieving retail KPIs."""
        # Add sample retail data
        base_time = datetime.utcnow()
        for i in range(20):
            data = RetailData(
                site_id=retail_site.id,
                timestamp=base_time + timedelta(hours=i),
                transaction_id=f"TXN-{i:05d}",
                sku=f"SKU-{i % 5:05d}",
                quantity=2,
                unit_price=50.0,
                total_price=100.0,
                cost=60.0,
                category="Electronics",
                store_id=str(retail_site.id)
            )
            db.add(data)
        db.commit()
        
        response = client.get(
            f"/api/v1/kpis/retail/{retail_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert_field_in_response(response, "total_revenue", "total_transactions")
        assert data["total_revenue"] >= 0
        assert data["total_transactions"] >= 0
    
    def test_get_retail_kpis_includes_margin(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        retail_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test retail KPIs include profit margin metrics."""
        base_time = datetime.utcnow()
        data = RetailData(
            site_id=retail_site.id,
            timestamp=base_time,
            transaction_id="TXN-001",
            sku="SKU-12345",
            quantity=1,
            unit_price=100.0,
            total_price=100.0,
            cost=70.0,
            category="Electronics",
            store_id=str(retail_site.id)
        )
        db.add(data)
        db.commit()
        
        response = client.get(
            f"/api/v1/kpis/retail/{retail_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "profit_margin" in data or "gross_margin" in data
        assert "total_profit" in data or "gross_profit" in data
    
    def test_get_retail_kpis_avg_transaction_value(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        retail_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test retail KPIs include average transaction value."""
        base_time = datetime.utcnow()
        for i in range(5):
            data = RetailData(
                site_id=retail_site.id,
                timestamp=base_time + timedelta(minutes=i * 10),
                transaction_id=f"TXN-{i:05d}",
                sku=f"SKU-{i:05d}",
                quantity=1,
                unit_price=50.0 + i * 10,
                total_price=50.0 + i * 10,
                cost=30.0,
                category="Test",
                store_id=str(retail_site.id)
            )
            db.add(data)
        db.commit()
        
        response = client.get(
            f"/api/v1/kpis/retail/{retail_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "avg_transaction_value" in data or "average_order_value" in data
    
    def test_get_retail_kpis_category_breakdown(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        retail_site: Site, admin_membership: OrgMembership, db: Session
    ):
        """Test retail KPIs include category breakdown."""
        base_time = datetime.utcnow()
        categories = ["Electronics", "Clothing", "Food"]
        
        for i, category in enumerate(categories):
            data = RetailData(
                site_id=retail_site.id,
                timestamp=base_time + timedelta(minutes=i * 10),
                transaction_id=f"TXN-{i:05d}",
                sku=f"SKU-{i:05d}",
                quantity=1,
                unit_price=100.0,
                total_price=100.0,
                cost=60.0,
                category=category,
                store_id=str(retail_site.id)
            )
            db.add(data)
        db.commit()
        
        response = client.get(
            f"/api/v1/kpis/retail/{retail_site.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "category_breakdown" in data or "by_category" in data
    
    def test_get_retail_kpis_wrong_vertical(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        energy_site: Site, admin_membership: OrgMembership
    ):
        """Test retail KPIs fail for non-retail site."""
        response = client.get(
            f"/api/v1/kpis/retail/{energy_site.id}",
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 400, "vertical")


@pytest.mark.integration
@pytest.mark.rbac
@pytest.mark.kpis
class TestKPIsAuthorization:
    """Test KPI endpoint authorization."""
    
    def test_kpis_accessible_by_viewer(
        self, client: TestClient, viewer_user: User, viewer_auth_headers: dict,
        manufacturing_site: Site, viewer_membership: OrgMembership
    ):
        """Test viewer can access KPIs."""
        response = client.get(
            f"/api/v1/kpis/manufacturing/{manufacturing_site.id}",
            headers=viewer_auth_headers
        )
        
        assert response.status_code in [200, 404]  # 404 if no data
    
    def test_kpis_unauthorized(self, client: TestClient, manufacturing_site: Site):
        """Test KPI access requires authentication."""
        response = client.get(
            f"/api/v1/kpis/manufacturing/{manufacturing_site.id}"
        )
        
        assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.multitenant
@pytest.mark.kpis
class TestKPIsIsolation:
    """Test multi-tenant KPI isolation."""
    
    def test_kpis_isolated_by_organization(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        test_org: Organization, second_org: Organization,
        admin_membership: OrgMembership, db: Session
    ):
        """Test KPIs are isolated by organization."""
        # Create site in different org
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
        
        # Try to access KPIs for other org's site
        response = client.get(
            f"/api/v1/kpis/manufacturing/{site.id}",
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 403)


@pytest.mark.integration
@pytest.mark.kpis
class TestKPIsValidation:
    """Test KPI endpoint input validation."""
    
    def test_kpis_invalid_site_id(
        self, client: TestClient, admin_auth_headers: dict
    ):
        """Test KPIs with invalid site ID."""
        response = client.get(
            "/api/v1/kpis/manufacturing/invalid-uuid",
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_kpis_invalid_date_format(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test KPIs with invalid date format."""
        response = client.get(
            f"/api/v1/kpis/manufacturing/{manufacturing_site.id}",
            params={"start_date": "invalid-date"},
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 422)
    
    def test_kpis_end_before_start(
        self, client: TestClient, admin_user: User, admin_auth_headers: dict,
        manufacturing_site: Site, admin_membership: OrgMembership
    ):
        """Test KPIs with end date before start date."""
        end = datetime.utcnow() - timedelta(days=10)
        start = datetime.utcnow()
        
        response = client.get(
            f"/api/v1/kpis/manufacturing/{manufacturing_site.id}",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat()
            },
            headers=admin_auth_headers
        )
        
        assert_error_response(response, 400)
