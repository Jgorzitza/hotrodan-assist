"""
Production deployment tests for inventory API.
"""
import pytest
import requests
import time
import subprocess
import os
from datetime import datetime

API_BASE_URL = "http://localhost:8000"

def test_api_health():
    """Test API health endpoint."""
    response = requests.get(f"{API_BASE_URL}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_stock_sync_endpoint():
    """Test stock sync API endpoint."""
    updates = [
        {
            "sku": "TEST-SKU-1",
            "location_id": "LOC-1",
            "available": 100,
            "updated_at": datetime.now().isoformat() + "Z",
            "source": "shopify"
        }
    ]
    
    response = requests.post(f"{API_BASE_URL}/api/v1/stock/sync", json=updates)
    assert response.status_code == 200
    data = response.json()
    assert "merged_state" in data
    assert "decisions" in data

def test_safety_stock_calculation():
    """Test safety stock calculation endpoint."""
    request = {
        "sku": "TEST-SKU-1",
        "location_id": "LOC-1",
        "demand_history": [10, 12, 11, 9, 13, 10, 12],
        "lead_time_periods": 2.0,
        "service_level": 0.95,
        "method": "z_service_level"
    }
    
    response = requests.post(f"{API_BASE_URL}/api/v1/safety-stock/calculate", json=request)
    assert response.status_code == 200
    data = response.json()
    assert data["sku"] == "TEST-SKU-1"
    assert "safety_stock" in data

def test_demand_forecast():
    """Test demand forecasting endpoint."""
    request = {
        "sku": "TEST-SKU-1",
        "history": [100, 120, 110, 90, 130, 100, 115],
        "method": "simple_moving_average",
        "periods": 3,
        "forecast_horizon": 6
    }
    
    response = requests.post(f"{API_BASE_URL}/api/v1/forecast/demand", json=request)
    assert response.status_code == 200
    data = response.json()
    assert "forecast" in data
    assert len(data["forecast"]["values"]) == 6

def test_purchase_recommendations():
    """Test purchase order recommendations endpoint."""
    request = {
        "sku_data": [
            {"sku": "SKU1", "location_id": "LOC1", "demand_rate": 10, "lead_time": 5}
        ],
        "current_stock": {"SKU1_LOC1": 5},
        "safety_stock": {"SKU1_LOC1": 10},
        "costs": {"SKU1_LOC1": {"unit_cost": 10, "ordering_cost": 50, "holding_cost_rate": 0.2}}
    }
    
    response = requests.post(f"{API_BASE_URL}/api/v1/purchase-orders/recommendations", json=request)
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data

def test_backorder_evaluation():
    """Test backorder evaluation endpoint."""
    request = {
        "sku": "TEST-SKU-1",
        "location_id": "LOC-1",
        "requested_quantity": 5,
        "customer_id": "CUST-1",
        "priority": "normal"
    }
    
    response = requests.post(f"{API_BASE_URL}/api/v1/backorder/evaluate", json=request)
    assert response.status_code == 200
    data = response.json()
    assert "approved" in data

def test_cycle_count_plan():
    """Test cycle count plan creation."""
    request = {
        "plan_id": "PLAN-1",
        "location_id": "LOC-1",
        "skus": ["SKU1", "SKU2"],
        "scheduled_date": datetime.now().isoformat(),
        "assigned_to": "USER-1",
        "priority": "normal"
    }
    
    response = requests.post(f"{API_BASE_URL}/api/v1/cycle-counts/plan", json=request)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "created"

def test_bom_creation():
    """Test BOM creation endpoint."""
    request = {
        "assembly_sku": "ASSEMBLY-1",
        "version": "1.0",
        "items": [
            {"component_sku": "COMP-1", "quantity_required": 2},
            {"component_sku": "COMP-2", "quantity_required": 1}
        ],
        "is_active": True
    }
    
    response = requests.post(f"{API_BASE_URL}/api/v1/bom/create", json=request)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "created"

def test_audit_adjustment():
    """Test audit adjustment creation."""
    request = {
        "sku": "TEST-SKU-1",
        "location_id": "LOC-1",
        "adjustment_type": "receipt",
        "quantity_change": 50,
        "previous_quantity": 100,
        "reason": "Test adjustment",
        "user_id": "USER-1"
    }
    
    response = requests.post(f"{API_BASE_URL}/api/v1/audit/adjustment", json=request)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "created"

def test_api_load():
    """Test API under load."""
    start_time = time.time()
    success_count = 0
    total_requests = 50
    
    for i in range(total_requests):
        try:
            response = requests.get(f"{API_BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                success_count += 1
        except:
            pass
    
    end_time = time.time()
    duration = end_time - start_time
    success_rate = (success_count / total_requests) * 100
    
    assert success_rate >= 95, f"Success rate {success_rate}% below 95%"
    assert duration < 30, f"Load test took {duration}s, should be under 30s"
    
    print(f"Load test: {success_count}/{total_requests} successful ({success_rate:.1f}%) in {duration:.2f}s")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
