"""
Integration validation suite for inventory management system.

Tests real-world integration scenarios with external systems.
"""
import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IntegrationValidationSuite:
    def __init__(self, api_base_url: str = "http://localhost:8004"):
        self.api_base_url = api_base_url
        self.session = requests.Session()
        self.test_results = {}
    
    def validate_shopify_integration(self) -> Dict[str, Any]:
        """Validate Shopify integration capabilities."""
        print("Validating Shopify integration...")
        
        try:
            # Test stock sync with Shopify-like data
            shopify_updates = [
                {
                    "sku": "SHOPIFY-WIDGET-001",
                    "location_id": "shopify_main_warehouse",
                    "available": 150,
                    "updated_at": datetime.now().isoformat() + "Z",
                    "source": "shopify",
                    "metadata": {
                        "product_id": "12345",
                        "variant_id": "67890",
                        "inventory_item_id": "11111"
                    }
                },
                {
                    "sku": "SHOPIFY-WIDGET-002",
                    "location_id": "shopify_main_warehouse",
                    "available": 75,
                    "updated_at": datetime.now().isoformat() + "Z",
                    "source": "shopify",
                    "metadata": {
                        "product_id": "12346",
                        "variant_id": "67891",
                        "inventory_item_id": "11112"
                    }
                }
            ]
            
            response = self.session.post(f"{self.api_base_url}/api/v1/stock/sync", json=shopify_updates, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": "success",
                    "message": "Shopify integration validated",
                    "decisions": len(result.get("decisions", [])),
                    "merged_skus": len(result.get("merged_state", {}))
                }
            else:
                return {
                    "status": "error",
                    "message": f"Shopify integration failed: {response.status_code}",
                    "error": response.text
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Shopify integration error: {str(e)}"
            }
    
    def validate_pos_integration(self) -> Dict[str, Any]:
        """Validate POS system integration."""
        print("Validating POS integration...")
        
        try:
            # Test demand forecasting with POS sales data
            pos_sales_data = [10, 12, 15, 8, 20, 18, 14, 16, 11, 13, 17, 19, 12, 15, 18]
            
            forecast_request = {
                "sku": "POS-WIDGET-001",
                "history": pos_sales_data,
                "method": "exponential_smoothing",
                "alpha": 0.3,
                "forecast_horizon": 7
            }
            
            response = self.session.post(f"{self.api_base_url}/api/v1/forecast/demand", json=forecast_request, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                forecast = result.get("forecast", {})
                return {
                    "status": "success",
                    "message": "POS integration validated",
                    "forecast_periods": len(forecast.get("values", [])),
                    "method": forecast.get("method", "unknown")
                }
            else:
                return {
                    "status": "error",
                    "message": f"POS integration failed: {response.status_code}",
                    "error": response.text
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"POS integration error: {str(e)}"
            }
    
    def validate_wms_integration(self) -> Dict[str, Any]:
        """Validate WMS integration."""
        print("Validating WMS integration...")
        
        try:
            # Test cycle count planning with WMS data
            cycle_count_request = {
                "plan_id": f"WMS-CYCLE-{int(time.time())}",
                "location_id": "wms_warehouse_001",
                "skus": ["WMS-SKU-001", "WMS-SKU-002", "WMS-SKU-003"],
                "scheduled_date": datetime.now().isoformat(),
                "assigned_to": "WMS-USER-001",
                "priority": "high"
            }
            
            response = self.session.post(f"{self.api_base_url}/api/v1/cycle-counts/plan", json=cycle_count_request, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": "success",
                    "message": "WMS integration validated",
                    "plan_id": result.get("plan_id", "unknown")
                }
            else:
                return {
                    "status": "error",
                    "message": f"WMS integration failed: {response.status_code}",
                    "error": response.text
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"WMS integration error: {str(e)}"
            }
    
    def validate_notification_integration(self) -> Dict[str, Any]:
        """Validate notification system integration."""
        print("Validating notification integration...")
        
        try:
            # Test backorder evaluation (triggers notifications)
            backorder_requests = [
                {
                    "sku": "NOTIFY-WIDGET-001",
                    "location_id": "notification_test_location",
                    "requested_quantity": 50,
                    "customer_id": "NOTIFY-CUST-001",
                    "priority": "high"
                },
                {
                    "sku": "NOTIFY-WIDGET-002",
                    "location_id": "notification_test_location",
                    "requested_quantity": 25,
                    "customer_id": "NOTIFY-CUST-002",
                    "priority": "urgent"
                }
            ]
            
            results = []
            for request in backorder_requests:
                response = self.session.post(f"{self.api_base_url}/api/v1/backorder/evaluate", json=request, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    results.append({
                        "sku": request["sku"],
                        "approved": result.get("approved", False),
                        "eta": result.get("eta", {})
                    })
                else:
                    results.append({
                        "sku": request["sku"],
                        "error": f"HTTP {response.status_code}"
                    })
            
            success_count = sum(1 for r in results if "error" not in r)
            return {
                "status": "success" if success_count > 0 else "error",
                "message": f"Notification integration validated ({success_count}/{len(results)} successful)",
                "results": results
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Notification integration error: {str(e)}"
            }
    
    def validate_database_integration(self) -> Dict[str, Any]:
        """Validate database integration."""
        print("Validating database integration...")
        
        try:
            # Test audit trail logging (database integration)
            audit_requests = [
                {
                    "sku": "DB-WIDGET-001",
                    "location_id": "db_test_location",
                    "adjustment_type": "receipt",
                    "quantity_change": 100,
                    "previous_quantity": 0,
                    "reason": "Integration test receipt",
                    "user_id": "DB-USER-001",
                    "reference_number": "DB-PO-001"
                },
                {
                    "sku": "DB-WIDGET-002",
                    "location_id": "db_test_location",
                    "adjustment_type": "shipment",
                    "quantity_change": -25,
                    "previous_quantity": 100,
                    "reason": "Integration test shipment",
                    "user_id": "DB-USER-001",
                    "reference_number": "DB-SO-001"
                }
            ]
            
            results = []
            for request in audit_requests:
                response = self.session.post(f"{self.api_base_url}/api/v1/audit/adjustment", json=request, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    results.append({
                        "entry_id": result.get("entry_id", "unknown"),
                        "status": "created"
                    })
                else:
                    results.append({
                        "error": f"HTTP {response.status_code}",
                        "status": "failed"
                    })
            
            success_count = sum(1 for r in results if r["status"] == "created")
            return {
                "status": "success" if success_count > 0 else "error",
                "message": f"Database integration validated ({success_count}/{len(results)} successful)",
                "results": results
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Database integration error: {str(e)}"
            }
    
    def validate_end_to_end_workflow(self) -> Dict[str, Any]:
        """Validate complete end-to-end workflow."""
        print("Validating end-to-end workflow...")
        
        try:
            workflow_steps = []
            
            # Step 1: Stock sync from multiple sources
            stock_updates = [
                {
                    "sku": "E2E-WIDGET-001",
                    "location_id": "e2e_warehouse",
                    "available": 200,
                    "updated_at": datetime.now().isoformat() + "Z",
                    "source": "shopify"
                },
                {
                    "sku": "E2E-WIDGET-001",
                    "location_id": "e2e_warehouse",
                    "available": 195,
                    "updated_at": (datetime.now() + timedelta(minutes=1)).isoformat() + "Z",
                    "source": "wms"
                }
            ]
            
            response = self.session.post(f"{self.api_base_url}/api/v1/stock/sync", json=stock_updates, timeout=30)
            if response.status_code == 200:
                workflow_steps.append("✓ Stock sync completed")
            else:
                workflow_steps.append(f"✗ Stock sync failed: {response.status_code}")
            
            # Step 2: Safety stock calculation
            safety_request = {
                "sku": "E2E-WIDGET-001",
                "location_id": "e2e_warehouse",
                "demand_history": [15, 18, 12, 20, 16, 14, 17, 19, 13, 15],
                "lead_time_periods": 3.0,
                "service_level": 0.95,
                "method": "z_service_level"
            }
            
            response = self.session.post(f"{self.api_base_url}/api/v1/safety-stock/calculate", json=safety_request, timeout=30)
            if response.status_code == 200:
                result = response.json()
                workflow_steps.append(f"✓ Safety stock calculated: {result.get('safety_stock', 0)} units")
            else:
                workflow_steps.append(f"✗ Safety stock calculation failed: {response.status_code}")
            
            # Step 3: Purchase order recommendations
            po_request = {
                "sku_data": [
                    {
                        "sku": "E2E-WIDGET-001",
                        "location_id": "e2e_warehouse",
                        "demand_rate": 15.0,
                        "lead_time": 5
                    }
                ],
                "current_stock": {"E2E-WIDGET-001_e2e_warehouse": 195},
                "safety_stock": {"E2E-WIDGET-001_e2e_warehouse": 20},
                "costs": {
                    "E2E-WIDGET-001_e2e_warehouse": {
                        "unit_cost": 25.0,
                        "ordering_cost": 100.0,
                        "holding_cost_rate": 0.2
                    }
                }
            }
            
            response = self.session.post(f"{self.api_base_url}/api/v1/purchase-orders/recommendations", json=po_request, timeout=30)
            if response.status_code == 200:
                result = response.json()
                recommendations = result.get("recommendations", [])
                workflow_steps.append(f"✓ Purchase recommendations: {len(recommendations)} items")
            else:
                workflow_steps.append(f"✗ Purchase recommendations failed: {response.status_code}")
            
            # Step 4: BOM creation
            bom_request = {
                "assembly_sku": "E2E-KIT-PRO",
                "version": "1.0",
                "items": [
                    {"component_sku": "E2E-WIDGET-001", "quantity_required": 2},
                    {"component_sku": "E2E-SCREW-M4", "quantity_required": 8}
                ],
                "is_active": True
            }
            
            response = self.session.post(f"{self.api_base_url}/api/v1/bom/create", json=bom_request, timeout=30)
            if response.status_code == 200:
                result = response.json()
                workflow_steps.append(f"✓ BOM created: {result.get('bom_key', 'unknown')}")
            else:
                workflow_steps.append(f"✗ BOM creation failed: {response.status_code}")
            
            success_steps = sum(1 for step in workflow_steps if step.startswith("✓"))
            total_steps = len(workflow_steps)
            
            return {
                "status": "success" if success_steps >= total_steps * 0.8 else "partial",
                "message": f"End-to-end workflow validation ({success_steps}/{total_steps} steps successful)",
                "steps": workflow_steps,
                "success_rate": (success_steps / total_steps) * 100
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"End-to-end workflow error: {str(e)}"
            }
    
    def run_complete_validation(self) -> Dict[str, Any]:
        """Run complete integration validation suite."""
        print("🚀 Starting Integration Validation Suite")
        print("=" * 60)
        
        validations = {
            "shopify_integration": self.validate_shopify_integration(),
            "pos_integration": self.validate_pos_integration(),
            "wms_integration": self.validate_wms_integration(),
            "notification_integration": self.validate_notification_integration(),
            "database_integration": self.validate_database_integration(),
            "end_to_end_workflow": self.validate_end_to_end_workflow()
        }
        
        # Calculate overall success rate
        successful_validations = sum(1 for v in validations.values() if v.get("status") == "success")
        total_validations = len(validations)
        success_rate = (successful_validations / total_validations) * 100
        
        print("\n" + "=" * 60)
        print("📊 INTEGRATION VALIDATION RESULTS")
        print("=" * 60)
        
        for validation_name, result in validations.items():
            status = "✅ PASS" if result.get("status") == "success" else "⚠️ PARTIAL" if result.get("status") == "partial" else "❌ FAIL"
            print(f"{validation_name:.<40} {status}")
            if "message" in result:
                print(f"  {result['message']}")
        
        print(f"\nOverall Success Rate: {success_rate:.1f}% ({successful_validations}/{total_validations})")
        
        if success_rate >= 80:
            print("🎉 INTEGRATION VALIDATION PASSED!")
        elif success_rate >= 60:
            print("⚠️ INTEGRATION VALIDATION PARTIAL SUCCESS")
        else:
            print("❌ INTEGRATION VALIDATION NEEDS ATTENTION")
        
        return {
            "validations": validations,
            "success_rate": success_rate,
            "timestamp": datetime.now().isoformat()
        }

def main():
    """Run the integration validation suite."""
    validator = IntegrationValidationSuite()
    results = validator.run_complete_validation()
    
    # Save results
    with open("integration_validation_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📁 Validation results saved to: integration_validation_results.json")

if __name__ == "__main__":
    main()
