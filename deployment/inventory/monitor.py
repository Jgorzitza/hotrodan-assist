"""
Production monitoring for inventory API.
"""
import time
import requests
import logging
import json
from datetime import datetime
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InventoryMonitor:
    def __init__(self, api_url: str = "http://localhost:8004"):
        self.api_url = api_url
        self.metrics = {
            "health_checks": 0,
            "failed_checks": 0,
            "response_times": [],
            "last_check": None
        }
    
    def check_health(self) -> bool:
        """Check API health endpoint."""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_url}/health", timeout=5)
            response_time = time.time() - start_time
            
            self.metrics["health_checks"] += 1
            self.metrics["response_times"].append(response_time)
            self.metrics["last_check"] = datetime.now().isoformat()
            
            if response.status_code == 200:
                logger.info(f"Health check passed - {response_time:.3f}s")
                return True
            else:
                logger.error(f"Health check failed - Status: {response.status_code}")
                self.metrics["failed_checks"] += 1
                return False
                
        except Exception as e:
            logger.error(f"Health check error: {e}")
            self.metrics["failed_checks"] += 1
            return False
    
    def test_critical_endpoints(self) -> Dict[str, bool]:
        """Test critical API endpoints."""
        results = {}
        
        # Test stock sync
        try:
            updates = [{"sku": "MONITOR-TEST", "location_id": "LOC-1", "available": 1, "updated_at": datetime.now().isoformat() + "Z", "source": "monitor"}]
            response = requests.post(f"{self.api_url}/api/v1/stock/sync", json=updates, timeout=10)
            results["stock_sync"] = response.status_code == 200
        except:
            results["stock_sync"] = False
        
        # Test safety stock
        try:
            request = {"sku": "MONITOR-TEST", "location_id": "LOC-1", "demand_history": [1, 2, 3], "lead_time_periods": 1, "method": "z_service_level"}
            response = requests.post(f"{self.api_url}/api/v1/safety-stock/calculate", json=request, timeout=10)
            results["safety_stock"] = response.status_code == 200
        except:
            results["safety_stock"] = False
        
        return results
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get monitoring metrics."""
        avg_response_time = sum(self.metrics["response_times"]) / len(self.metrics["response_times"]) if self.metrics["response_times"] else 0
        success_rate = ((self.metrics["health_checks"] - self.metrics["failed_checks"]) / self.metrics["health_checks"] * 100) if self.metrics["health_checks"] > 0 else 0
        
        return {
            "total_checks": self.metrics["health_checks"],
            "failed_checks": self.metrics["failed_checks"],
            "success_rate": round(success_rate, 2),
            "avg_response_time": round(avg_response_time, 3),
            "last_check": self.metrics["last_check"]
        }
    
    def run_continuous_monitoring(self, interval: int = 30):
        """Run continuous monitoring."""
        logger.info(f"Starting continuous monitoring - checking every {interval}s")
        
        while True:
            health_ok = self.check_health()
            
            if health_ok:
                endpoint_results = self.test_critical_endpoints()
                failed_endpoints = [k for k, v in endpoint_results.items() if not v]
                
                if failed_endpoints:
                    logger.warning(f"Failed endpoints: {failed_endpoints}")
                else:
                    logger.info("All critical endpoints working")
            
            metrics = self.get_metrics()
            logger.info(f"Metrics: {json.dumps(metrics, indent=2)}")
            
            time.sleep(interval)

if __name__ == "__main__":
    monitor = InventoryMonitor()
    monitor.run_continuous_monitoring()
