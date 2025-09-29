"""
Performance Benchmark Suite for Sales Analytics Platform

This suite provides comprehensive performance testing including load testing,
stress testing, and scalability validation.
"""

import requests
import time
import json
import logging
import concurrent.futures
import statistics
from datetime import datetime
from typing import Dict, List, Any
import threading
import psutil
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/performance_benchmarks.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SalesAnalyticsPerformanceBenchmark:
    """Performance benchmark suite for Sales Analytics Platform."""
    
    def __init__(self, api_url: str = "http://localhost:8005"):
        self.api_url = api_url
        self.results = {}
        
    def run_comprehensive_benchmarks(self) -> Dict[str, Any]:
        """Run comprehensive performance benchmarks."""
        logger.info("Starting comprehensive performance benchmarks")
        
        benchmark_results = {
            "start_time": datetime.now().isoformat(),
            "baseline_performance": self._test_baseline_performance(),
            "load_testing": self._test_load_performance(),
            "stress_testing": self._test_stress_performance(),
            "concurrent_processing": self._test_concurrent_processing(),
            "memory_usage": self._test_memory_usage(),
            "response_time_consistency": self._test_response_time_consistency(),
            "throughput_analysis": self._test_throughput_analysis(),
            "scalability_validation": self._test_scalability(),
            "end_time": datetime.now().isoformat()
        }
        
        # Calculate overall performance score
        performance_score = self._calculate_performance_score(benchmark_results)
        benchmark_results["overall"] = {
            "performance_score": performance_score,
            "status": "EXCELLENT" if performance_score >= 90 else "GOOD" if performance_score >= 70 else "NEEDS_IMPROVEMENT"
        }
        
        logger.info(f"Performance benchmarks completed - Score: {performance_score}/100")
        return benchmark_results
    
    def _test_baseline_performance(self) -> Dict[str, Any]:
        """Test baseline performance metrics."""
        logger.info("Testing baseline performance")
        
        # Test single request performance
        response_times = []
        success_count = 0
        
        for i in range(20):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.api_url}/api/sales/channel-campaign-metrics",
                    json={"transactions": [{"amount": 100, "channel": "email"}]},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    response_times.append(response_time)
                    success_count += 1
                    
            except Exception as e:
                logger.error(f"Baseline test error: {e}")
        
        if response_times:
            return {
                "avg_response_time": statistics.mean(response_times),
                "min_response_time": min(response_times),
                "max_response_time": max(response_times),
                "p95_response_time": sorted(response_times)[int(len(response_times) * 0.95)],
                "success_rate": success_count / 20 * 100,
                "requests_per_second": 1 / statistics.mean(response_times) if response_times else 0
            }
        else:
            return {"error": "No successful requests"}
    
    def _test_load_performance(self) -> Dict[str, Any]:
        """Test performance under normal load."""
        logger.info("Testing load performance")
        
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
        
        # Test with 50 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            futures = [executor.submit(make_request, i) for i in range(50)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        successful_requests = [r for r in results if r["success"]]
        response_times = [r["response_time"] for r in successful_requests]
        
        if response_times:
            return {
                "total_requests": len(results),
                "successful_requests": len(successful_requests),
                "success_rate": len(successful_requests) / len(results) * 100,
                "avg_response_time": statistics.mean(response_times),
                "max_response_time": max(response_times),
                "throughput_rps": len(successful_requests) / max(response_times) if response_times else 0
            }
        else:
            return {"error": "No successful requests in load test"}
    
    def _test_stress_performance(self) -> Dict[str, Any]:
        """Test performance under stress conditions."""
        logger.info("Testing stress performance")
        
        def stress_request(request_id):
            try:
                # Use larger dataset for stress testing
                transactions = [{"amount": i*10, "channel": f"channel_{i%5}"} for i in range(100)]
                
                start_time = time.time()
                response = requests.post(
                    f"{self.api_url}/api/sales/channel-campaign-metrics",
                    json={"transactions": transactions},
                    timeout=30
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
        
        # Test with 100 concurrent stress requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
            futures = [executor.submit(stress_request, i) for i in range(100)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        successful_requests = [r for r in results if r["success"]]
        response_times = [r["response_time"] for r in successful_requests]
        
        return {
            "total_requests": len(results),
            "successful_requests": len(successful_requests),
            "success_rate": len(successful_requests) / len(results) * 100,
            "avg_response_time": statistics.mean(response_times) if response_times else 0,
            "max_response_time": max(response_times) if response_times else 0,
            "stress_test_status": "PASSED" if len(successful_requests) >= 80 else "FAILED"
        }
    
    def _test_concurrent_processing(self) -> Dict[str, Any]:
        """Test concurrent request processing capabilities."""
        logger.info("Testing concurrent processing")
        
        def concurrent_request(request_id):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.api_url}/api/sales/attribution-models",
                    json={
                        "transactions": [{"amount": 100, "customer_id": request_id}],
                        "touchpoints": [{"customer_id": request_id, "channel": "email"}]
                    },
                    timeout=10
                )
                response_time = time.time() - start_time
                return {
                    "request_id": request_id,
                    "success": response.status_code == 200,
                    "response_time": response_time
                }
            except Exception as e:
                return {
                    "request_id": request_id,
                    "success": False,
                    "error": str(e)
                }
        
        # Test with increasing concurrency levels
        concurrency_levels = [10, 25, 50, 75, 100]
        results = {}
        
        for level in concurrency_levels:
            start_time = time.time()
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=level) as executor:
                futures = [executor.submit(concurrent_request, i) for i in range(level)]
                level_results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            total_time = time.time() - start_time
            successful_requests = [r for r in level_results if r["success"]]
            
            results[f"level_{level}"] = {
                "total_requests": len(level_results),
                "successful_requests": len(successful_requests),
                "success_rate": len(successful_requests) / len(level_results) * 100,
                "total_time": total_time,
                "throughput": len(successful_requests) / total_time if total_time > 0 else 0
            }
        
        return results
    
    def _test_memory_usage(self) -> Dict[str, Any]:
        """Test memory usage patterns."""
        logger.info("Testing memory usage")
        
        # Get initial memory usage
        initial_memory = psutil.virtual_memory().used / 1024 / 1024  # MB
        
        # Make multiple requests to test memory usage
        for i in range(50):
            try:
                requests.post(
                    f"{self.api_url}/api/sales/channel-campaign-metrics",
                    json={"transactions": [{"amount": 100, "channel": "email"}]},
                    timeout=10
                )
            except Exception as e:
                logger.error(f"Memory test request error: {e}")
        
        # Get final memory usage
        final_memory = psutil.virtual_memory().used / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        return {
            "initial_memory_mb": initial_memory,
            "final_memory_mb": final_memory,
            "memory_increase_mb": memory_increase,
            "memory_efficiency": "GOOD" if memory_increase < 100 else "NEEDS_IMPROVEMENT"
        }
    
    def _test_response_time_consistency(self) -> Dict[str, Any]:
        """Test response time consistency over time."""
        logger.info("Testing response time consistency")
        
        response_times = []
        intervals = []
        
        for i in range(100):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.api_url}/api/sales/channel-campaign-metrics",
                    json={"transactions": [{"amount": 100, "channel": "email"}]},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    response_times.append(response_time)
                    intervals.append(i)
                
                time.sleep(0.1)  # Small delay between requests
                
            except Exception as e:
                logger.error(f"Consistency test error: {e}")
        
        if response_times:
            # Calculate consistency metrics
            mean_response_time = statistics.mean(response_times)
            std_deviation = statistics.stdev(response_times) if len(response_times) > 1 else 0
            coefficient_of_variation = std_deviation / mean_response_time if mean_response_time > 0 else 0
            
            return {
                "total_requests": len(response_times),
                "mean_response_time": mean_response_time,
                "std_deviation": std_deviation,
                "coefficient_of_variation": coefficient_of_variation,
                "consistency_rating": "EXCELLENT" if coefficient_of_variation < 0.1 else "GOOD" if coefficient_of_variation < 0.3 else "NEEDS_IMPROVEMENT"
            }
        else:
            return {"error": "No successful requests for consistency test"}
    
    def _test_throughput_analysis(self) -> Dict[str, Any]:
        """Test throughput under different conditions."""
        logger.info("Testing throughput analysis")
        
        def throughput_request(request_id):
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
                    "timestamp": time.time()
                }
            except Exception as e:
                return {
                    "request_id": request_id,
                    "success": False,
                    "error": str(e)
                }
        
        # Test sustained throughput over 30 seconds
        start_time = time.time()
        results = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            while time.time() - start_time < 30:  # 30 seconds
                futures = [executor.submit(throughput_request, i) for i in range(20)]
                batch_results = [future.result() for future in concurrent.futures.as_completed(futures)]
                results.extend(batch_results)
                time.sleep(0.1)  # Small delay between batches
        
        successful_requests = [r for r in results if r["success"]]
        total_time = time.time() - start_time
        
        return {
            "total_requests": len(results),
            "successful_requests": len(successful_requests),
            "total_time": total_time,
            "requests_per_second": len(successful_requests) / total_time if total_time > 0 else 0,
            "success_rate": len(successful_requests) / len(results) * 100 if results else 0
        }
    
    def _test_scalability(self) -> Dict[str, Any]:
        """Test scalability with increasing data sizes."""
        logger.info("Testing scalability")
        
        data_sizes = [10, 50, 100, 500, 1000]
        results = {}
        
        for size in data_sizes:
            try:
                transactions = [{"amount": i*10, "channel": f"channel_{i%5}"} for i in range(size)]
                
                start_time = time.time()
                response = requests.post(
                    f"{self.api_url}/api/sales/channel-campaign-metrics",
                    json={"transactions": transactions},
                    timeout=30
                )
                response_time = time.time() - start_time
                
                results[f"size_{size}"] = {
                    "data_size": size,
                    "response_time": response_time,
                    "success": response.status_code == 200,
                    "throughput": size / response_time if response_time > 0 else 0
                }
                
            except Exception as e:
                results[f"size_{size}"] = {
                    "data_size": size,
                    "error": str(e),
                    "success": False
                }
        
        return results
    
    def _calculate_performance_score(self, results: Dict[str, Any]) -> float:
        """Calculate overall performance score."""
        score = 0
        max_score = 100
        
        # Baseline performance (25 points)
        if "baseline_performance" in results and "avg_response_time" in results["baseline_performance"]:
            avg_response_time = results["baseline_performance"]["avg_response_time"]
            if avg_response_time < 0.1:
                score += 25
            elif avg_response_time < 0.5:
                score += 20
            elif avg_response_time < 1.0:
                score += 15
            else:
                score += 10
        
        # Load testing (25 points)
        if "load_testing" in results and "success_rate" in results["load_testing"]:
            success_rate = results["load_testing"]["success_rate"]
            if success_rate >= 95:
                score += 25
            elif success_rate >= 90:
                score += 20
            elif success_rate >= 80:
                score += 15
            else:
                score += 10
        
        # Stress testing (25 points)
        if "stress_testing" in results and "stress_test_status" in results["stress_testing"]:
            if results["stress_testing"]["stress_test_status"] == "PASSED":
                score += 25
            else:
                score += 10
        
        # Memory efficiency (25 points)
        if "memory_usage" in results and "memory_efficiency" in results["memory_usage"]:
            if results["memory_usage"]["memory_efficiency"] == "GOOD":
                score += 25
            else:
                score += 15
        
        return min(score, max_score)

if __name__ == "__main__":
    benchmark = SalesAnalyticsPerformanceBenchmark()
    
    try:
        results = benchmark.run_comprehensive_benchmarks()
        
        # Save results to file
        with open(f"logs/performance_benchmarks_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
            json.dump(results, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("PERFORMANCE BENCHMARK RESULTS")
        print("="*60)
        print(f"Overall Status: {results['overall']['status']}")
        print(f"Performance Score: {results['overall']['performance_score']}/100")
        print("="*60)
        
    except Exception as e:
        logger.error(f"Performance benchmark failed: {e}")
