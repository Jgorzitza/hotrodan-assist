import time
import logging
import psutil
import json
from datetime import datetime
from typing import Dict, Any

class SalesAnalyticsMonitor:
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.total_processing_time = 0.0
        self.logger = logging.getLogger(__name__)
        
    def log_request(self, processing_time: float, success: bool = True):
        self.request_count += 1
        self.total_processing_time += processing_time
        if not success:
            self.error_count += 1
            
    def get_metrics(self) -> Dict[str, Any]:
        uptime = time.time() - self.start_time
        avg_response_time = self.total_processing_time / max(self.request_count, 1)
        error_rate = (self.error_count / max(self.request_count, 1)) * 100
        
        return {
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": uptime,
            "total_requests": self.request_count,
            "error_count": self.error_count,
            "error_rate_percent": error_rate,
            "avg_response_time_ms": avg_response_time * 1000,
            "memory_usage_mb": psutil.Process().memory_info().rss / 1024 / 1024,
            "cpu_percent": psutil.cpu_percent(),
            "status": "healthy" if error_rate < 5 else "degraded"
        }
    
    def check_health(self) -> bool:
        metrics = self.get_metrics()
        return metrics["error_rate_percent"] < 5 and metrics["avg_response_time_ms"] < 1000

# Global monitor instance
monitor = SalesAnalyticsMonitor()

def get_health_status() -> Dict[str, Any]:
    return monitor.get_metrics()

def is_healthy() -> bool:
    return monitor.check_health()
