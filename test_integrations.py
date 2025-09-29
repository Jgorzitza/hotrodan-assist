"""
Integration tests for inventory API with external systems.
"""
import requests
import json
import time
from datetime import datetime

API_BASE = "http://localhost:8004"

def test_full_inventory_workflow():
    """Test complete inventory management workflow."""
    print("Testing complete inventory workflow...")
    
    # 1. Stock sync with multiple locations
    print("1. Testing multi-location stock sync...")
    updates = [
        {"sku": "WIDGET-001", "location_id": "WAREHOUSE-A", "available": 100, "updated_at": datetime.now().isoformat() + "Z", "source": "shopify"},
        {"sku": "WIDGET-001", "location_id": "WAREHOUSE-B", "available": 50, "updated_at": datetime.now().isoformat() + "Z", "source": "pos"},
        {"sku": "WIDGET-001", "location_id": "WAREHOUSE-A", "available": 95, "updated_at": datetime.now().isoformat() + "Z", "source": "wms"}
    ]
    
    response = requests.post(f"{API_BASE}/api/v1/stock/sync", json=updates)
    assert response.status_code == 200
    sync_result = response.json()
    print(f"   ✓ Stock sync completed: {len(sync_result['decisions'])} decisions")
    
    # 2. Safety stock calculation
    print("2. Testing safety stock calculation...")
    safety_request = {
        "sku": "WIDGET-001",
        "location_id": "WAREHOUSE-A",
        "demand_history": [10, 12, 11, 9, 13, 10, 12, 14, 11, 13],
        "lead_time_periods": 3.0,
        "service_level": 0.95,
        "method": "z_service_level"
    }
    
    response = requests.post(f"{API_BASE}/api/v1/safety-stock/calculate", json=safety_request)
    assert response.status_code == 200
    safety_result = response.json()
    print(f"   ✓ Safety stock calculated: {safety_result['safety_stock']} units")
    
    # 3. Demand forecasting
    print("3. Testing demand forecasting...")
    forecast_request = {
        "sku": "WIDGET-001",
        "history": [100, 120, 110, 90, 130, 100, 115, 125, 105, 140],
        "method": "holt_winters",
        "season_length": 4,
        "forecast_horizon": 8
    }
    
    response = requests.post(f"{API_BASE}/api/v1/forecast/demand", json=forecast_request)
    assert response.status_code == 200
    forecast_result = response.json()
    print(f"   ✓ Demand forecast generated: {len(forecast_result['forecast']['values'])} periods")
    
    # 4. Purchase order recommendations
    print("4. Testing purchase order recommendations...")
    po_request = {
        "sku_data": [
            {"sku": "WIDGET-001", "location_id": "WAREHOUSE-A", "demand_rate": 12, "lead_time": 5},
            {"sku": "WIDGET-001", "location_id": "WAREHOUSE-B", "demand_rate": 8, "lead_time": 3}
        ],
        "current_stock": {"WIDGET-001_WAREHOUSE-A": 95, "WIDGET-001_WAREHOUSE-B": 50},
        "safety_stock": {"WIDGET-001_WAREHOUSE-A": safety_result['safety_stock'], "WIDGET-001_WAREHOUSE-B": 15},
        "costs": {
            "WIDGET-001_WAREHOUSE-A": {"unit_cost": 25.0, "ordering_cost": 100.0, "holding_cost_rate": 0.2},
            "WIDGET-001_WAREHOUSE-B": {"unit_cost": 25.0, "ordering_cost": 80.0, "holding_cost_rate": 0.2}
        }
    }
    
    response = requests.post(f"{API_BASE}/api/v1/purchase-orders/recommendations", json=po_request)
    assert response.status_code == 200
    po_result = response.json()
    print(f"   ✓ Purchase recommendations generated: {len(po_result['recommendations'])} items")
    
    # 5. Backorder evaluation
    print("5. Testing backorder evaluation...")
    backorder_request = {
        "sku": "WIDGET-001",
        "location_id": "WAREHOUSE-A",
        "requested_quantity": 20,
        "customer_id": "CUST-12345",
        "priority": "high"
    }
    
    response = requests.post(f"{API_BASE}/api/v1/backorder/evaluate", json=backorder_request)
    assert response.status_code == 200
    backorder_result = response.json()
    print(f"   ✓ Backorder evaluated: {backorder_result['approved']}")
    
    # 6. Cycle count planning
    print("6. Testing cycle count planning...")
    cycle_request = {
        "plan_id": "CYCLE-2025-001",
        "location_id": "WAREHOUSE-A",
        "skus": ["WIDGET-001", "WIDGET-002", "WIDGET-003"],
        "scheduled_date": datetime.now().isoformat(),
        "assigned_to": "USER-INVENTORY-01",
        "priority": "normal"
    }
    
    response = requests.post(f"{API_BASE}/api/v1/cycle-counts/plan", json=cycle_request)
    assert response.status_code == 200
    cycle_result = response.json()
    print(f"   ✓ Cycle count plan created: {cycle_result['plan_id']}")
    
    # 7. BOM creation and kitting
    print("7. Testing BOM creation and kitting...")
    bom_request = {
        "assembly_sku": "KIT-WIDGET-PRO",
        "version": "1.0",
        "items": [
            {"component_sku": "WIDGET-001", "quantity_required": 2},
            {"component_sku": "WIDGET-002", "quantity_required": 1},
            {"component_sku": "SCREW-M4", "quantity_required": 8}
        ],
        "is_active": True
    }
    
    response = requests.post(f"{API_BASE}/api/v1/bom/create", json=bom_request)
    assert response.status_code == 200
    bom_result = response.json()
    print(f"   ✓ BOM created: {bom_result['bom_key']}")
    
    # 8. Audit trail logging
    print("8. Testing audit trail logging...")
    audit_request = {
        "sku": "WIDGET-001",
        "location_id": "WAREHOUSE-A",
        "adjustment_type": "receipt",
        "quantity_change": 50,
        "previous_quantity": 95,
        "reason": "Integration test receipt",
        "user_id": "USER-INTEGRATION-01",
        "reference_number": "PO-INTEGRATION-001"
    }
    
    response = requests.post(f"{API_BASE}/api/v1/audit/adjustment", json=audit_request)
    assert response.status_code == 200
    audit_result = response.json()
    print(f"   ✓ Audit entry created: {audit_result['entry_id']}")
    
    print("\n✅ Complete inventory workflow test PASSED!")
    return True

