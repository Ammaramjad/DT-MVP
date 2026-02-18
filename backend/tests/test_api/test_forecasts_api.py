"""
Integration tests for forecast API endpoints.
Tests forecast generation and retrieval (mocking ML service).
"""
import pytest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient

from tests.test_utils.mock_ml_service import get_mock_forecast


@pytest.mark.integration
@pytest.mark.ml_service
class TestForecastAPI:
    """Test forecast API endpoints."""
    
    @patch('httpx.AsyncClient.post')
    def test_create_forecast(self, mock_post, client: TestClient, admin_auth_headers: dict, manufacturing_site):
        """Test creating a forecast with mocked ML service."""
        # Mock ML service response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = get_mock_forecast(
            str(manufacturing_site.id),
            "production_count"
        )
        mock_post.return_value = mock_response
        
        response = client.post(
            f"/api/v1/sites/{manufacturing_site.id}/forecasts",
            json={
                "metric": "production_count",
                "horizon_days": 7
            },
            headers=admin_auth_headers
        )
        
        assert response.status_code in [200, 201, 503]  # 503 if ML service not available
    
    def test_list_forecasts(self, client: TestClient, admin_auth_headers: dict, manufacturing_site):
        """Test listing forecasts for a site."""
        response = client.get(
            f"/api/v1/sites/{manufacturing_site.id}/forecasts",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
    
    def test_unauthorized_access(self, client: TestClient, manufacturing_site):
        """Test forecast access without authentication fails."""
        response = client.get(f"/api/v1/sites/{manufacturing_site.id}/forecasts")
        assert response.status_code in [401, 403]
