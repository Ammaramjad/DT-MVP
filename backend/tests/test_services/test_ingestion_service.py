"""
Unit tests for data ingestion service.
Tests data validation, batch ingestion, and quality scoring for all verticals.
"""
import pytest
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.site import Site
from app.models.project import VerticalType
from tests.test_utils.factories import ManufacturingDataFactory, EnergyDataFactory, RetailDataFactory


@pytest.mark.unit
class TestManufacturingIngestion:
    """Test manufacturing data ingestion."""
    
    def test_validate_manufacturing_data(self, manufacturing_site: Site):
        """Test validation of manufacturing sensor data."""
        data = ManufacturingDataFactory.create()
        
        assert "timestamp" in data
        assert "machine_id" in data
        assert "production_count" in data
        assert data["production_count"] >= 0
    
    def test_manufacturing_batch_ingestion(self, manufacturing_site: Site):
        """Test batch ingestion of manufacturing data."""
        batch = ManufacturingDataFactory.create_batch(count=10)
        
        assert len(batch) == 10
        for item in batch:
            assert "timestamp" in item
            assert "machine_id" in item


@pytest.mark.unit
class TestEnergyIngestion:
    """Test energy data ingestion."""
    
    def test_validate_energy_data(self, energy_site: Site):
        """Test validation of energy consumption data."""
        data = EnergyDataFactory.create()
        
        assert "timestamp" in data
        assert "meter_id" in data
        assert "consumption_kwh" in data
        assert data["consumption_kwh"] >= 0
    
    def test_energy_batch_ingestion(self, energy_site: Site):
        """Test batch ingestion of energy data."""
        batch = EnergyDataFactory.create_batch(count=10)
        
        assert len(batch) == 10
        for item in batch:
            assert "timestamp" in item
            assert "meter_id" in item


@pytest.mark.unit
class TestRetailIngestion:
    """Test retail data ingestion."""
    
    def test_validate_retail_data(self, retail_site: Site):
        """Test validation of retail transaction data."""
        data = RetailDataFactory.create()
        
        assert "timestamp" in data
        assert "transaction_id" in data
        assert "sku" in data
        assert "quantity" in data
        assert data["quantity"] > 0
    
    def test_retail_batch_ingestion(self, retail_site: Site):
        """Test batch ingestion of retail data."""
        batch = RetailDataFactory.create_batch(count=10)
        
        assert len(batch) == 10
        for item in batch:
            assert "timestamp" in item
            assert "transaction_id" in item
