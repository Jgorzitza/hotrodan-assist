"""
End-to-End Validation Suite for Sales Analytics Platform

This suite provides comprehensive E2E testing for the entire Sales Analytics Platform
including API endpoints, data processing, and integration validation.
"""

import requests
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any
import concurrent.futures
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/e2e_validation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SalesAnalyticsE2EValidator:
    """End-to-end validation suite for Sales Analytics Platform."""
    
    def __init__(self, api_url: str = "http://localhost:8005"):
        self.api_url = api_url
        self.test_results = []
        self.start_time = datetime.now()
        
    def run_full_validation(self) -> Dict[str, Any]:
        """Run complete E2E validation suite."""
        logger.info("Starting comprehensive E2E validation")
        
        validation_results = {
            "start_time": self.start_time.isoformat(),
            "api_health": self._test_api_health(),
            "endpoint_functionality": self._test_all_endpoints(),
            "data_processing": self._test_data_processing(),
            "performance_validation": self._test_performance(),
            "concurrent_requests": self._test_concurrent_requests(),
            "error_handling": self._test_error_handling(),
            "integration_validation": self._test_integration(),
            "end_time": datetime.now().isoformat()
        }
        
        # Calculate overall success rate
        total_tests = sum(len(result.get('tests', [])) for result in validation_results.values() if isinstance(result, dict) and 'tests' in result)
        passed_tests = sum(len([t for t in result.get('tests', []) if t.get('passed', False)]) for result in validation_results.values() if isinstance(result, dict) and 'tests' in result)
        
        validation_results["overall"] = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "validation_status": "PASSED" if passed_tests == total_tests else "FAILED"
        }
        
        logger.info(f"E2E validation completed - Success rate: {validation_results['overall']['success_rate']:.1f}%")
        return validation_results
    
    def _test_api_health(self) -> Dict[str, Any]:
        """Test API health and basic connectivity."""
        logger.info("Testing API health")
        tests = []
        
        # Test root endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_url}/", timeout=10)
            response_time = time.time() - start_time
            
            test_result = {
                "name": "root_endpoint",
                "passed": response.status_code == 200,
                "response_time": response_time,
                "status_code": response.status_code,
                "details": response.json() if response.status_code == 200 else None
            }
            tests.append(test_result)
            
        except Exception as e:
            tests.append({
                "name": "root_endpoint",
                "passed": False,
                "error": str(e)
            })
        
        # Test health endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_url}/health", timeout=10)
            response_time = time.time() - start_time
            
            test_result = {
                "name": "health_endpoint",
                "passed": response.status_code == 200,
                "response_time": response_time,
                "status_code": response.status_code,
                "details": response.json() if response.status_code == 200 else None
            }
            tests.append(test_result)
            
        except Exception as e:
            tests.append({
                "name": "health_endpoint",
                "passed": False,
                "error": str(e)
            })
        
        return {"tests": tests, "summary": f"{len([t for t in tests if t['passed']])}/{len(tests)} health tests passed"}
    
    def _test_all_endpoints(self) -> Dict[str, Any]:
        """Test all analytics endpoints."""
        logger.info("Testing all analytics endpoints")
        tests = []
        
        endpoints = [
            {
                "name": "channel_campaign_metrics",
                "url": "/api/sales/channel-campaign-metrics",
                "method": "POST",
                "data": {
                    "transactions": [
                        {"amount": 100, "channel": "email"},
                        {"amount": 200, "channel": "social"},
                        {"amount": 150, "channel": "paid"}
                    ],
                    "channels": ["email", "social", "paid"]
                }
            },
            {
                "name": "attribution_models",
                "url": "/api/sales/attribution-models",
                "method": "POST",
                "data": {
                    "transactions": [{"amount": 100, "customer_id": 1}],
                    "touchpoints": [{"customer_id": 1, "channel": "email"}]
                }
            },
            {
                "name": "funnel_dropoff",
                "url": "/api/sales/funnel-dropoff",
                "method": "POST",
                "data": {
                    "funnel_steps": [
                        {"name": "landing"},
                        {"name": "signup"},
                        {"name": "checkout"},
                        {"name": "purchase"}
                    ],
                    "user_sessions": [
                        {"step": "landing", "user_id": 1},
                        {"step": "signup", "user_id": 1}
                    ]
                }
            },
            {
                "name": "forecast_rollup",
                "url": "/api/sales/forecast-rollup",
                "method": "POST",
                "data": {
                    "historical_data": [
                        {"date": "2024-01-01", "value": 1000},
                        {"date": "2024-01-02", "value": 1200},
                        {"date": "2024-01-03", "value": 1100}
                    ],
                    "forecast_periods": 3
                }
            },
            {
                "name": "pricing_elasticity",
                "url": "/api/sales/pricing-elasticity",
                "method": "POST",
                "data": {
                    "price_data": [
                        {"price": 100, "quantity": 50, "date": "2024-01-01"},
                        {"price": 110, "quantity": 45, "date": "2024-01-02"},
                        {"price": 120, "quantity": 40, "date": "2024-01-03"}
                    ]
                }
            }
        ]
        
        for endpoint in endpoints:
            try:
                start_time = time.time()
                
                if endpoint["method"] == "POST":
                    response = requests.post(
                        f"{self.api_url}{endpoint['url']}",
                        json=endpoint["data"],
                        timeout=10
                    )
                else:
                    response = requests.get(f"{self.api_url}{endpoint['url']}", timeout=10)
                
                response_time = time.time() - start_time
                
                test_result = {
                    "name": endpoint["name"],
                    "passed": response.status_code == 200,
                    "response_time": response_time,
                    "status_code": response.status_code,
                    "response_size": len(response.content),
                    "details": response.json() if response.status_code == 200 else response.text
                }
                tests.append(test_result)
                
                if test_result["passed"]:
                    logger.info(f"✓ {endpoint['name']} - {response_time:.3f}s")
                else:
                    logger.warning(f"✗ {endpoint['name']} - HTTP {response.status_code}")
                    
            except Exception as e:
                tests.append({
                    "name": endpoint["name"],
                    "passed": False,
                    "error": str(e)
                })
                logger.error(f"✗ {endpoint['name']} - {str(e)}")
        
        return {"tests": tests, "summary": f"{len([t for t in tests if t['passed']])}/{len(tests)} endpoint tests passed"}
    
    def _test_data_processing(self) -> Dict[str, Any]:
        """Test data processing accuracy and edge cases."""
        logger.info("Testing data processing")
        tests = []
        
        # Test with various data sizes
        test_cases = [
            {"name": "small_dataset", "transactions": [{"amount": 100, "channel": "email"}]},
            {"name": "medium_dataset", "transactions": [{"amount": i*10, "channel": f"channel_{i%3}"} for i in range(100)]},
            {"name": "large_dataset", "transactions": [{"amount": i*10, "channel": f"channel_{i%5}"} for i in range(1000)]},
            {"name": "empty_dataset", "transactions": []},
            {"name": "malformed_data", "transactions": [{"amount": "invalid", "channel": "email"}]}
        ]
        
        for test_case in test_cases:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.api_url}/api/sales/channel-campaign-metrics",
                    json={"transactions": test_case["transactions"]},
                    timeout=30
                )
                response_time = time.time() - start_time
                
                # Validate response structure
                if response.status_code == 200:
                    data = response.json()
                    has_metrics = "metrics" in data
                    has_success = "success" in data
                    test_result = {
                        "name": test_case["name"],
                        "passed": has_metrics and has_success,
                        "response_time": response_time,
                        "data_size": len(test_case["transactions"]),
                        "details": data
                    }
                else:
                    test_result = {
                        "name": test_case["name"],
                        "passed": False,
                        "response_time": response_time,
                        "status_code": response.status_code,
                        "error": response.text
                    }
                
                tests.append(test_result)
                
            except Exception as e:
                tests.append({
                    "name": test_case["name"],
                    "passed": False,
                    "error": str(e)
                })
        
        return {"tests": tests, "summary": f"{len([t for t in tests if t['passed']])}/{len(tests)} data processing tests passed"}
    
    def _test_performance(self) -> Dict[str, Any]:
        """Test performance under various loads."""
        logger.info("Testing performance")
        tests = []
        
        # Test response times
        response_times = []
        for i in range(10):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.api_url}/api/sales/channel-campaign-metrics",
                    json={"transactions": [{"amount": 100, "channel": "email"}]},
                    timeout=10
                )
                response_time = time.time() - start_time
                response_times.append(response_time)
                
            except Exception as e:
                logger.error(f"Performance test error: {e}")
        
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
            
            tests.append({
                "name": "response_time_consistency",
                "passed": avg_response_time < 1.0,  # Should be under 1 second
                "avg_response_time": avg_response_time,
                "max_response_time": max_response_time,
                "min_response_time": min_response_time,
                "details": f"Average: {avg_response_time:.3f}s, Max: {max_response_time:.3f}s"
            })
        
        return {"tests": tests, "summary": f"{len([t for t in tests if t['passed']])}/{len(tests)} performance tests passed"}
    
    def _test_concurrent_requests(self) -> Dict[str, Any]:
        """Test concurrent request handling."""
        logger.info("Testing concurrent requests")
        tests = []
        
        def make_request(request_id):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.api_url}/api/sales/channel-campaign-metrics",
                    json={"transactions": [{"amount": 100, "channel": "email"}]},
                    timeout=10
                )
                response_time = time.time() - start_time
                return {
                    "request_id": request_id,
                    "success": response.status_code == 200,
                    "response_time": response_time,
                    "status_code": response.status_code
                }
            except Exception as e:
                return {
                    "request_id": request_id,
                    "success": False,
                    "error": str(e)
                }
        
        # Test with 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request, i) for i in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        successful_requests = len([r for r in results if r["success"]])
        avg_response_time = sum(r["response_time"] for r in results if r["success"]) / successful_requests if successful_requests > 0 else 0
        
        tests.append({
            "name": "concurrent_requests",
            "passed": successful_requests >= 8,  # At least 80% should succeed
            "successful_requests": successful_requests,
            "total_requests": len(results),
            "avg_response_time": avg_response_time,
            "details": f"{successful_requests}/{len(results)} concurrent requests succeeded"
        })
        
        return {"tests": tests, "summary": f"{len([t for t in tests if t['passed']])}/{len(tests)} concurrent request tests passed"}
    
    def _test_error_handling(self) -> Dict[str, Any]:
        """Test error handling and edge cases."""
        logger.info("Testing error handling")
        tests = []
        
        error_test_cases = [
            {"name": "invalid_json", "data": "invalid json", "expected_status": 422},
            {"name": "missing_required_field", "data": {}, "expected_status": 200},  # Should handle gracefully
            {"name": "null_data", "data": None, "expected_status": 422},
            {"name": "very_large_payload", "data": {"transactions": [{"amount": 100, "channel": "email"}] * 10000}, "expected_status": 200}
        ]
        
        for test_case in error_test_cases:
            try:
                if test_case["data"] is None:
                    response = requests.post(f"{self.api_url}/api/sales/channel-campaign-metrics", timeout=10)
                elif isinstance(test_case["data"], str):
                    response = requests.post(
                        f"{self.api_url}/api/sales/channel-campaign-metrics",
                        data=test_case["data"],
                        headers={"Content-Type": "application/json"},
                        timeout=10
                    )
                else:
                    response = requests.post(
                        f"{self.api_url}/api/sales/channel-campaign-metrics",
                        json=test_case["data"],
                        timeout=30
                    )
                
                test_result = {
                    "name": test_case["name"],
                    "passed": response.status_code == test_case["expected_status"],
                    "status_code": response.status_code,
                    "expected_status": test_case["expected_status"],
                    "details": response.text[:200] if response.text else "No response body"
                }
                tests.append(test_result)
                
            except Exception as e:
                tests.append({
                    "name": test_case["name"],
                    "passed": False,
                    "error": str(e)
                })
        
        return {"tests": tests, "summary": f"{len([t for t in tests if t['passed']])}/{len(tests)} error handling tests passed"}
    
    def _test_integration(self) -> Dict[str, Any]:
        """Test integration between different components."""
        logger.info("Testing integration")
        tests = []
        
        # Test data flow between endpoints
        try:
            # First, get channel metrics
            channel_response = requests.post(
                f"{self.api_url}/api/sales/channel-campaign-metrics",
                json={"transactions": [{"amount": 100, "channel": "email"}]},
                timeout=10
            )
            
            if channel_response.status_code == 200:
                channel_data = channel_response.json()
                
                # Use the same data for attribution analysis
                attribution_response = requests.post(
                    f"{self.api_url}/api/sales/attribution-models",
                    json={
                        "transactions": [{"amount": 100, "customer_id": 1}],
                        "touchpoints": [{"customer_id": 1, "channel": "email"}]
                    },
                    timeout=10
                )
                
                integration_success = (
                    channel_response.status_code == 200 and
                    attribution_response.status_code == 200 and
                    "metrics" in channel_data and
                    "attribution_models" in attribution_response.json()
                )
                
                tests.append({
                    "name": "data_flow_integration",
                    "passed": integration_success,
                    "channel_status": channel_response.status_code,
                    "attribution_status": attribution_response.status_code,
                    "details": "Data flows correctly between endpoints"
                })
            else:
                tests.append({
                    "name": "data_flow_integration",
                    "passed": False,
                    "error": "Channel metrics endpoint failed"
                })
                
        except Exception as e:
            tests.append({
                "name": "data_flow_integration",
                "passed": False,
                "error": str(e)
            })
        
        return {"tests": tests, "summary": f"{len([t for t in tests if t['passed']])}/{len(tests)} integration tests passed"}

if __name__ == "__main__":
    validator = SalesAnalyticsE2EValidator()
    
    try:
        results = validator.run_full_validation()
        
        # Save results to file
        with open(f"logs/e2e_validation_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
            json.dump(results, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("E2E VALIDATION RESULTS")
        print("="*60)
        print(f"Overall Status: {results['overall']['validation_status']}")
        print(f"Success Rate: {results['overall']['success_rate']:.1f}%")
        print(f"Tests Passed: {results['overall']['passed_tests']}/{results['overall']['total_tests']}")
        print("="*60)
        
    except Exception as e:
        logger.error(f"E2E validation failed: {e}")