def test_performance_under_load():
    """Test API performance under load."""
    print("\nTesting performance under load...")
    
    start_time = time.time()
    success_count = 0
    total_requests = 100
    
    for i in range(total_requests):
        try:
            response = requests.get(f"{API_BASE}/health", timeout=5)
            if response.status_code == 200:
                success_count += 1
        except:
            pass
    
    end_time = time.time()
    duration = end_time - start_time
    success_rate = (success_count / total_requests) * 100
    
    print(f"   Load test results:")
    print(f"   - Requests: {total_requests}")
    print(f"   - Successful: {success_count}")
    print(f"   - Success rate: {success_rate:.1f}%")
    print(f"   - Duration: {duration:.2f}s")
    print(f"   - RPS: {total_requests/duration:.1f}")
    
    assert success_rate >= 95, f"Success rate {success_rate}% below 95%"
    print("   ✅ Performance test PASSED!")

if __name__ == "__main__":
    print("🚀 Starting Inventory Integration Tests")
    print("=" * 50)
    
    try:
        # Test server health first
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code != 200:
            print(f"❌ Server not healthy: {response.status_code}")
            exit(1)
        print("✅ Server is healthy")
        
        # Run integration tests
        test_full_inventory_workflow()
        test_performance_under_load()
        
        print("\n🎉 ALL INTEGRATION TESTS PASSED!")
        
    except Exception as e:
        print(f"\n❌ Integration test failed: {e}")
        exit(1)
