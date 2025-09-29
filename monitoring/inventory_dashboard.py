"""
Production monitoring dashboard for inventory management system.

Real-time monitoring of system health, performance, and business metrics.
"""
import time
import requests
import json
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InventoryMonitoringDashboard:
    def __init__(self, api_base_url: str = "http://localhost:8004"):
        self.api_base_url = api_base_url
        self.metrics = {
            "system_health": {},
            "performance": {},
            "business_metrics": {},
            "alerts": [],
            "uptime": {"start_time": datetime.now(), "last_check": None}
        }
        self.running = False
        self.monitor_thread = None
    
    def check_system_health(self) -> Dict[str, Any]:
        """Check overall system health."""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_base_url}/health", timeout=5)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                health_data = response.json()
                return {
                    "status": "healthy",
                    "response_time": response_time,
                    "timestamp": datetime.now().isoformat(),
                    "details": health_data
                }
            else:
                return {
                    "status": "unhealthy",
                    "response_time": response_time,
                    "timestamp": datetime.now().isoformat(),
                    "error": f"HTTP {response.status_code}"
                }
        except Exception as e:
            return {
                "status": "error",
                "response_time": 0,
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
    
    def measure_performance_metrics(self) -> Dict[str, Any]:
        """Measure key performance metrics."""
        try:
            # Test response times for different endpoints
            endpoints = [
                ("/health", "GET"),
                ("/api/v1/stock/sync", "POST"),
                ("/api/v1/safety-stock/calculate", "POST")
            ]
            
            performance_data = {}
            
            for endpoint, method in endpoints:
                try:
                    start_time = time.time()
                    if method == "GET":
                        response = requests.get(f"{self.api_base_url}{endpoint}", timeout=5)
                    else:
                        # Use minimal test data for POST endpoints
                        test_data = {
                            "sku": "MONITOR-TEST",
                            "location_id": "MONITOR-LOC",
                            "available": 1,
                            "updated_at": datetime.now().isoformat() + "Z",
                            "source": "monitor"
                        } if "stock" in endpoint else {
                            "sku": "MONITOR-TEST",
                            "location_id": "MONITOR-LOC",
                            "demand_history": [1, 2, 3],
                            "lead_time_periods": 1,
                            "method": "z_service_level"
                        }
                        response = requests.post(f"{self.api_base_url}{endpoint}", json=test_data, timeout=5)
                    
                    response_time = time.time() - start_time
                    performance_data[endpoint] = {
                        "response_time": response_time,
                        "status_code": response.status_code,
                        "success": response.status_code == 200
                    }
                except Exception as e:
                    performance_data[endpoint] = {
                        "response_time": 0,
                        "status_code": 0,
                        "success": False,
                        "error": str(e)
                    }
            
            return {
                "timestamp": datetime.now().isoformat(),
                "endpoints": performance_data,
                "overall_health": all(ep.get("success", False) for ep in performance_data.values())
            }
        except Exception as e:
            return {
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "overall_health": False
            }
    
    def calculate_business_metrics(self) -> Dict[str, Any]:
        """Calculate business-relevant metrics."""
        try:
            # Simulate business metrics calculation
            # In production, these would come from actual data
            
            current_time = datetime.now()
            
            # Simulate inventory levels
            inventory_metrics = {
                "total_skus": 1500,
                "low_stock_items": 23,
                "out_of_stock_items": 5,
                "total_inventory_value": 125000.50,
                "last_updated": current_time.isoformat()
            }
            
            # Simulate order metrics
            order_metrics = {
                "orders_today": 45,
                "orders_this_week": 312,
                "average_order_value": 89.50,
                "fulfillment_rate": 96.8,
                "last_updated": current_time.isoformat()
            }
            
            # Simulate performance metrics
            performance_metrics = {
                "api_response_time_avg": 0.8,
                "api_requests_per_minute": 45,
                "error_rate": 0.2,
                "uptime_percentage": 99.8,
                "last_updated": current_time.isoformat()
            }
            
            return {
                "timestamp": current_time.isoformat(),
                "inventory": inventory_metrics,
                "orders": order_metrics,
                "performance": performance_metrics
            }
        except Exception as e:
            return {
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
    
    def check_alerts(self) -> List[Dict[str, Any]]:
        """Check for system alerts and warnings."""
        alerts = []
        current_time = datetime.now()
        
        # Check system health
        health = self.check_system_health()
        if health["status"] != "healthy":
            alerts.append({
                "level": "critical",
                "type": "system_health",
                "message": f"System health check failed: {health.get('error', 'Unknown error')}",
                "timestamp": current_time.isoformat()
            })
        
        # Check performance
        performance = self.measure_performance_metrics()
        if not performance.get("overall_health", False):
            alerts.append({
                "level": "warning",
                "type": "performance",
                "message": "One or more API endpoints are not responding correctly",
                "timestamp": current_time.isoformat()
            })
        
        # Check response times
        for endpoint, data in performance.get("endpoints", {}).items():
            if data.get("response_time", 0) > 5.0:  # 5 second threshold
                alerts.append({
                    "level": "warning",
                    "type": "performance",
                    "message": f"Slow response time for {endpoint}: {data['response_time']:.2f}s",
                    "timestamp": current_time.isoformat()
                })
        
        return alerts
    
    def update_metrics(self):
        """Update all monitoring metrics."""
        try:
            # Update system health
            self.metrics["system_health"] = self.check_system_health()
            
            # Update performance metrics
            self.metrics["performance"] = self.measure_performance_metrics()
            
            # Update business metrics
            self.metrics["business_metrics"] = self.calculate_business_metrics()
            
            # Check for alerts
            new_alerts = self.check_alerts()
            self.metrics["alerts"].extend(new_alerts)
            
            # Keep only last 100 alerts
            if len(self.metrics["alerts"]) > 100:
                self.metrics["alerts"] = self.metrics["alerts"][-100:]
            
            # Update uptime
            self.metrics["uptime"]["last_check"] = datetime.now()
            
            logger.info(f"Metrics updated at {datetime.now().isoformat()}")
            
        except Exception as e:
            logger.error(f"Error updating metrics: {e}")
    
    def start_monitoring(self, interval: int = 30):
        """Start continuous monitoring."""
        self.running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, args=(interval,))
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        logger.info(f"Started monitoring with {interval}s interval")
    
    def stop_monitoring(self):
        """Stop continuous monitoring."""
        self.running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("Stopped monitoring")
    
    def _monitor_loop(self, interval: int):
        """Main monitoring loop."""
        while self.running:
            try:
                self.update_metrics()
                time.sleep(interval)
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(interval)
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get current dashboard data."""
        return {
            "timestamp": datetime.now().isoformat(),
            "metrics": self.metrics,
            "status": "running" if self.running else "stopped"
        }
    
    def generate_report(self) -> str:
        """Generate a monitoring report."""
        report = []
        report.append("=" * 60)
        report.append("INVENTORY SYSTEM MONITORING REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append("")
        
        # System Health
        health = self.metrics.get("system_health", {})
        report.append("SYSTEM HEALTH:")
        report.append(f"  Status: {health.get('status', 'unknown')}")
        report.append(f"  Response Time: {health.get('response_time', 0):.3f}s")
        report.append(f"  Last Check: {health.get('timestamp', 'never')}")
        report.append("")
        
        # Performance
        performance = self.metrics.get("performance", {})
        report.append("PERFORMANCE METRICS:")
        for endpoint, data in performance.get("endpoints", {}).items():
            status = "✓" if data.get("success", False) else "✗"
            report.append(f"  {status} {endpoint}: {data.get('response_time', 0):.3f}s")
        report.append("")
        
        # Business Metrics
        business = self.metrics.get("business_metrics", {})
        inventory = business.get("inventory", {})
        orders = business.get("orders", {})
        perf = business.get("performance", {})
        
        report.append("BUSINESS METRICS:")
        report.append(f"  Total SKUs: {inventory.get('total_skus', 0)}")
        report.append(f"  Low Stock Items: {inventory.get('low_stock_items', 0)}")
        report.append(f"  Orders Today: {orders.get('orders_today', 0)}")
        report.append(f"  Fulfillment Rate: {orders.get('fulfillment_rate', 0):.1f}%")
        report.append(f"  API Uptime: {perf.get('uptime_percentage', 0):.1f}%")
        report.append("")
        
        # Alerts
        alerts = self.metrics.get("alerts", [])
        recent_alerts = [a for a in alerts if (datetime.now() - datetime.fromisoformat(a["timestamp"])).seconds < 3600]
        
        report.append(f"RECENT ALERTS ({len(recent_alerts)} in last hour):")
        for alert in recent_alerts[-10:]:  # Last 10 alerts
            report.append(f"  [{alert['level'].upper()}] {alert['message']}")
        report.append("")
        
        # Uptime
        uptime = self.metrics.get("uptime", {})
        start_time = uptime.get("start_time")
        if start_time:
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time)
            uptime_duration = datetime.now() - start_time
            report.append(f"SYSTEM UPTIME: {uptime_duration}")
        
        return "\n".join(report)

def main():
    """Run the monitoring dashboard."""
    dashboard = InventoryMonitoringDashboard()
    
    try:
        print("🚀 Starting Inventory Monitoring Dashboard")
        print("Press Ctrl+C to stop")
        
        dashboard.start_monitoring(interval=30)
        
        # Run for demonstration
        time.sleep(120)  # Run for 2 minutes
        
        # Generate report
        report = dashboard.generate_report()
        print("\n" + report)
        
        # Save report
        with open("monitoring_report.txt", "w") as f:
            f.write(report)
        print("\n📁 Report saved to: monitoring_report.txt")
        
    except KeyboardInterrupt:
        print("\n🛑 Stopping monitoring...")
    finally:
        dashboard.stop_monitoring()

if __name__ == "__main__":
    main()
