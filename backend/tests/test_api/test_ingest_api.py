"""
Integration tests for data ingestion API endpoints.
Tests data ingestion for all verticals.
"""
import pytest
from fastapi.testclient import TestClient
from tests.test_utils.factories import (
    ManufacturingDataFactory,
    EnergyDataFactory,
    RetailDataFactory
)


@pytest.mark.integration
class TestManufacturingIngest:
    """Test manufacturing data ingestion endpoints."""
    
    def test_ingest_manufacturing_data(self, client: TestClient, admin_auth_headers: dict, manufacturing_site):
        """Test ingesting manufacturing data."""
        data = ManufacturingDataFactory.create_batch(count=5)
        
        response = client.post(
            f"/api/v1/sites/{manufacturing_site.id}/ingest",
            json={"data": data, "vertical": "manufacturing"},
            headers=admin_auth_headers
        )
        
        assert response.status_code in [200, 201]


@pytest.mark.integration
class TestEnergyIngest:
    """Test energy data ingestion endpoints."""
    
    def test_ingest_energy_data(self, client: TestClient, admin_auth_headers: dict, energy_site):
        """Test ingesting energy data."""
        data = EnergyDataFactory.create_batch(count=5)
        
        response = client.post(
            f"/api/v1/sites/{energy_site.id}/ingest",
            json={"data": data, "vertical": "energy"},
            headers=admin_auth_headers
        )
        
        assert response.status_code in [200, 201]


@pytest.mark.integration
class TestRetailIngest:
    """Test retail data ingestion endpoints."""
    
    def test_ingest_retail_data(self, client: TestClient, admin_auth_headers: dict, retail_site):
        """Test ingesting retail data."""
        data = RetailDataFactory.create_batch(count=5)
        
        response = client.post(
            f"/api/v1/sites/{retail_site.id}/ingest",
            json={"data": data, "vertical": "retail"},
            headers=admin_auth_headers
        )
        
        assert response.status_code in [200, 201]
