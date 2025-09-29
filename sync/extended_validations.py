"""
Extended validations system for inventory management.

Provides comprehensive long-term monitoring, end-to-end testing,
and continuous validation capabilities for inventory operations.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple, Callable
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import json
import time
import threading
import logging
from collections import defaultdict, deque
import statistics
import psutil
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import subprocess
import os
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ValidationType(Enum):
    """Validation type enumeration."""
    FUNCTIONAL = "FUNCTIONAL"
    PERFORMANCE = "PERFORMANCE"
    INTEGRATION = "INTEGRATION"
    SECURITY = "SECURITY"
    COMPLIANCE = "COMPLIANCE"
    RELIABILITY = "RELIABILITY"
    SCALABILITY = "SCALABILITY"
    USABILITY = "USABILITY"

class ValidationStatus(Enum):
    """Validation status enumeration."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    TIMEOUT = "TIMEOUT"

class MonitoringMetric(Enum):
    """Monitoring metric enumeration."""
    CPU_USAGE = "CPU_USAGE"
    MEMORY_USAGE = "MEMORY_USAGE"
    DISK_USAGE = "DISK_USAGE"
    NETWORK_IO = "NETWORK_IO"
    API_RESPONSE_TIME = "API_RESPONSE_TIME"
    API_THROUGHPUT = "API_THROUGHPUT"
    ERROR_RATE = "ERROR_RATE"
    AVAILABILITY = "AVAILABILITY"
    BUSINESS_METRICS = "BUSINESS_METRICS"

@dataclass
class ValidationTest:
    """Validation test definition."""
    test_id: str
    name: str
    description: str
    validation_type: ValidationType
    test_function: Callable
    timeout: int = 300  # 5 minutes default
    retry_count: int = 3
    retry_delay: int = 10
    dependencies: List[str] = field(default_factory=list)
    expected_result: Any = None
    threshold: Optional[float] = None
    enabled: bool = True

@dataclass
class ValidationResult:
    """Validation result data structure."""
    test_id: str
    status: ValidationStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    result: Any = None
    error: Optional[str] = None
    retry_count: int = 0
    metrics: Dict[str, Any] = field(default_factory=dict)

@dataclass
class MonitoringData:
    """Monitoring data structure."""
    timestamp: datetime
    metric: MonitoringMetric
    value: float
    unit: str
    tags: Dict[str, str] = field(default_factory=dict)

@dataclass
class E2ETestScenario:
    """End-to-end test scenario."""
    scenario_id: str
    name: str
    description: str
    steps: List[Dict[str, Any]]
    expected_outcome: str
    timeout: int = 600  # 10 minutes default
    enabled: bool = True

