"""
Sales Analytics Platform Long-Term Monitoring System

This system provides comprehensive monitoring, health tracking, and performance
validation for the Sales Analytics Platform.
"""

import time
import json
import requests
import psutil
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any
import threading
import sqlite3
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/sales_analytics_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SalesAnalyticsMonitor:
    """Long-term monitoring system for Sales Analytics Platform."""
    
    def __init__(self, api_url: str = "http://localhost:8005"):
        self.api_url = api_url
        self.db_path = "monitoring/sales_analytics_monitor.db"
        self.monitoring_active = False
        self.metrics_history = []
        
        # Initialize database
        self._init_database()
        
    def _init_database(self):
        """Initialize monitoring database."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS health_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                endpoint TEXT,
                status_code INTEGER,
                response_time REAL,
                success BOOLEAN,
                error_message TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                cpu_percent REAL,
                memory_percent REAL,
                memory_used_mb REAL,
                disk_usage_percent REAL,
                api_response_time REAL,
                requests_per_minute REAL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                error_type TEXT,
                error_message TEXT,
                endpoint TEXT,
                severity TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Monitoring database initialized")
    
    def start_monitoring(self, duration_hours: int = 24):
        """Start long-term monitoring."""
        logger.info(f"Starting long-term monitoring for {duration_hours} hours")
        self.monitoring_active = True
        
        start_time = datetime.now()
        end_time = start_time + timedelta(hours=duration_hours)
        
        while self.monitoring_active and datetime.now() < end_time:
            try:
                # Health check
                self._perform_health_check()
                
                # Performance metrics
                self._collect_performance_metrics()
                
                # API endpoint testing
                self._test_api_endpoints()
                
                # Wait before next check
                time.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                self._log_error("monitoring_error", str(e), "system", "high")
                time.sleep(30)  # Wait 30 seconds on error
        
        logger.info("Long-term monitoring completed")
    
    def _perform_health_check(self):
        """Perform health check on API."""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_url}/health", timeout=10)
            response_time = time.time() - start_time
            
            success = response.status_code == 200
            error_message = None if success else f"HTTP {response.status_code}"
            
            self._store_health_check("health", response.status_code, response_time, success, error_message)
            
            if success:
                logger.info(f"Health check passed - Response time: {response_time:.3f}s")
            else:
                logger.warning(f"Health check failed - Status: {response.status_code}")
                
        except Exception as e:
            self._store_health_check("health", 0, 0, False, str(e))
            logger.error(f"Health check error: {e}")
    
    def _test_api_endpoints(self):
        """Test all API endpoints."""
        endpoints = [
            ("/api/sales/channel-campaign-metrics", "POST", {
                "transactions": [{"amount": 100, "channel": "email"}]
            }),
            ("/api/sales/attribution-models", "POST", {
                "transactions": [{"amount": 100}],
                "touchpoints": [{"customer_id": 1, "channel": "email"}]
            }),
            ("/api/sales/funnel-dropoff", "POST", {
                "funnel_steps": [{"name": "landing"}, {"name": "signup"}],
                "user_sessions": [{"step": "landing"}]
            })
        ]
        
        for endpoint, method, data in endpoints:
            try:
                start_time = time.time()
                
                if method == "POST":
                    response = requests.post(
                        f"{self.api_url}{endpoint}",
                        json=data,
                        timeout=10
                    )
                else:
                    response = requests.get(f"{self.api_url}{endpoint}", timeout=10)
                
                response_time = time.time() - start_time
                success = response.status_code == 200
                error_message = None if success else f"HTTP {response.status_code}"
                
                self._store_health_check(endpoint, response.status_code, response_time, success, error_message)
                
                if success:
                    logger.info(f"Endpoint {endpoint} - Response time: {response_time:.3f}s")
                else:
                    logger.warning(f"Endpoint {endpoint} failed - Status: {response.status_code}")
                    
            except Exception as e:
                self._store_health_check(endpoint, 0, 0, False, str(e))
                logger.error(f"Endpoint {endpoint} error: {e}")
    
    def _collect_performance_metrics(self):
        """Collect system performance metrics."""
        try:
            # CPU and memory usage
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_mb = memory.used / 1024 / 1024
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage_percent = (disk.used / disk.total) * 100
            
            # API response time (quick test)
            start_time = time.time()
            try:
                requests.get(f"{self.api_url}/health", timeout=5)
                api_response_time = time.time() - start_time
            except:
                api_response_time = 0
            
            # Calculate requests per minute (simplified)
            requests_per_minute = self._calculate_requests_per_minute()
            
            self._store_performance_metrics(
                cpu_percent, memory_percent, memory_used_mb,
                disk_usage_percent, api_response_time, requests_per_minute
            )
            
            logger.info(f"Performance - CPU: {cpu_percent}%, Memory: {memory_percent}%, API: {api_response_time:.3f}s")
            
        except Exception as e:
            logger.error(f"Performance metrics collection error: {e}")
            self._log_error("performance_collection", str(e), "system", "medium")
    
    def _calculate_requests_per_minute(self) -> float:
        """Calculate requests per minute from recent health checks."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get health checks from last minute
            one_minute_ago = datetime.now() - timedelta(minutes=1)
            cursor.execute('''
                SELECT COUNT(*) FROM health_checks 
                WHERE timestamp > ? AND success = 1
            ''', (one_minute_ago,))
            
            count = cursor.fetchone()[0]
            conn.close()
            
            return float(count)
            
        except Exception as e:
            logger.error(f"Requests per minute calculation error: {e}")
            return 0.0
    
    def _store_health_check(self, endpoint: str, status_code: int, response_time: float, success: bool, error_message: str):
        """Store health check result in database."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO health_checks (endpoint, status_code, response_time, success, error_message)
                VALUES (?, ?, ?, ?, ?)
            ''', (endpoint, status_code, response_time, success, error_message))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Database storage error: {e}")
    
    def _store_performance_metrics(self, cpu_percent: float, memory_percent: float, memory_used_mb: float,
                                 disk_usage_percent: float, api_response_time: float, requests_per_minute: float):
        """Store performance metrics in database."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO performance_metrics 
                (cpu_percent, memory_percent, memory_used_mb, disk_usage_percent, api_response_time, requests_per_minute)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (cpu_percent, memory_percent, memory_used_mb, disk_usage_percent, api_response_time, requests_per_minute))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Performance metrics storage error: {e}")
    
    def _log_error(self, error_type: str, error_message: str, endpoint: str, severity: str):
        """Log error to database."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO error_logs (error_type, error_message, endpoint, severity)
                VALUES (?, ?, ?, ?)
            ''', (error_type, error_message, endpoint, severity))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error logging failed: {e}")
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate monitoring report."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Health check summary
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_checks,
                    AVG(response_time) as avg_response_time,
                    MAX(response_time) as max_response_time
                FROM health_checks
            ''')
            health_summary = cursor.fetchone()
            
            # Performance summary
            cursor.execute('''
                SELECT 
                    AVG(cpu_percent) as avg_cpu,
                    AVG(memory_percent) as avg_memory,
                    AVG(api_response_time) as avg_api_response,
                    MAX(memory_used_mb) as max_memory_used
                FROM performance_metrics
            ''')
            performance_summary = cursor.fetchone()
            
            # Error summary
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_errors,
                    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_errors
                FROM error_logs
            ''')
            error_summary = cursor.fetchone()
            
            conn.close()
            
            return {
                "monitoring_summary": {
                    "total_health_checks": health_summary[0],
                    "successful_checks": health_summary[1],
                    "success_rate": (health_summary[1] / health_summary[0] * 100) if health_summary[0] > 0 else 0,
                    "avg_response_time": health_summary[2],
                    "max_response_time": health_summary[3]
                },
                "performance_summary": {
                    "avg_cpu_percent": performance_summary[0],
                    "avg_memory_percent": performance_summary[1],
                    "avg_api_response_time": performance_summary[2],
                    "max_memory_used_mb": performance_summary[3]
                },
                "error_summary": {
                    "total_errors": error_summary[0],
                    "high_severity_errors": error_summary[1]
                }
            }
            
        except Exception as e:
            logger.error(f"Report generation error: {e}")
            return {"error": str(e)}
    
    def stop_monitoring(self):
        """Stop monitoring."""
        self.monitoring_active = False
        logger.info("Monitoring stopped")

if __name__ == "__main__":
    monitor = SalesAnalyticsMonitor()
    
    try:
        # Start monitoring for 24 hours
        monitor.start_monitoring(duration_hours=24)
    except KeyboardInterrupt:
        logger.info("Monitoring interrupted by user")
    finally:
        monitor.stop_monitoring()
        
        # Generate final report
        report = monitor.generate_report()
        print("\n" + "="*50)
        print("MONITORING REPORT")
        print("="*50)
        print(json.dumps(report, indent=2))
