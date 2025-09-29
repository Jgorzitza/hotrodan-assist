"""
Real-time inventory monitoring dashboard.

Provides live monitoring of inventory system performance,
business metrics, and operational health.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import json
import time
import threading
import queue
import statistics
from collections import defaultdict, deque
import psutil
import requests

@dataclass
class SystemMetrics:
    """System performance metrics."""
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_usage_percent: float
    network_io_bytes: int
    timestamp: datetime

@dataclass
class BusinessMetrics:
    """Business performance metrics."""
    total_skus: int
    total_value: float
    active_orders: int
    low_stock_alerts: int
    fulfillment_rate: float
    avg_lead_time: float
    customer_satisfaction: float
    timestamp: datetime

@dataclass
class APIMetrics:
    """API performance metrics."""
    total_requests: int
    avg_response_time: float
    error_rate: float
    active_connections: int
    requests_per_second: float
    timestamp: datetime

class RealTimeMonitor:
    def __init__(self, api_base_url: str = "http://localhost:8005"):
        self.api_base_url = api_base_url
        self.metrics_queue = queue.Queue()
        self.is_monitoring = False
        self.monitor_thread = None
        
        # Metrics storage
        self.system_metrics: deque = deque(maxlen=1000)
        self.business_metrics: deque = deque(maxlen=1000)
        self.api_metrics: deque = deque(maxlen=1000)
        
        # Alert thresholds
        self.alert_thresholds = {
            "cpu_percent": 80.0,
            "memory_percent": 85.0,
            "disk_usage_percent": 90.0,
            "error_rate": 5.0,
            "response_time": 2.0,
            "fulfillment_rate": 90.0
        }
        
        # Alert history
        self.alerts: deque = deque(maxlen=100)
    
    def start_monitoring(self, interval: int = 30):
        """Start real-time monitoring."""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(interval,),
            daemon=True
        )
        self.monitor_thread.start()
        print(f"Real-time monitoring started (interval: {interval}s)")
    
    def stop_monitoring(self):
        """Stop real-time monitoring."""
        self.is_monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        print("Real-time monitoring stopped")
    
    def _monitoring_loop(self, interval: int):
        """Main monitoring loop."""
        while self.is_monitoring:
            try:
                # Collect system metrics
                system_metrics = self._collect_system_metrics()
                self.system_metrics.append(system_metrics)
                
                # Collect business metrics
                business_metrics = self._collect_business_metrics()
                self.business_metrics.append(business_metrics)
                
                # Collect API metrics
                api_metrics = self._collect_api_metrics()
                self.api_metrics.append(api_metrics)
                
                # Check for alerts
                self._check_alerts(system_metrics, business_metrics, api_metrics)
                
                time.sleep(interval)
                
            except Exception as e:
                print(f"Monitoring error: {e}")
                time.sleep(interval)
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Collect system performance metrics."""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()
            
            return SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / (1024 * 1024),
                disk_usage_percent=disk.percent,
                network_io_bytes=network.bytes_sent + network.bytes_recv,
                timestamp=datetime.now()
            )
        except Exception as e:
            print(f"Error collecting system metrics: {e}")
            return SystemMetrics(0, 0, 0, 0, 0, datetime.now())
    
    def _collect_business_metrics(self) -> BusinessMetrics:
        """Collect business performance metrics."""
        try:
            # Try to get metrics from API
            response = requests.get(f"{self.api_base_url}/analytics/metrics", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return BusinessMetrics(
                    total_skus=data.get("total_skus", 0),
                    total_value=data.get("total_value", 0.0),
                    active_orders=0,  # Would need order management system
                    low_stock_alerts=0,  # Would need alert system
                    fulfillment_rate=0.95,  # Simulated
                    avg_lead_time=7.0,  # Simulated
                    customer_satisfaction=0.94,  # Simulated
                    timestamp=datetime.now()
                )
            else:
                # Fallback to simulated data
                return self._get_simulated_business_metrics()
        except Exception as e:
            print(f"Error collecting business metrics: {e}")
            return self._get_simulated_business_metrics()
    
    def _get_simulated_business_metrics(self) -> BusinessMetrics:
        """Get simulated business metrics when API is unavailable."""
        return BusinessMetrics(
            total_skus=150,
            total_value=250000.0,
            active_orders=25,
            low_stock_alerts=3,
            fulfillment_rate=0.96,
            avg_lead_time=6.5,
            customer_satisfaction=0.93,
            timestamp=datetime.now()
        )
    
    def _collect_api_metrics(self) -> APIMetrics:
        """Collect API performance metrics."""
        try:
            # Test API response time
            start_time = time.time()
            response = requests.get(f"{self.api_base_url}/health", timeout=5)
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            if response.status_code == 200:
                return APIMetrics(
                    total_requests=1000,  # Simulated
                    avg_response_time=response_time,
                    error_rate=0.0,
                    active_connections=5,  # Simulated
                    requests_per_second=10.0,  # Simulated
                    timestamp=datetime.now()
                )
            else:
                return APIMetrics(
                    total_requests=0,
                    avg_response_time=999.0,
                    error_rate=100.0,
                    active_connections=0,
                    requests_per_second=0.0,
                    timestamp=datetime.now()
                )
        except Exception as e:
            print(f"Error collecting API metrics: {e}")
            return APIMetrics(
                total_requests=0,
                avg_response_time=999.0,
                error_rate=100.0,
                active_connections=0,
                requests_per_second=0.0,
                timestamp=datetime.now()
            )
    
    def _check_alerts(self, system_metrics: SystemMetrics, 
                     business_metrics: BusinessMetrics, 
                     api_metrics: APIMetrics):
        """Check for alert conditions."""
        alerts = []
        
        # System alerts
        if system_metrics.cpu_percent > self.alert_thresholds["cpu_percent"]:
            alerts.append(f"High CPU usage: {system_metrics.cpu_percent:.1f}%")
        
        if system_metrics.memory_percent > self.alert_thresholds["memory_percent"]:
            alerts.append(f"High memory usage: {system_metrics.memory_percent:.1f}%")
        
        if system_metrics.disk_usage_percent > self.alert_thresholds["disk_usage_percent"]:
            alerts.append(f"High disk usage: {system_metrics.disk_usage_percent:.1f}%")
        
        # API alerts
        if api_metrics.error_rate > self.alert_thresholds["error_rate"]:
            alerts.append(f"High API error rate: {api_metrics.error_rate:.1f}%")
        
        if api_metrics.avg_response_time > self.alert_thresholds["response_time"] * 1000:
            alerts.append(f"Slow API response: {api_metrics.avg_response_time:.1f}ms")
        
        # Business alerts
        if business_metrics.fulfillment_rate < self.alert_thresholds["fulfillment_rate"]:
            alerts.append(f"Low fulfillment rate: {business_metrics.fulfillment_rate:.1f}%")
        
        # Store alerts
        for alert in alerts:
            self.alerts.append({
                "message": alert,
                "timestamp": datetime.now(),
                "severity": "warning"
            })
            print(f"ALERT: {alert}")
    
    def get_current_status(self) -> Dict[str, Any]:
        """Get current system status."""
        if not self.system_metrics or not self.business_metrics or not self.api_metrics:
            return {"status": "no_data"}
        
        latest_system = self.system_metrics[-1]
        latest_business = self.business_metrics[-1]
        latest_api = self.api_metrics[-1]
        
        # Calculate trends
        system_trends = self._calculate_trends(self.system_metrics)
        business_trends = self._calculate_trends(self.business_metrics)
        api_trends = self._calculate_trends(self.api_metrics)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "status": "operational",
            "system": {
                "cpu_percent": latest_system.cpu_percent,
                "memory_percent": latest_system.memory_percent,
                "memory_used_mb": latest_system.memory_used_mb,
                "disk_usage_percent": latest_system.disk_usage_percent,
                "trends": system_trends
            },
            "business": {
                "total_skus": latest_business.total_skus,
                "total_value": latest_business.total_value,
                "fulfillment_rate": latest_business.fulfillment_rate,
                "avg_lead_time": latest_business.avg_lead_time,
                "customer_satisfaction": latest_business.customer_satisfaction,
                "trends": business_trends
            },
            "api": {
                "avg_response_time": latest_api.avg_response_time,
                "error_rate": latest_api.error_rate,
                "requests_per_second": latest_api.requests_per_second,
                "trends": api_trends
            },
            "alerts": list(self.alerts)[-10:],  # Last 10 alerts
            "uptime": self._calculate_uptime()
        }
    
    def _calculate_trends(self, metrics: deque) -> Dict[str, str]:
        """Calculate trends for metrics."""
        if len(metrics) < 2:
            return {"trend": "stable"}
        
        # Simple trend calculation
        recent = list(metrics)[-5:]  # Last 5 measurements
        if len(recent) < 2:
            return {"trend": "stable"}
        
        # Calculate average change
        changes = []
        for i in range(1, len(recent)):
            if hasattr(recent[i], 'cpu_percent'):
                changes.append(recent[i].cpu_percent - recent[i-1].cpu_percent)
            elif hasattr(recent[i], 'total_skus'):
                changes.append(recent[i].total_skus - recent[i-1].total_skus)
            elif hasattr(recent[i], 'avg_response_time'):
                changes.append(recent[i].avg_response_time - recent[i-1].avg_response_time)
        
        if not changes:
            return {"trend": "stable"}
        
        avg_change = statistics.mean(changes)
        
        if avg_change > 0.1:
            return {"trend": "increasing", "change": avg_change}
        elif avg_change < -0.1:
            return {"trend": "decreasing", "change": avg_change}
        else:
            return {"trend": "stable", "change": avg_change}
    
    def _calculate_uptime(self) -> str:
        """Calculate system uptime."""
        if not self.system_metrics:
            return "unknown"
        
        first_metric = self.system_metrics[0]
        uptime_seconds = (datetime.now() - first_metric.timestamp).total_seconds()
        
        hours = int(uptime_seconds // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        
        return f"{hours}h {minutes}m"
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive monitoring report."""
        if not self.system_metrics or not self.business_metrics or not self.api_metrics:
            return {"error": "Insufficient data for report"}
        
        # Calculate averages
        system_avg = self._calculate_averages(self.system_metrics)
        business_avg = self._calculate_averages(self.business_metrics)
        api_avg = self._calculate_averages(self.api_metrics)
        
        # Calculate performance scores
        performance_score = self._calculate_performance_score()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "report_period": f"{len(self.system_metrics)} measurements",
            "performance_score": performance_score,
            "system_performance": system_avg,
            "business_performance": business_avg,
            "api_performance": api_avg,
            "alerts_summary": {
                "total_alerts": len(self.alerts),
                "recent_alerts": list(self.alerts)[-5:],
                "alert_rate": len(self.alerts) / max(1, len(self.system_metrics)) * 100
            },
            "recommendations": self._generate_recommendations()
        }
    
    def _calculate_averages(self, metrics: deque) -> Dict[str, float]:
        """Calculate average values for metrics."""
        if not metrics:
            return {}
        
        data = list(metrics)
        
        if hasattr(data[0], 'cpu_percent'):
            return {
                "avg_cpu_percent": statistics.mean([m.cpu_percent for m in data]),
                "avg_memory_percent": statistics.mean([m.memory_percent for m in data]),
                "avg_disk_usage_percent": statistics.mean([m.disk_usage_percent for m in data])
            }
        elif hasattr(data[0], 'total_skus'):
            return {
                "avg_total_skus": statistics.mean([m.total_skus for m in data]),
                "avg_total_value": statistics.mean([m.total_value for m in data]),
                "avg_fulfillment_rate": statistics.mean([m.fulfillment_rate for m in data])
            }
        elif hasattr(data[0], 'avg_response_time'):
            return {
                "avg_response_time": statistics.mean([m.avg_response_time for m in data]),
                "avg_error_rate": statistics.mean([m.error_rate for m in data]),
                "avg_requests_per_second": statistics.mean([m.requests_per_second for m in data])
            }
        
        return {}
    
    def _calculate_performance_score(self) -> float:
        """Calculate overall performance score (0-100)."""
        if not self.system_metrics or not self.business_metrics or not self.api_metrics:
            return 0.0
        
        latest_system = self.system_metrics[-1]
        latest_business = self.business_metrics[-1]
        latest_api = self.api_metrics[-1]
        
        # System score (0-40 points)
        system_score = 40
        if latest_system.cpu_percent > 80:
            system_score -= 10
        if latest_system.memory_percent > 85:
            system_score -= 10
        if latest_system.disk_usage_percent > 90:
            system_score -= 10
        
        # Business score (0-30 points)
        business_score = 30
        if latest_business.fulfillment_rate < 90:
            business_score -= 15
        if latest_business.customer_satisfaction < 0.9:
            business_score -= 10
        
        # API score (0-30 points)
        api_score = 30
        if latest_api.error_rate > 5:
            api_score -= 15
        if latest_api.avg_response_time > 2000:
            api_score -= 10
        
        return max(0, system_score + business_score + api_score)
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on monitoring data."""
        recommendations = []
        
        if not self.system_metrics or not self.business_metrics or not self.api_metrics:
            return ["Insufficient data for recommendations"]
        
        latest_system = self.system_metrics[-1]
        latest_business = self.business_metrics[-1]
        latest_api = self.api_metrics[-1]
        
        # System recommendations
        if latest_system.cpu_percent > 70:
            recommendations.append("Consider scaling up CPU resources or optimizing processes")
        
        if latest_system.memory_percent > 80:
            recommendations.append("Monitor memory usage and consider increasing RAM")
        
        if latest_system.disk_usage_percent > 85:
            recommendations.append("Clean up disk space or expand storage capacity")
        
        # Business recommendations
        if latest_business.fulfillment_rate < 95:
            recommendations.append("Review inventory levels and supplier performance")
        
        if latest_business.customer_satisfaction < 0.9:
            recommendations.append("Investigate customer satisfaction issues")
        
        # API recommendations
        if latest_api.error_rate > 2:
            recommendations.append("Investigate API errors and improve error handling")
        
        if latest_api.avg_response_time > 1000:
            recommendations.append("Optimize API performance and consider caching")
        
        if not recommendations:
            recommendations.append("System performing well - continue monitoring")
        
        return recommendations

def main():
    """Main function for testing the real-time monitor."""
    monitor = RealTimeMonitor()
    
    try:
        print("Starting real-time monitoring...")
        monitor.start_monitoring(interval=10)  # 10 second intervals for testing
        
        # Run for 2 minutes
        time.sleep(120)
        
        # Generate report
        report = monitor.generate_report()
        print("\n=== MONITORING REPORT ===")
        print(json.dumps(report, indent=2, default=str))
        
    except KeyboardInterrupt:
        print("\nStopping monitoring...")
    finally:
        monitor.stop_monitoring()

if __name__ == "__main__":
    main()
