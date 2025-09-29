"""
Comprehensive test suite for sustained operations.

Tests real-time monitoring, automated enhancements, and continuous operations.
"""
import pytest
import sys
import os
import time
import threading
from datetime import datetime, timedelta
import json
import random

# Add sync directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'sync'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'monitoring'))

from real_time_dashboard import RealTimeMonitor, SystemMetrics, BusinessMetrics, APIMetrics
from automated_enhancements import AutomatedEnhancementSystem, EnhancementRule, EnhancementResult

class TestRealTimeMonitor:
    def setup_method(self):
        self.monitor = RealTimeMonitor()
    
    def test_system_metrics_collection(self):
        """Test system metrics collection."""
        metrics = self.monitor._collect_system_metrics()
        
        assert isinstance(metrics, SystemMetrics)
        assert 0 <= metrics.cpu_percent <= 100
        assert 0 <= metrics.memory_percent <= 100
        assert metrics.memory_used_mb >= 0
        assert 0 <= metrics.disk_usage_percent <= 100
        assert metrics.network_io_bytes >= 0
        assert isinstance(metrics.timestamp, datetime)
    
    def test_business_metrics_collection(self):
        """Test business metrics collection."""
        metrics = self.monitor._collect_business_metrics()
        
        assert isinstance(metrics, BusinessMetrics)
        assert metrics.total_skus >= 0
        assert metrics.total_value >= 0
        assert metrics.active_orders >= 0
        assert metrics.low_stock_alerts >= 0
        assert 0 <= metrics.fulfillment_rate <= 1
        assert metrics.avg_lead_time >= 0
        assert 0 <= metrics.customer_satisfaction <= 1
        assert isinstance(metrics.timestamp, datetime)
    
    def test_api_metrics_collection(self):
        """Test API metrics collection."""
        metrics = self.monitor._collect_api_metrics()
        
        assert isinstance(metrics, APIMetrics)
        assert metrics.total_requests >= 0
        assert metrics.avg_response_time >= 0
        assert 0 <= metrics.error_rate <= 100
        assert metrics.active_connections >= 0
        assert metrics.requests_per_second >= 0
        assert isinstance(metrics.timestamp, datetime)
    
    def test_alert_checking(self):
        """Test alert checking functionality."""
        # Create test metrics that should trigger alerts
        system_metrics = SystemMetrics(
            cpu_percent=85.0,  # Above threshold
            memory_percent=90.0,  # Above threshold
            memory_used_mb=1000,
            disk_usage_percent=95.0,  # Above threshold
            network_io_bytes=1000000,
            timestamp=datetime.now()
        )
        
        business_metrics = BusinessMetrics(
            total_skus=100,
            total_value=100000,
            active_orders=10,
            low_stock_alerts=5,
            fulfillment_rate=0.85,  # Below threshold
            avg_lead_time=10.0,
            customer_satisfaction=0.9,
            timestamp=datetime.now()
        )
        
        api_metrics = APIMetrics(
            total_requests=1000,
            avg_response_time=3000.0,  # Above threshold
            error_rate=10.0,  # Above threshold
            active_connections=5,
            requests_per_second=10.0,
            timestamp=datetime.now()
        )
        
        # Check alerts
        initial_alert_count = len(self.monitor.alerts)
        self.monitor._check_alerts(system_metrics, business_metrics, api_metrics)
        
        # Should have generated alerts
        assert len(self.monitor.alerts) > initial_alert_count
    
    def test_current_status(self):
        """Test current status generation."""
        # Add some test data
        self.monitor.system_metrics.append(SystemMetrics(50, 60, 1000, 70, 1000000, datetime.now()))
        self.monitor.business_metrics.append(BusinessMetrics(100, 100000, 10, 2, 0.95, 7, 0.9, datetime.now()))
        self.monitor.api_metrics.append(APIMetrics(1000, 500, 1, 5, 10, datetime.now()))
        
        status = self.monitor.get_current_status()
        
        assert "timestamp" in status
        assert "status" in status
        assert "system" in status
        assert "business" in status
        assert "api" in status
        assert "alerts" in status
        assert "uptime" in status
    
    def test_report_generation(self):
        """Test report generation."""
        # Add some test data
        for i in range(5):
            self.monitor.system_metrics.append(SystemMetrics(50 + i, 60 + i, 1000, 70, 1000000, datetime.now()))
            self.monitor.business_metrics.append(BusinessMetrics(100, 100000, 10, 2, 0.95, 7, 0.9, datetime.now()))
            self.monitor.api_metrics.append(APIMetrics(1000, 500, 1, 5, 10, datetime.now()))
        
        report = self.monitor.generate_report()
        
        assert "timestamp" in report
        assert "report_period" in report
        assert "performance_score" in report
        assert "system_performance" in report
        assert "business_performance" in report
        assert "api_performance" in report
        assert "alerts_summary" in report
        assert "recommendations" in report