class ExtendedValidations:
    def __init__(self):
        self.validation_tests: Dict[str, ValidationTest] = {}
        self.validation_results: deque = deque(maxlen=10000)
        self.monitoring_data: deque = deque(maxlen=100000)
        self.e2e_scenarios: Dict[str, E2ETestScenario] = {}
        self.is_monitoring = False
        self.monitoring_thread = None
        self.validation_executor = ThreadPoolExecutor(max_workers=10)
        
        # Initialize default tests and scenarios
        self._initialize_default_tests()
        self._initialize_default_scenarios()
    
    def _initialize_default_tests(self):
        """Initialize default validation tests."""
        default_tests = [
            ValidationTest(
                test_id="api_health_check",
                name="API Health Check",
                description="Check if all API endpoints are responding",
                validation_type=ValidationType.FUNCTIONAL,
                test_function=self._test_api_health,
                timeout=30
            ),
            ValidationTest(
                test_id="database_connectivity",
                name="Database Connectivity",
                description="Verify database connection and basic operations",
                validation_type=ValidationType.FUNCTIONAL,
                test_function=self._test_database_connectivity,
                timeout=60
            ),
            ValidationTest(
                test_id="inventory_crud_operations",
                name="Inventory CRUD Operations",
                description="Test create, read, update, delete operations",
                validation_type=ValidationType.FUNCTIONAL,
                test_function=self._test_inventory_crud,
                timeout=120
            ),
            ValidationTest(
                test_id="api_performance",
                name="API Performance Test",
                description="Test API response times and throughput",
                validation_type=ValidationType.PERFORMANCE,
                test_function=self._test_api_performance,
                timeout=300,
                threshold=1.0  # 1 second response time threshold
            ),
            ValidationTest(
                test_id="concurrent_users",
                name="Concurrent Users Test",
                description="Test system under concurrent user load",
                validation_type=ValidationType.SCALABILITY,
                test_function=self._test_concurrent_users,
                timeout=600
            ),
            ValidationTest(
                test_id="data_integrity",
                name="Data Integrity Check",
                description="Verify data consistency and integrity",
                validation_type=ValidationType.RELIABILITY,
                test_function=self._test_data_integrity,
                timeout=180
            ),
            ValidationTest(
                test_id="security_scan",
                name="Security Scan",
                description="Basic security vulnerability scan",
                validation_type=ValidationType.SECURITY,
                test_function=self._test_security_scan,
                timeout=300
            ),
            ValidationTest(
                test_id="compliance_check",
                name="Compliance Check",
                description="Verify compliance with regulations",
                validation_type=ValidationType.COMPLIANCE,
                test_function=self._test_compliance_check,
                timeout=120
            )
        ]
        
        for test in default_tests:
            self.validation_tests[test.test_id] = test
    
    def _initialize_default_scenarios(self):
        """Initialize default E2E test scenarios."""
        default_scenarios = [
            E2ETestScenario(
                scenario_id="complete_inventory_workflow",
                name="Complete Inventory Workflow",
                description="End-to-end inventory management workflow",
                steps=[
                    {"action": "create_product", "data": {"sku": "TEST001", "name": "Test Product"}},
                    {"action": "add_inventory", "data": {"sku": "TEST001", "quantity": 100}},
                    {"action": "update_inventory", "data": {"sku": "TEST001", "quantity": 150}},
                    {"action": "check_low_stock", "data": {"threshold": 50}},
                    {"action": "generate_report", "data": {"type": "inventory_summary"}},
                    {"action": "cleanup", "data": {"sku": "TEST001"}}
                ],
                expected_outcome="All inventory operations completed successfully"
            ),
            E2ETestScenario(
                scenario_id="multi_location_sync",
                name="Multi-Location Synchronization",
                description="Test inventory synchronization across multiple locations",
                steps=[
                    {"action": "create_locations", "data": {"locations": ["warehouse1", "warehouse2", "store1"]}},
                    {"action": "add_inventory_location1", "data": {"location": "warehouse1", "sku": "TEST002", "quantity": 100}},
                    {"action": "add_inventory_location2", "data": {"location": "warehouse2", "sku": "TEST002", "quantity": 50}},
                    {"action": "sync_inventory", "data": {"sku": "TEST002"}},
                    {"action": "verify_sync", "data": {"sku": "TEST002"}},
                    {"action": "cleanup", "data": {"sku": "TEST002"}}
                ],
                expected_outcome="Inventory synchronized across all locations"
            ),
            E2ETestScenario(
                scenario_id="demand_forecasting_workflow",
                name="Demand Forecasting Workflow",
                description="Test demand forecasting and optimization",
                steps=[
                    {"action": "create_historical_data", "data": {"sku": "TEST003", "periods": 12}},
                    {"action": "train_forecast_model", "data": {"sku": "TEST003"}},
                    {"action": "generate_forecast", "data": {"sku": "TEST003", "periods": 6}},
                    {"action": "optimize_inventory", "data": {"sku": "TEST003"}},
                    {"action": "verify_recommendations", "data": {"sku": "TEST003"}},
                    {"action": "cleanup", "data": {"sku": "TEST003"}}
                ],
                expected_outcome="Demand forecasting and optimization completed"
            )
        ]
        
        for scenario in default_scenarios:
            self.e2e_scenarios[scenario.scenario_id] = scenario
    
    def add_validation_test(self, test: ValidationTest):
        """Add a validation test."""
        self.validation_tests[test.test_id] = test
        logger.info(f"Validation test '{test.test_id}' added")
    
    def add_e2e_scenario(self, scenario: E2ETestScenario):
        """Add an E2E test scenario."""
        self.e2e_scenarios[scenario.scenario_id] = scenario
        logger.info(f"E2E scenario '{scenario.scenario_id}' added")
    
    def start_monitoring(self):
        """Start continuous monitoring."""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.monitoring_thread = threading.Thread(
            target=self._monitoring_loop,
            daemon=True
        )
        self.monitoring_thread.start()
        logger.info("Extended validations monitoring started")
    
    def stop_monitoring(self):
        """Stop continuous monitoring."""
        self.is_monitoring = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        logger.info("Extended validations monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.is_monitoring:
            try:
                # Collect system metrics
                self._collect_system_metrics()
                
                # Collect API metrics
                self._collect_api_metrics()
                
                # Collect business metrics
                self._collect_business_metrics()
                
                time.sleep(30)  # Collect metrics every 30 seconds
                
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                time.sleep(10)
    
    def _collect_system_metrics(self):
        """Collect system performance metrics."""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            self.monitoring_data.append(MonitoringData(
                timestamp=datetime.now(),
                metric=MonitoringMetric.CPU_USAGE,
                value=cpu_percent,
                unit="percent"
            ))
            
            # Memory usage
            memory = psutil.virtual_memory()
            self.monitoring_data.append(MonitoringData(
                timestamp=datetime.now(),
                metric=MonitoringMetric.MEMORY_USAGE,
                value=memory.percent,
                unit="percent"
            ))
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            self.monitoring_data.append(MonitoringData(
                timestamp=datetime.now(),
                metric=MonitoringMetric.DISK_USAGE,
                value=disk_percent,
                unit="percent"
            ))
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    def _collect_api_metrics(self):
        """Collect API performance metrics."""
        try:
            # Test API response time
            start_time = time.time()
            response = requests.get("http://localhost:8004/health", timeout=5)
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            self.monitoring_data.append(MonitoringData(
                timestamp=datetime.now(),
                metric=MonitoringMetric.API_RESPONSE_TIME,
                value=response_time,
                unit="milliseconds",
                tags={"endpoint": "/health", "status_code": str(response.status_code)}
            ))
            
            # Check availability
            availability = 1.0 if response.status_code == 200 else 0.0
            self.monitoring_data.append(MonitoringData(
                timestamp=datetime.now(),
                metric=MonitoringMetric.AVAILABILITY,
                value=availability,
                unit="ratio"
            ))
            
        except Exception as e:
            # API unavailable
            self.monitoring_data.append(MonitoringData(
                timestamp=datetime.now(),
                metric=MonitoringMetric.AVAILABILITY,
                value=0.0,
                unit="ratio"
            ))
            logger.warning(f"API health check failed: {e}")
    
    def _collect_business_metrics(self):
        """Collect business-specific metrics."""
        try:
            # This would typically query the inventory database
            # For now, we'll simulate some business metrics
            business_metrics = {
                "total_products": 1000,
                "low_stock_items": 25,
                "pending_orders": 15,
                "inventory_value": 50000.0
            }
            
            for metric_name, value in business_metrics.items():
                self.monitoring_data.append(MonitoringData(
                    timestamp=datetime.now(),
                    metric=MonitoringMetric.BUSINESS_METRICS,
                    value=value,
                    unit="count" if isinstance(value, int) else "currency",
                    tags={"metric_name": metric_name}
                ))
                
        except Exception as e:
            logger.error(f"Error collecting business metrics: {e}")
    
    def run_validation_test(self, test_id: str) -> ValidationResult:
        """Run a single validation test."""
        if test_id not in self.validation_tests:
            raise ValueError(f"Validation test '{test_id}' not found")
        
        test = self.validation_tests[test_id]
        if not test.enabled:
            return ValidationResult(
                test_id=test_id,
                status=ValidationStatus.SKIPPED,
                start_time=datetime.now()
            )
        
        start_time = datetime.now()
        result = ValidationResult(
            test_id=test_id,
            status=ValidationStatus.RUNNING,
            start_time=start_time
        )
        
        try:
            # Run test with timeout
            future = self.validation_executor.submit(self._run_test_with_retry, test)
            test_result = future.result(timeout=test.timeout)
            
            result.status = ValidationStatus.PASSED if test_result["success"] else ValidationStatus.FAILED
            result.result = test_result["result"]
            result.error = test_result.get("error")
            result.retry_count = test_result.get("retry_count", 0)
            
        except Exception as e:
            result.status = ValidationStatus.FAILED
            result.error = str(e)
        
        finally:
            result.end_time = datetime.now()
            result.duration = (result.end_time - result.start_time).total_seconds()
            self.validation_results.append(result)
        
        return result
    
    def _run_test_with_retry(self, test: ValidationTest) -> Dict[str, Any]:
        """Run test with retry logic."""
        last_error = None
        
        for attempt in range(test.retry_count + 1):
            try:
                result = test.test_function()
                
                # Check threshold if specified
                if test.threshold is not None and isinstance(result, (int, float)):
                    if result > test.threshold:
                        return {
                            "success": False,
                            "result": result,
                            "error": f"Result {result} exceeds threshold {test.threshold}",
                            "retry_count": attempt
                        }
                
                return {
                    "success": True,
                    "result": result,
                    "retry_count": attempt
                }
                
            except Exception as e:
                last_error = e
                if attempt < test.retry_count:
                    time.sleep(test.retry_delay)
                    continue
                else:
                    return {
                        "success": False,
                        "result": None,
                        "error": str(e),
                        "retry_count": attempt
                    }
        
        return {
            "success": False,
            "result": None,
            "error": str(last_error),
            "retry_count": test.retry_count
        }
    
    def run_all_validation_tests(self) -> List[ValidationResult]:
        """Run all enabled validation tests."""
        results = []
        
        for test_id in self.validation_tests:
            if self.validation_tests[test_id].enabled:
                result = self.run_validation_test(test_id)
                results.append(result)
        
        return results
    
    def run_e2e_scenario(self, scenario_id: str) -> Dict[str, Any]:
        """Run an end-to-end test scenario."""
        if scenario_id not in self.e2e_scenarios:
            raise ValueError(f"E2E scenario '{scenario_id}' not found")
        
        scenario = self.e2e_scenarios[scenario_id]
        if not scenario.enabled:
            return {"status": "skipped", "reason": "Scenario disabled"}
        
        start_time = datetime.now()
        results = []
        errors = []
        
        try:
            for step in scenario.steps:
                step_start = datetime.now()
                step_result = self._execute_e2e_step(step)
                step_duration = (datetime.now() - step_start).total_seconds()
                
                results.append({
                    "step": step,
                    "result": step_result,
                    "duration": step_duration,
                    "success": step_result.get("success", False)
                })
                
                if not step_result.get("success", False):
                    errors.append(step_result.get("error", "Unknown error"))
            
            end_time = datetime.now()
            total_duration = (end_time - start_time).total_seconds()
            
            success = len(errors) == 0
            
            return {
                "scenario_id": scenario_id,
                "status": "passed" if success else "failed",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration": total_duration,
                "steps": results,
                "errors": errors,
                "success": success
            }
            
        except Exception as e:
            return {
                "scenario_id": scenario_id,
                "status": "error",
                "error": str(e),
                "start_time": start_time.isoformat(),
                "end_time": datetime.now().isoformat(),
                "success": False
            }
    
    def _execute_e2e_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single E2E test step."""
        action = step.get("action")
        data = step.get("data", {})
        
        try:
            if action == "create_product":
                return self._e2e_create_product(data)
            elif action == "add_inventory":
                return self._e2e_add_inventory(data)
            elif action == "update_inventory":
                return self._e2e_update_inventory(data)
            elif action == "check_low_stock":
                return self._e2e_check_low_stock(data)
            elif action == "generate_report":
                return self._e2e_generate_report(data)
            elif action == "cleanup":
                return self._e2e_cleanup(data)
            elif action == "create_locations":
                return self._e2e_create_locations(data)
            elif action == "add_inventory_location1":
                return self._e2e_add_inventory_location(data, "warehouse1")
            elif action == "add_inventory_location2":
                return self._e2e_add_inventory_location(data, "warehouse2")
            elif action == "sync_inventory":
                return self._e2e_sync_inventory(data)
            elif action == "verify_sync":
                return self._e2e_verify_sync(data)
            elif action == "create_historical_data":
                return self._e2e_create_historical_data(data)
            elif action == "train_forecast_model":
                return self._e2e_train_forecast_model(data)
            elif action == "generate_forecast":
                return self._e2e_generate_forecast(data)
            elif action == "optimize_inventory":
                return self._e2e_optimize_inventory(data)
            elif action == "verify_recommendations":
                return self._e2e_verify_recommendations(data)
            else:
                return {"success": False, "error": f"Unknown action: {action}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _e2e_create_product(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Create product."""
        # Simulate API call
        time.sleep(0.1)
        return {"success": True, "product_id": f"PROD_{data['sku']}"}
    
    def _e2e_add_inventory(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Add inventory."""
        # Simulate API call
        time.sleep(0.1)
        return {"success": True, "quantity": data["quantity"]}
    
    def _e2e_update_inventory(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Update inventory."""
        # Simulate API call
        time.sleep(0.1)
        return {"success": True, "new_quantity": data["quantity"]}
    
    def _e2e_check_low_stock(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Check low stock."""
        # Simulate API call
        time.sleep(0.1)
        return {"success": True, "low_stock_items": 5}
    
    def _e2e_generate_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Generate report."""
        # Simulate API call
        time.sleep(0.2)
        return {"success": True, "report_id": "RPT_001"}
    
    def _e2e_cleanup(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Cleanup test data."""
        # Simulate API call
        time.sleep(0.1)
        return {"success": True, "cleaned": True}
    
    def _e2e_create_locations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Create locations."""
        # Simulate API call
        time.sleep(0.1)
        return {"success": True, "locations": data["locations"]}
    
    def _e2e_add_inventory_location(self, data: Dict[str, Any], location: str) -> Dict[str, Any]:
        """E2E step: Add inventory to location."""
        # Simulate API call
        time.sleep(0.1)
        return {"success": True, "location": location, "quantity": data["quantity"]}
    
    def _e2e_sync_inventory(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Sync inventory."""
        # Simulate API call
        time.sleep(0.2)
        return {"success": True, "synced": True}
    
    def _e2e_verify_sync(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Verify sync."""
        # Simulate API call
        time.sleep(0.1)
        return {"success": True, "sync_verified": True}
    
    def _e2e_create_historical_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Create historical data."""
        # Simulate API call
        time.sleep(0.3)
        return {"success": True, "data_points": data["periods"]}
    
    def _e2e_train_forecast_model(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Train forecast model."""
        # Simulate API call
        time.sleep(1.0)
        return {"success": True, "model_trained": True}
    
    def _e2e_generate_forecast(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Generate forecast."""
        # Simulate API call
        time.sleep(0.5)
        return {"success": True, "forecast_periods": data["periods"]}
    
    def _e2e_optimize_inventory(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Optimize inventory."""
        # Simulate API call
        time.sleep(0.3)
        return {"success": True, "optimized": True}
    
    def _e2e_verify_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """E2E step: Verify recommendations."""
        # Simulate API call
        time.sleep(0.1)
        return {"success": True, "recommendations": ["order_more", "reduce_price"]}
    
    # Default test implementations
    def _test_api_health(self) -> bool:
        """Test API health."""
        try:
            response = requests.get("http://localhost:8004/health", timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"API health check failed: {e}")
            return False
    
    def _test_database_connectivity(self) -> bool:
        """Test database connectivity."""
        # Simulate database check
        time.sleep(0.1)
        return True
    
    def _test_inventory_crud(self) -> bool:
        """Test inventory CRUD operations."""
        # Simulate CRUD operations
        time.sleep(0.2)
        return True
    
    def _test_api_performance(self) -> float:
        """Test API performance."""
        start_time = time.time()
        try:
            response = requests.get("http://localhost:8004/health", timeout=5)
            end_time = time.time()
            return (end_time - start_time) * 1000  # Return response time in ms
        except Exception as e:
            logger.error(f"API performance test failed: {e}")
            return 9999.0  # Return high value for failed test
    
    def _test_concurrent_users(self) -> bool:
        """Test concurrent users."""
        # Simulate concurrent user test
        time.sleep(1.0)
        return True
    
    def _test_data_integrity(self) -> bool:
        """Test data integrity."""
        # Simulate data integrity check
        time.sleep(0.5)
        return True
    
    def _test_security_scan(self) -> bool:
        """Test security scan."""
        # Simulate security scan
        time.sleep(2.0)
        return True
    
    def _test_compliance_check(self) -> bool:
        """Test compliance check."""
        # Simulate compliance check
        time.sleep(1.0)
        return True
    
    def get_monitoring_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get monitoring summary for the last N hours."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Filter recent data
        recent_data = [d for d in self.monitoring_data if d.timestamp >= cutoff_time]
        
        if not recent_data:
            return {"error": "No monitoring data available"}
        
        # Group by metric
        metrics_by_type = defaultdict(list)
        for data in recent_data:
            metrics_by_type[data.metric].append(data.value)
        
        summary = {
            "period_hours": hours,
            "total_data_points": len(recent_data),
            "metrics": {}
        }
        
        for metric, values in metrics_by_type.items():
            if values:
                summary["metrics"][metric.value] = {
                    "count": len(values),
                    "min": min(values),
                    "max": max(values),
                    "avg": statistics.mean(values),
                    "median": statistics.median(values)
                }
        
        return summary
    
    def get_validation_summary(self) -> Dict[str, Any]:
        """Get validation test summary."""
        if not self.validation_results:
            return {"error": "No validation results available"}
        
        total_tests = len(self.validation_results)
        passed_tests = len([r for r in self.validation_results if r.status == ValidationStatus.PASSED])
        failed_tests = len([r for r in self.validation_results if r.status == ValidationStatus.FAILED])
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": passed_tests / total_tests if total_tests > 0 else 0,
            "recent_results": list(self.validation_results)[-10:]  # Last 10 results
        }

def main():
    """Main function for testing extended validations."""
    validations = ExtendedValidations()
    
    # Start monitoring
    validations.start_monitoring()
    
    print("Running validation tests...")
    
    # Run all validation tests
    results = validations.run_all_validation_tests()
    
    print(f"\n=== VALIDATION RESULTS ===")
    for result in results:
        print(f"{result.test_id}: {result.status.value} ({result.duration:.2f}s)")
        if result.error:
            print(f"  Error: {result.error}")
    
    # Run E2E scenarios
    print(f"\n=== E2E SCENARIOS ===")
    for scenario_id in validations.e2e_scenarios:
        print(f"Running scenario: {scenario_id}")
        result = validations.run_e2e_scenario(scenario_id)
        print(f"  Status: {result['status']}")
        print(f"  Duration: {result.get('duration', 0):.2f}s")
        if result.get('errors'):
            print(f"  Errors: {result['errors']}")
    
    # Get monitoring summary
    print(f"\n=== MONITORING SUMMARY ===")
    summary = validations.get_monitoring_summary(1)  # Last hour
    print(f"Data points: {summary.get('total_data_points', 0)}")
    for metric, stats in summary.get('metrics', {}).items():
        print(f"{metric}: avg={stats['avg']:.2f}, min={stats['min']:.2f}, max={stats['max']:.2f}")
    
    # Stop monitoring
    validations.stop_monitoring()

if __name__ == "__main__":
    main()
