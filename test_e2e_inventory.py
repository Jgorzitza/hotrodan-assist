"""
End-to-end tests for inventory management system.

Tests complete workflows from external systems through API to database.
"""
import pytest
import requests
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

API_BASE = "http://localhost:8004"

class InventoryE2ETestSuite:
    def __init__(self):
        self.test_data = {}
        self.session = requests.Session()
    
    def setup_test_environment(self):
        """Set up test environment with sample data."""
        print("Setting up test environment...")
        
        # Test SKUs and locations
        self.test_data = {
            "skus": ["E2E-WIDGET-001", "E2E-WIDGET-002", "E2E-WIDGET-003"],
            "locations": ["E2E-WAREHOUSE-A", "E2E-WAREHOUSE-B", "E2E-STORE-001"],
            "customers": ["E2E-CUST-001", "E2E-CUST-002"],
            "suppliers": ["E2E-SUPPLIER-001", "E2E-SUPPLIER-002"]
        }
        
        print(f"✓ Test data initialized: {len(self.test_data['skus'])} SKUs, {len(self.test_data['locations'])} locations")
    
    def test_health_check(self) -> bool:
        """Test API health endpoint."""
        print("Testing API health...")
        try:
            response = self.session.get(f"{API_BASE}/health", timeout=10)
            if response.status_code == 200:
                health_data = response.json()
                print(f"✓ API healthy: {health_data.get('status', 'unknown')}")
                return True
            else:
                print(f"✗ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ Health check error: {e}")
            return False
    
    def test_multi_location_stock_sync(self) -> bool:
        """Test complete multi-location stock synchronization workflow."""
        print("Testing multi-location stock sync...")
        
        try:
            # Simulate stock updates from multiple sources
            updates = [
                {
                    "sku": self.test_data["skus"][0],
                    "location_id": self.test_data["locations"][0],
                    "available": 100,
                    "updated_at": datetime.now().isoformat() + "Z",
                    "source": "shopify",
                    "metadata": {"order_id": "E2E-ORDER-001"}
                },
                {
                    "sku": self.test_data["skus"][0],
                    "location_id": self.test_data["locations"][1],
                    "available": 50,
                    "updated_at": datetime.now().isoformat() + "Z",
                    "source": "pos",
                    "metadata": {"register_id": "E2E-REG-001"}
                },
                {
                    "sku": self.test_data["skus"][0],
                    "location_id": self.test_data["locations"][0],
                    "available": 95,
                    "updated_at": (datetime.now() + timedelta(minutes=1)).isoformat() + "Z",
                    "source": "wms",
                    "metadata": {"adjustment_id": "E2E-ADJ-001"}
                }
            ]
            
            response = self.session.post(f"{API_BASE}/api/v1/stock/sync", json=updates, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Stock sync completed: {len(result.get('decisions', []))} decisions")
                print(f"✓ Merged state: {len(result.get('merged_state', {}))} SKUs")
                return True
            else:
                print(f"✗ Stock sync failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Stock sync error: {e}")
            return False
    
    def test_safety_stock_calculation_workflow(self) -> bool:
        """Test safety stock calculation with real demand data."""
        print("Testing safety stock calculation workflow...")
        
        try:
            # Generate realistic demand history
            demand_history = [10, 12, 11, 9, 13, 10, 12, 14, 11, 13, 15, 12, 10, 11, 13]
            
            request = {
                "sku": self.test_data["skus"][0],
                "location_id": self.test_data["locations"][0],
                "demand_history": demand_history,
                "lead_time_periods": 3.0,
                "service_level": 0.95,
                "method": "z_service_level"
            }
            
            response = self.session.post(f"{API_BASE}/api/v1/safety-stock/calculate", json=request, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                safety_stock = result.get('safety_stock', 0)
                print(f"✓ Safety stock calculated: {safety_stock} units")
                print(f"✓ Method: {result.get('method', 'unknown')}")
                return safety_stock > 0
            else:
                print(f"✗ Safety stock calculation failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Safety stock calculation error: {e}")
            return False
    
    def test_demand_forecasting_workflow(self) -> bool:
        """Test demand forecasting with seasonal data."""
        print("Testing demand forecasting workflow...")
        
        try:
            # Generate seasonal demand data
            seasonal_data = [100, 120, 150, 180, 200, 220, 180, 150, 120, 100, 80, 90] * 2
            
            request = {
                "sku": self.test_data["skus"][0],
                "history": seasonal_data,
                "method": "holt_winters",
                "season_length": 12,
                "forecast_horizon": 6,
                "alpha": 0.3
            }
            
            response = self.session.post(f"{API_BASE}/api/v1/forecast/demand", json=request, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                forecast = result.get('forecast', {})
                values = forecast.get('values', [])
                print(f"✓ Demand forecast generated: {len(values)} periods")
                print(f"✓ Method: {forecast.get('method', 'unknown')}")
                return len(values) > 0
            else:
                print(f"✗ Demand forecasting failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Demand forecasting error: {e}")
            return False
    
    def test_purchase_order_workflow(self) -> bool:
        """Test complete purchase order recommendation workflow."""
        print("Testing purchase order workflow...")
        
        try:
            # Set up realistic purchase order scenario
            sku_data = [
                {
                    "sku": self.test_data["skus"][0],
                    "location_id": self.test_data["locations"][0],
                    "demand_rate": 12.5,
                    "lead_time": 5
                },
                {
                    "sku": self.test_data["skus"][1],
                    "location_id": self.test_data["locations"][1],
                    "demand_rate": 8.0,
                    "lead_time": 3
                }
            ]
            
            current_stock = {
                f"{self.test_data['skus'][0]}_{self.test_data['locations'][0]}": 15,
                f"{self.test_data['skus'][1]}_{self.test_data['locations'][1]}": 8
            }
            
            safety_stock = {
                f"{self.test_data['skus'][0]}_{self.test_data['locations'][0]}": 20,
                f"{self.test_data['skus'][1]}_{self.test_data['locations'][1]}": 12
            }
            
            costs = {
                f"{self.test_data['skus'][0]}_{self.test_data['locations'][0]}": {
                    "unit_cost": 25.0,
                    "ordering_cost": 100.0,
                    "holding_cost_rate": 0.2
                },
                f"{self.test_data['skus'][1]}_{self.test_data['locations'][1]}": {
                    "unit_cost": 15.0,
                    "ordering_cost": 80.0,
                    "holding_cost_rate": 0.15
                }
            }
            
            request = {
                "sku_data": sku_data,
                "current_stock": current_stock,
                "safety_stock": safety_stock,
                "costs": costs
            }
            
            response = self.session.post(f"{API_BASE}/api/v1/purchase-orders/recommendations", json=request, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                recommendations = result.get('recommendations', [])
                print(f"✓ Purchase recommendations generated: {len(recommendations)} items")
                
                for rec in recommendations:
                    print(f"  - {rec.get('sku', 'unknown')}: {rec.get('recommended_quantity', 0)} units ({rec.get('urgency', 'unknown')})")
                
                return len(recommendations) > 0
            else:
                print(f"✗ Purchase order workflow failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Purchase order workflow error: {e}")
            return False
    
    def test_backorder_evaluation_workflow(self) -> bool:
        """Test backorder evaluation and ETA workflow."""
        print("Testing backorder evaluation workflow...")
        
        try:
            # Test different priority levels
            priorities = ["low", "normal", "high", "urgent"]
            results = []
            
            for priority in priorities:
                request = {
                    "sku": self.test_data["skus"][0],
                    "location_id": self.test_data["locations"][0],
                    "requested_quantity": 25,
                    "customer_id": self.test_data["customers"][0],
                    "priority": priority
                }
                
                response = self.session.post(f"{API_BASE}/api/v1/backorder/evaluate", json=request, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    approved = result.get('approved', False)
                    eta = result.get('eta', {})
                    print(f"  - Priority {priority}: {'✓ Approved' if approved else '✗ Rejected'}")
                    if eta:
                        print(f"    ETA: {eta.get('estimated_arrival', 'unknown')}")
                    results.append(True)
                else:
                    print(f"  - Priority {priority}: ✗ Failed ({response.status_code})")
                    results.append(False)
            
            success_rate = sum(results) / len(results) * 100
            print(f"✓ Backorder evaluation: {success_rate:.1f}% success rate")
            return success_rate >= 75
            
        except Exception as e:
            print(f"✗ Backorder evaluation error: {e}")
            return False
    
    def test_cycle_count_workflow(self) -> bool:
        """Test complete cycle count workflow."""
        print("Testing cycle count workflow...")
        
        try:
            # Create cycle count plan
            plan_request = {
                "plan_id": f"E2E-CYCLE-{int(time.time())}",
                "location_id": self.test_data["locations"][0],
                "skus": self.test_data["skus"],
                "scheduled_date": datetime.now().isoformat(),
                "assigned_to": "E2E-USER-001",
                "priority": "normal"
            }
            
            response = self.session.post(f"{API_BASE}/api/v1/cycle-counts/plan", json=plan_request, timeout=30)
            
            if response.status_code == 200:
                plan_result = response.json()
                plan_id = plan_result.get('plan_id')
                print(f"✓ Cycle count plan created: {plan_id}")
                return True
            else:
                print(f"✗ Cycle count plan creation failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Cycle count workflow error: {e}")
            return False
    
    def test_bom_kitting_workflow(self) -> bool:
        """Test BOM creation and kitting workflow."""
        print("Testing BOM kitting workflow...")
        
        try:
            # Create BOM for assembly
            bom_request = {
                "assembly_sku": "E2E-KIT-PRO",
                "version": "1.0",
                "items": [
                    {"component_sku": self.test_data["skus"][0], "quantity_required": 2},
                    {"component_sku": self.test_data["skus"][1], "quantity_required": 1},
                    {"component_sku": "E2E-SCREW-M4", "quantity_required": 8}
                ],
                "is_active": True
            }
            
            response = self.session.post(f"{API_BASE}/api/v1/bom/create", json=bom_request, timeout=30)
            
            if response.status_code == 200:
                bom_result = response.json()
                bom_key = bom_result.get('bom_key')
                print(f"✓ BOM created: {bom_key}")
                return True
            else:
                print(f"✗ BOM creation failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ BOM kitting workflow error: {e}")
            return False
    
    def test_audit_trail_workflow(self) -> bool:
        """Test audit trail and compliance workflow."""
        print("Testing audit trail workflow...")
        
        try:
            # Create multiple audit entries
            audit_types = ["receipt", "shipment", "adjustment", "cycle_count"]
            results = []
            
            for i, audit_type in enumerate(audit_types):
                request = {
                    "sku": self.test_data["skus"][0],
                    "location_id": self.test_data["locations"][0],
                    "adjustment_type": audit_type,
                    "quantity_change": 10 + i * 5,
                    "previous_quantity": 100 + i * 10,
                    "reason": f"E2E test {audit_type}",
                    "user_id": "E2E-USER-001",
                    "reference_number": f"E2E-{audit_type.upper()}-{i+1:03d}"
                }
                
                response = self.session.post(f"{API_BASE}/api/v1/audit/adjustment", json=request, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    entry_id = result.get('entry_id')
                    print(f"  - {audit_type}: ✓ {entry_id}")
                    results.append(True)
                else:
                    print(f"  - {audit_type}: ✗ Failed ({response.status_code})")
                    results.append(False)
            
            success_rate = sum(results) / len(results) * 100
            print(f"✓ Audit trail: {success_rate:.1f}% success rate")
            return success_rate >= 75
            
        except Exception as e:
            print(f"✗ Audit trail workflow error: {e}")
            return False
    
    def test_performance_benchmarks(self) -> bool:
        """Test system performance under load."""
        print("Testing performance benchmarks...")
        
        try:
            # Load test with concurrent requests
            start_time = time.time()
            success_count = 0
            total_requests = 100
            concurrent_requests = 10
            
            import threading
            import queue
            
            def worker(q, results):
                while True:
                    try:
                        request_id = q.get(timeout=1)
                        response = self.session.get(f"{API_BASE}/health", timeout=5)
                        if response.status_code == 200:
                            results.append(True)
                        else:
                            results.append(False)
                        q.task_done()
                    except:
                        break
            
            # Create request queue
            request_queue = queue.Queue()
            for i in range(total_requests):
                request_queue.put(i)
            
            # Start worker threads
            results = []
            threads = []
            for i in range(concurrent_requests):
                t = threading.Thread(target=worker, args=(request_queue, results))
                t.start()
                threads.append(t)
            
            # Wait for completion
            request_queue.join()
            for t in threads:
                t.join()
            
            end_time = time.time()
            duration = end_time - start_time
            success_count = sum(results)
            success_rate = (success_count / total_requests) * 100
            rps = total_requests / duration
            
            print(f"✓ Performance benchmark:")
            print(f"  - Total requests: {total_requests}")
            print(f"  - Successful: {success_count}")
            print(f"  - Success rate: {success_rate:.1f}%")
            print(f"  - Duration: {duration:.2f}s")
            print(f"  - RPS: {rps:.1f}")
            
            return success_rate >= 95 and rps >= 10
            
        except Exception as e:
            print(f"✗ Performance benchmark error: {e}")
            return False
    
    def run_complete_e2e_suite(self) -> Dict[str, bool]:
        """Run complete end-to-end test suite."""
        print("🚀 Starting Complete E2E Test Suite")
        print("=" * 60)
        
        # Setup
        self.setup_test_environment()
        
        # Run all tests
        test_results = {
            "health_check": self.test_health_check(),
            "multi_location_sync": self.test_multi_location_stock_sync(),
            "safety_stock_calculation": self.test_safety_stock_calculation_workflow(),
            "demand_forecasting": self.test_demand_forecasting_workflow(),
            "purchase_order_workflow": self.test_purchase_order_workflow(),
            "backorder_evaluation": self.test_backorder_evaluation_workflow(),
            "cycle_count_workflow": self.test_cycle_count_workflow(),
            "bom_kitting_workflow": self.test_bom_kitting_workflow(),
            "audit_trail_workflow": self.test_audit_trail_workflow(),
            "performance_benchmarks": self.test_performance_benchmarks()
        }
        
        # Summary
        passed = sum(test_results.values())
        total = len(test_results)
        success_rate = (passed / total) * 100
        
        print("\n" + "=" * 60)
        print("📊 E2E TEST RESULTS SUMMARY")
        print("=" * 60)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:.<40} {status}")
        
        print(f"\nOverall Success Rate: {success_rate:.1f}% ({passed}/{total})")
        
        if success_rate >= 90:
            print("🎉 E2E TEST SUITE PASSED!")
        else:
            print("⚠️  E2E TEST SUITE NEEDS ATTENTION")
        
        return test_results

def main():
    """Run the complete E2E test suite."""
    suite = InventoryE2ETestSuite()
    results = suite.run_complete_e2e_suite()
    
    # Exit with appropriate code
    success_rate = sum(results.values()) / len(results) * 100
    exit(0 if success_rate >= 90 else 1)

if __name__ == "__main__":
    main()
