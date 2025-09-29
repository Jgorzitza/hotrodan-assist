"""
Comprehensive test suite for extended validations.

Tests long-term monitoring, end-to-end testing, and
continuous validation capabilities for inventory management.
"""
import pytest
import sys
import os
import time
import threading
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

# Add sync directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'sync'))

from extended_validations import (
    ExtendedValidations, ValidationType, ValidationStatus, MonitoringMetric,
    ValidationTest, ValidationResult, MonitoringData, E2ETestScenario
)

class TestExtendedValidations:
    def setup_method(self):
        self.validations = ExtendedValidations()
    
    def test_initialization(self):
        """Test extended validations initialization."""
        assert len(self.validations.validation_tests) == 8  # Default tests
        assert len(self.validations.e2e_scenarios) == 3  # Default scenarios
        assert not self.validations.is_monitoring
        assert len(self.validations.validation_results) == 0
        assert len(self.validations.monitoring_data) == 0
    
    def test_add_validation_test(self):
        """Test adding validation test."""
        test = ValidationTest(
            test_id="custom_test",
            name="Custom Test",
            description="A custom validation test",
            validation_type=ValidationType.FUNCTIONAL,
            test_function=lambda: True
        )
        
        self.validations.add_validation_test(test)
        
        assert "custom_test" in self.validations.validation_tests
        assert self.validations.validation_tests["custom_test"].name == "Custom Test"
    
    def test_add_e2e_scenario(self):
        """Test adding E2E scenario."""
        scenario = E2ETestScenario(
            scenario_id="custom_scenario",
            name="Custom Scenario",
            description="A custom E2E scenario",
            steps=[{"action": "test", "data": {}}],
            expected_outcome="Success"
        )
        
        self.validations.add_e2e_scenario(scenario)
        
        assert "custom_scenario" in self.validations.e2e_scenarios
        assert self.validations.e2e_scenarios["custom_scenario"].name == "Custom Scenario"
    
    def test_monitoring_start_stop(self):
        """Test monitoring start and stop."""
        # Start monitoring
        self.validations.start_monitoring()
        assert self.validations.is_monitoring == True
        assert self.validations.monitoring_thread is not None
        
        # Wait a bit for monitoring to collect data
        time.sleep(2)
        
        # Stop monitoring
        self.validations.stop_monitoring()
        assert self.validations.is_monitoring == False
    
    def test_monitoring_data_collection(self):
        """Test monitoring data collection."""
        # Start monitoring
        self.validations.start_monitoring()
        
        # Wait for data collection
        time.sleep(3)
        
        # Check if data was collected
        assert len(self.validations.monitoring_data) > 0
        
        # Check data types
        for data in self.validations.monitoring_data:
            assert isinstance(data, MonitoringData)
            assert isinstance(data.timestamp, datetime)
            assert isinstance(data.metric, MonitoringMetric)
            assert isinstance(data.value, (int, float))
            assert isinstance(data.unit, str)
        
        # Stop monitoring
        self.validations.stop_monitoring()
    
    def test_run_validation_test(self):
        """Test running a single validation test."""
        # Test with a simple test
        result = self.validations.run_validation_test("api_health_check")
        
        assert isinstance(result, ValidationResult)
        assert result.test_id == "api_health_check"
        assert result.status in [ValidationStatus.PASSED, ValidationStatus.FAILED]
        assert result.start_time is not None
        assert result.end_time is not None
        assert result.duration is not None
    
    def test_run_validation_test_skipped(self):
        """Test running a disabled validation test."""
        # Disable a test
        self.validations.validation_tests["api_health_check"].enabled = False
        
        result = self.validations.run_validation_test("api_health_check")
        
        assert result.status == ValidationStatus.SKIPPED
        assert result.end_time is None
        assert result.duration is None
    
    def test_run_all_validation_tests(self):
        """Test running all validation tests."""
        results = self.validations.run_all_validation_tests()
        
        assert len(results) == 8  # All default tests
        assert all(isinstance(r, ValidationResult) for r in results)
        assert all(r.test_id in self.validations.validation_tests for r in results)
    
    def test_run_e2e_scenario(self):
        """Test running an E2E scenario."""
        result = self.validations.run_e2e_scenario("complete_inventory_workflow")
        
        assert "scenario_id" in result
        assert "status" in result
        assert "start_time" in result
        assert "end_time" in result
        assert "duration" in result
        assert "steps" in result
        assert "success" in result
        
        assert result["scenario_id"] == "complete_inventory_workflow"
        assert result["status"] in ["passed", "failed", "error"]
        assert len(result["steps"]) == 6  # Number of steps in the scenario
    
    def test_run_e2e_scenario_skipped(self):
        """Test running a disabled E2E scenario."""
        # Disable scenario
        self.validations.e2e_scenarios["complete_inventory_workflow"].enabled = False
        
        result = self.validations.run_e2e_scenario("complete_inventory_workflow")
        
        assert result["status"] == "skipped"
        assert "reason" in result
    
    def test_e2e_step_execution(self):
        """Test E2E step execution."""
        # Test create product step
        step = {"action": "create_product", "data": {"sku": "TEST001", "name": "Test Product"}}
        result = self.validations._execute_e2e_step(step)
        
        assert "success" in result
        assert result["success"] == True
        assert "product_id" in result
        
        # Test unknown action
        step = {"action": "unknown_action", "data": {}}
        result = self.validations._execute_e2e_step(step)
        
        assert "success" in result
        assert result["success"] == False
        assert "error" in result
    
    def test_get_monitoring_summary(self):
        """Test getting monitoring summary."""
        # Add some test monitoring data
        now = datetime.now()
        self.validations.monitoring_data.append(MonitoringData(
            timestamp=now,
            metric=MonitoringMetric.CPU_USAGE,
            value=50.0,
            unit="percent"
        ))
        self.validations.monitoring_data.append(MonitoringData(
            timestamp=now,
            metric=MonitoringMetric.MEMORY_USAGE,
            value=75.0,
            unit="percent"
        ))
        
        summary = self.validations.get_monitoring_summary(1)
        
        assert "period_hours" in summary
        assert "total_data_points" in summary
        assert "metrics" in summary
        assert summary["total_data_points"] == 2
        assert "CPU_USAGE" in summary["metrics"]
        assert "MEMORY_USAGE" in summary["metrics"]
    
    def test_get_monitoring_summary_no_data(self):
        """Test getting monitoring summary with no data."""
        # Clear monitoring data
        self.validations.monitoring_data.clear()
        
        summary = self.validations.get_monitoring_summary(1)
        
        assert "error" in summary
        assert summary["error"] == "No monitoring data available"
    
    def test_get_validation_summary(self):
        """Test getting validation summary."""
        # Add some test results
        result1 = ValidationResult(
            test_id="test1",
            status=ValidationStatus.PASSED,
            start_time=datetime.now(),
            end_time=datetime.now(),
            duration=1.0
        )
        result2 = ValidationResult(
            test_id="test2",
            status=ValidationStatus.FAILED,
            start_time=datetime.now(),
            end_time=datetime.now(),
            duration=2.0
        )
        
        self.validations.validation_results.append(result1)
        self.validations.validation_results.append(result2)
        
        summary = self.validations.get_validation_summary()
        
        assert "total_tests" in summary
        assert "passed_tests" in summary
        assert "failed_tests" in summary
        assert "success_rate" in summary
        assert "recent_results" in summary
        
        assert summary["total_tests"] == 2
        assert summary["passed_tests"] == 1
        assert summary["failed_tests"] == 1
        assert summary["success_rate"] == 0.5
    
    def test_get_validation_summary_no_data(self):
        """Test getting validation summary with no data."""
        # Clear validation results
        self.validations.validation_results.clear()
        
        summary = self.validations.get_validation_summary()
        
        assert "error" in summary
        assert summary["error"] == "No validation results available"