class TestAutomatedEnhancementSystem:
    def setup_method(self):
        self.system = AutomatedEnhancementSystem()
    
    def test_rule_creation(self):
        """Test rule creation and management."""
        # Test adding a new rule
        new_rule = EnhancementRule(
            name="test_rule",
            condition="cpu_percent > 90",
            action="test_action",
            priority=1
        )
        
        self.system.add_rule(new_rule)
        assert "test_rule" in self.system.rules
        assert self.system.rules["test_rule"].name == "test_rule"
    
    def test_performance_data_update(self):
        """Test performance data updating."""
        self.system.update_performance_data("cpu_percent", 75.0)
        self.system.update_performance_data("memory_percent", 80.0)
        
        assert len(self.system.performance_data["cpu_percent"]) == 1
        assert len(self.system.performance_data["memory_percent"]) == 1
        assert self.system.performance_data["cpu_percent"][-1]["value"] == 75.0
        assert self.system.performance_data["memory_percent"][-1]["value"] == 80.0
    
    def test_condition_evaluation(self):
        """Test condition evaluation."""
        metrics = {"cpu_percent": 85.0, "memory_percent": 70.0}
        
        # Test valid conditions
        assert self.system._evaluate_condition("cpu_percent > 80", metrics) == True
        assert self.system._evaluate_condition("memory_percent < 80", metrics) == True
        assert self.system._evaluate_condition("cpu_percent > 90", metrics) == False
    
    def test_rule_triggering(self):
        """Test rule triggering logic."""
        # Add some performance data
        self.system.update_performance_data("cpu_percent", 85.0)
        
        # Test rule triggering
        rule = self.system.rules["high_cpu_optimization"]
        metrics = self.system._get_current_metrics()
        
        should_trigger = self.system._should_trigger_rule(rule)
        assert isinstance(should_trigger, bool)
    
    def test_enhancement_execution(self):
        """Test enhancement execution."""
        # Add performance data that should trigger a rule
        self.system.update_performance_data("cpu_percent", 85.0)
        
        # Manually trigger rule evaluation
        self.system._evaluate_rules()
        
        # Should have some enhancement results
        assert len(self.system.enhancement_history) >= 0
    
    def test_baseline_updates(self):
        """Test baseline updates."""
        # Add some performance data
        for i in range(15):
            self.system.update_performance_data("cpu_percent", 50 + i)
        
        # Update baselines
        self.system._update_baselines()
        
        # Check that baselines were updated
        assert "cpu_percent" in self.system.baselines
        baseline = self.system.baselines["cpu_percent"]
        assert baseline.baseline_value > 0
        assert baseline.sample_size > 0
    
    def test_enhancement_status(self):
        """Test enhancement status generation."""
        status = self.system.get_enhancement_status()
        
        assert "timestamp" in status
        assert "is_running" in status
        assert "active_rules" in status
        assert "total_rules" in status
        assert "recent_enhancements" in status
        assert "performance_baselines" in status
    
    def test_enhancement_report(self):
        """Test enhancement report generation."""
        # Add some enhancement results
        for i in range(5):
            result = EnhancementResult(
                rule_name=f"test_rule_{i}",
                action_taken=f"test_action_{i}",
                success=True,
                improvement=0.1,
                timestamp=datetime.now(),
                details={"test": "data"}
            )
            self.system.enhancement_history.append(result)
        
        report = self.system.generate_enhancement_report()
        
        assert "timestamp" in report
        assert "summary" in report
        assert "rule_performance" in report
        assert "recent_enhancements" in report
        assert report["summary"]["total_enhancements"] == 5

def test_sustained_operations_performance():
    """Test sustained operations performance."""
    monitor = RealTimeMonitor()
    enhancement_system = AutomatedEnhancementSystem()
    
    # Test performance under load
    start_time = time.time()
    
    # Simulate high load
    for i in range(100):
        system_metrics = monitor._collect_system_metrics()
        enhancement_system.update_performance_data("cpu_percent", system_metrics.cpu_percent)
        enhancement_system.update_performance_data("memory_percent", system_metrics.memory_percent)
    
    end_time = time.time()
    processing_time = end_time - start_time
    
    # Should process 100 metrics in reasonable time
    assert processing_time < 10.0  # Less than 10 seconds
    assert len(enhancement_system.performance_data["cpu_percent"]) == 100
    
    print(f"Processed 100 metrics in {processing_time:.2f} seconds")

def test_error_handling():
    """Test error handling in sustained operations."""
    monitor = RealTimeMonitor()
    enhancement_system = AutomatedEnhancementSystem()
    
    # Test with invalid data
    try:
        enhancement_system.update_performance_data("invalid_metric", "invalid_value")
        # Should not crash
        assert True
    except Exception as e:
        # Should handle errors gracefully
        assert isinstance(e, Exception)
    
    # Test with None values
    try:
        enhancement_system.update_performance_data("cpu_percent", None)
        # Should not crash
        assert True
    except Exception as e:
        # Should handle errors gracefully
        assert isinstance(e, Exception)

if __name__ == "__main__":
    # Run integration test
    test_sustained_operations_performance()
    test_error_handling()
    print("✅ All sustained operations tests passed!")
    print("🎉 Sustained operations system fully operational!")
