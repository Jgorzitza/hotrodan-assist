"""Integration tests for RAG API endpoints."""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

import pytest
from fastapi.testclient import TestClient
from app.rag_api.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for /health endpoint."""
    
    def test_health_check(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestConfigEndpoint:
    """Tests for /config endpoint."""
    
    def test_config_returns_correct_structure(self, client):
        """Test config endpoint returns all expected fields."""
        response = client.get("/config")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "generation_mode" in data
        assert "openai_available" in data
        assert "collection_name" in data
        assert "index_id" in data
        assert "available_providers" in data
    
    def test_config_providers_list(self, client):
        """Test config returns list of available providers."""
        response = client.get("/config")
        data = response.json()
        
        providers = data["available_providers"]
        assert isinstance(providers, dict)
        
        # Should always have these providers
        assert "retrieval-only" in providers
        assert "local" in providers


class TestQueryEndpoint:
    """Tests for /query endpoint."""
    
    def test_query_with_valid_question(self, client):
        """Test query endpoint with a valid question."""
        response = client.post(
            "/query",
            json={
                "question": "What is PTFE hose?",
                "top_k": 3
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "answer" in data
        assert "sources" in data
        assert "mode" in data
        assert "provider_info" in data
    
    def test_query_with_retrieval_only_provider(self, client):
        """Test query endpoint with retrieval-only provider."""
        response = client.post(
            "/query",
            json={
                "question": "What is EFI fuel pump sizing?",
                "top_k": 3,
                "provider": "retrieval-only"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "retrieval-only"
        assert data["provider_info"]["mode"] == "retrieval"
    
    def test_query_with_invalid_top_k(self, client):
        """Test query endpoint rejects invalid top_k values."""
        response = client.post(
            "/query",
            json={
                "question": "What is PTFE?",
                "top_k": 100  # Exceeds max_top_k of 50
            }
        )
        assert response.status_code == 422  # Validation error
    
    def test_query_with_empty_question(self, client):
        """Test query endpoint rejects empty questions."""
        response = client.post(
            "/query",
            json={
                "question": "",
                "top_k": 5
            }
        )
        assert response.status_code == 422  # Validation error


class TestMetricsEndpoint:
    """Tests for /metrics endpoint."""
    
    def test_metrics_endpoint_exists(self, client):
        """Test metrics endpoint is accessible."""
        response = client.get("/metrics")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "query_count" in data
        assert "avg_response_time_ms" in data


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