class TestValidationTest:
    def test_validation_test_creation(self):
        """Test validation test creation."""
        test = ValidationTest(
            test_id="test_001",
            name="Test 001",
            description="A test",
            validation_type=ValidationType.FUNCTIONAL,
            test_function=lambda: True,
            timeout=60,
            retry_count=2,
            retry_delay=5,
            dependencies=["dep1", "dep2"],
            expected_result=True,
            threshold=1.0,
            enabled=True
        )
        
        assert test.test_id == "test_001"
        assert test.name == "Test 001"
        assert test.description == "A test"
        assert test.validation_type == ValidationType.FUNCTIONAL
        assert test.timeout == 60
        assert test.retry_count == 2
        assert test.retry_delay == 5
        assert test.dependencies == ["dep1", "dep2"]
        assert test.expected_result == True
        assert test.threshold == 1.0
        assert test.enabled == True

class TestE2ETestScenario:
    def test_e2e_scenario_creation(self):
        """Test E2E scenario creation."""
        scenario = E2ETestScenario(
            scenario_id="scenario_001",
            name="Scenario 001",
            description="A scenario",
            steps=[
                {"action": "step1", "data": {"key": "value"}},
                {"action": "step2", "data": {"key": "value2"}}
            ],
            expected_outcome="Success",
            timeout=300,
            enabled=True
        )
        
        assert scenario.scenario_id == "scenario_001"
        assert scenario.name == "Scenario 001"
        assert scenario.description == "A scenario"
        assert len(scenario.steps) == 2
        assert scenario.expected_outcome == "Success"
        assert scenario.timeout == 300
        assert scenario.enabled == True

def test_extended_validations_performance():
    """Test extended validations performance."""
    validations = ExtendedValidations()
    
    # Test monitoring performance
    import time
    start_time = time.time()
    
    validations.start_monitoring()
    time.sleep(5)  # Let it collect data
    validations.stop_monitoring()
    
    end_time = time.time()
    monitoring_time = end_time - start_time
    
    assert len(validations.monitoring_data) > 0
    assert monitoring_time < 10.0  # Should complete in less than 10 seconds
    
    print(f"Monitoring Performance: Collected {len(validations.monitoring_data)} data points in {monitoring_time:.2f} seconds")
    
    # Test validation performance
    start_time = time.time()
    
    results = validations.run_all_validation_tests()
    
    end_time = time.time()
    validation_time = end_time - start_time
    
    assert len(results) == 8  # All default tests
    assert validation_time < 30.0  # Should complete in less than 30 seconds
    
    print(f"Validation Performance: Ran {len(results)} tests in {validation_time:.2f} seconds")
    
    # Test E2E performance
    start_time = time.time()
    
    for scenario_id in validations.e2e_scenarios:
        result = validations.run_e2e_scenario(scenario_id)
        assert result["status"] in ["passed", "failed", "error"]
    
    end_time = time.time()
    e2e_time = end_time - start_time
    
    assert e2e_time < 20.0  # Should complete in less than 20 seconds
    
    print(f"E2E Performance: Ran {len(validations.e2e_scenarios)} scenarios in {e2e_time:.2f} seconds")

def test_error_handling():
    """Test error handling in extended validations."""
    validations = ExtendedValidations()
    
    # Test with invalid test ID
    try:
        result = validations.run_validation_test("invalid_test")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "not found" in str(e)
    
    # Test with invalid scenario ID
    try:
        result = validations.run_e2e_scenario("invalid_scenario")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "not found" in str(e)
    
    # Test monitoring with errors
    validations.start_monitoring()
    time.sleep(2)
    validations.stop_monitoring()
    
    # Should not crash even with errors
    assert True

def test_concurrent_operations():
    """Test concurrent operations."""
    validations = ExtendedValidations()
    
    # Test concurrent validation tests
    import threading
    import time
    
    results = []
    
    def run_test():
        result = validations.run_validation_test("api_health_check")
        results.append(result)
    
    # Start multiple threads
    threads = []
    for _ in range(5):
        thread = threading.Thread(target=run_test)
        threads.append(thread)
        thread.start()
    
    # Wait for all threads
    for thread in threads:
        thread.join()
    
    # Check results
    assert len(results) == 5
    assert all(isinstance(r, ValidationResult) for r in results)
    
    print("✅ Concurrent operations test passed!")

if __name__ == "__main__":
    # Run performance tests
    test_extended_validations_performance()
    test_error_handling()
    test_concurrent_operations()
    print("✅ All extended validations tests passed!")
    print("🎉 Extended validations system fully operational!")
