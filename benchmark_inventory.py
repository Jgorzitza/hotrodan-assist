"""
Performance benchmarks for inventory management system.

Tests system performance under various load conditions.
"""
import time
import requests
import threading
import statistics
from datetime import datetime
from typing import List, Dict, Any
import json

API_BASE = "http://localhost:8004"

class InventoryBenchmark:
    def __init__(self):
        self.results = {}
        self.session = requests.Session()
    
    def benchmark_health_endpoint(self, requests_count: int = 1000) -> Dict[str, Any]:
        """Benchmark health endpoint performance."""
        print(f"Benchmarking health endpoint ({requests_count} requests)...")
        
        start_time = time.time()
        response_times = []
        errors = 0
        
        for i in range(requests_count):
            try:
                req_start = time.time()
                response = self.session.get(f"{API_BASE}/health", timeout=5)
                req_end = time.time()
                
                if response.status_code == 200:
                    response_times.append(req_end - req_start)
                else:
                    errors += 1
            except:
                errors += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
            rps = len(response_times) / total_time
        else:
            avg_response_time = min_response_time = max_response_time = p95_response_time = 0
            rps = 0
        
        result = {
            "endpoint": "health",
            "total_requests": requests_count,
            "successful_requests": len(response_times),
            "errors": errors,
            "success_rate": (len(response_times) / requests_count) * 100,
            "total_time": total_time,
            "rps": rps,
            "avg_response_time": avg_response_time,
            "min_response_time": min_response_time,
            "max_response_time": max_response_time,
            "p95_response_time": p95_response_time
        }
        
        print(f"  ✓ Success rate: {result['success_rate']:.1f}%")
        print(f"  ✓ RPS: {result['rps']:.1f}")
        print(f"  ✓ Avg response time: {result['avg_response_time']*1000:.1f}ms")
        print(f"  ✓ P95 response time: {result['p95_response_time']*1000:.1f}ms")
        
        return result
    
    def benchmark_stock_sync_endpoint(self, requests_count: int = 100) -> Dict[str, Any]:
        """Benchmark stock sync endpoint performance."""
        print(f"Benchmarking stock sync endpoint ({requests_count} requests)...")
        
        # Sample stock update data
        sample_updates = [
            {
                "sku": f"BENCH-SKU-{i%10:03d}",
                "location_id": f"BENCH-LOC-{i%3:03d}",
                "available": 100 + (i % 50),
                "updated_at": datetime.now().isoformat() + "Z",
                "source": ["shopify", "pos", "wms"][i % 3]
            }
            for i in range(5)  # 5 updates per request
        ]
        
        start_time = time.time()
        response_times = []
        errors = 0
        
        for i in range(requests_count):
            try:
                req_start = time.time()
                response = self.session.post(f"{API_BASE}/api/v1/stock/sync", json=sample_updates, timeout=10)
                req_end = time.time()
                
                if response.status_code == 200:
                    response_times.append(req_end - req_start)
                else:
                    errors += 1
            except:
                errors += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]
            rps = len(response_times) / total_time
        else:
            avg_response_time = min_response_time = max_response_time = p95_response_time = 0
            rps = 0
        
        result = {
            "endpoint": "stock_sync",
            "total_requests": requests_count,
            "successful_requests": len(response_times),
            "errors": errors,
            "success_rate": (len(response_times) / requests_count) * 100,
            "total_time": total_time,
            "rps": rps,
            "avg_response_time": avg_response_time,
            "min_response_time": min_response_time,
            "max_response_time": max_response_time,
            "p95_response_time": p95_response_time
        }
        
        print(f"  ✓ Success rate: {result['success_rate']:.1f}%")
        print(f"  ✓ RPS: {result['rps']:.1f}")
        print(f"  ✓ Avg response time: {result['avg_response_time']*1000:.1f}ms")
        print(f"  ✓ P95 response time: {result['p95_response_time']*1000:.1f}ms")
        
        return result
    
    def benchmark_concurrent_load(self, concurrent_users: int = 10, requests_per_user: int = 50) -> Dict[str, Any]:
        """Benchmark system under concurrent load."""
        print(f"Benchmarking concurrent load ({concurrent_users} users, {requests_per_user} requests each)...")
        
        results = []
        errors = 0
        
        def worker(user_id: int, results_list: List[Dict]):
            user_results = []
            for i in range(requests_per_user):
                try:
                    start = time.time()
                    response = self.session.get(f"{API_BASE}/health", timeout=5)
                    end = time.time()
                    
                    if response.status_code == 200:
                        user_results.append({
                            "response_time": end - start,
                            "success": True
                        })
                    else:
                        user_results.append({
                            "response_time": 0,
                            "success": False
                        })
                except:
                    user_results.append({
                        "response_time": 0,
                        "success": False
                    })
            
            results_list.extend(user_results)
        
        # Start concurrent workers
        threads = []
        start_time = time.time()
        
        for user_id in range(concurrent_users):
            t = threading.Thread(target=worker, args=(user_id, results))
            t.start()
            threads.append(t)
        
        # Wait for all threads to complete
        for t in threads:
            t.join()
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Analyze results
        successful_requests = [r for r in results if r["success"]]
        response_times = [r["response_time"] for r in successful_requests]
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]
        else:
            avg_response_time = min_response_time = max_response_time = p95_response_time = 0
        
        total_requests = len(results)
        successful_count = len(successful_requests)
        success_rate = (successful_count / total_requests) * 100
        rps = total_requests / total_time
        
        result = {
            "test_type": "concurrent_load",
            "concurrent_users": concurrent_users,
            "requests_per_user": requests_per_user,
            "total_requests": total_requests,
            "successful_requests": successful_count,
            "errors": total_requests - successful_count,
            "success_rate": success_rate,
            "total_time": total_time,
            "rps": rps,
            "avg_response_time": avg_response_time,
            "min_response_time": min_response_time,
            "max_response_time": max_response_time,
            "p95_response_time": p95_response_time
        }
        
        print(f"  ✓ Success rate: {result['success_rate']:.1f}%")
        print(f"  ✓ Total RPS: {result['rps']:.1f}")
        print(f"  ✓ Avg response time: {result['avg_response_time']*1000:.1f}ms")
        print(f"  ✓ P95 response time: {result['p95_response_time']*1000:.1f}ms")
        
        return result
    
    def benchmark_memory_usage(self) -> Dict[str, Any]:
        """Benchmark memory usage during operations."""
        print("Benchmarking memory usage...")
        
        try:
            import psutil
            import os
            
            process = psutil.Process(os.getpid())
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            # Perform memory-intensive operations
            large_data = []
            for i in range(1000):
                large_data.append({
                    "sku": f"MEMORY-SKU-{i:06d}",
                    "location_id": f"MEMORY-LOC-{i%10:03d}",
                    "available": i % 1000,
                    "updated_at": datetime.now().isoformat() + "Z",
                    "source": "memory_test"
                })
            
            # Make API calls with large data
            for i in range(10):
                try:
                    response = self.session.post(f"{API_BASE}/api/v1/stock/sync", json=large_data, timeout=30)
                except:
                    pass
            
            peak_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = peak_memory - initial_memory
            
            result = {
                "test_type": "memory_usage",
                "initial_memory_mb": initial_memory,
                "peak_memory_mb": peak_memory,
                "memory_increase_mb": memory_increase,
                "memory_efficient": memory_increase < 100  # Less than 100MB increase
            }
            
            print(f"  ✓ Initial memory: {result['initial_memory_mb']:.1f} MB")
            print(f"  ✓ Peak memory: {result['peak_memory_mb']:.1f} MB")
            print(f"  ✓ Memory increase: {result['memory_increase_mb']:.1f} MB")
            print(f"  ✓ Memory efficient: {'Yes' if result['memory_efficient'] else 'No'}")
            
            return result
            
        except ImportError:
            print("  ⚠️  psutil not available, skipping memory benchmark")
            return {"test_type": "memory_usage", "skipped": True}
    
    def run_complete_benchmark_suite(self) -> Dict[str, Any]:
        """Run complete benchmark suite."""
        print("🚀 Starting Inventory Performance Benchmarks")
        print("=" * 60)
        
        benchmarks = {
            "health_endpoint": self.benchmark_health_endpoint(1000),
            "stock_sync_endpoint": self.benchmark_stock_sync_endpoint(100),
            "concurrent_load": self.benchmark_concurrent_load(10, 50),
            "memory_usage": self.benchmark_memory_usage()
        }
        
        # Overall performance score
        health_rps = benchmarks["health_endpoint"]["rps"]
        sync_rps = benchmarks["stock_sync_endpoint"]["rps"]
        concurrent_rps = benchmarks["concurrent_load"]["rps"]
        
        performance_score = min(100, (health_rps + sync_rps + concurrent_rps) / 3)
        
        print("\n" + "=" * 60)
        print("📊 BENCHMARK RESULTS SUMMARY")
        print("=" * 60)
        
        for test_name, result in benchmarks.items():
            if "skipped" not in result:
                print(f"{test_name:.<30} RPS: {result.get('rps', 0):.1f}")
        
        print(f"\nOverall Performance Score: {performance_score:.1f}/100")
        
        if performance_score >= 80:
            print("🎉 EXCELLENT PERFORMANCE!")
        elif performance_score >= 60:
            print("✅ GOOD PERFORMANCE")
        else:
            print("⚠️  PERFORMANCE NEEDS IMPROVEMENT")
        
        return {
            "benchmarks": benchmarks,
            "performance_score": performance_score,
            "timestamp": datetime.now().isoformat()
        }

def main():
    """Run the complete benchmark suite."""
    benchmark = InventoryBenchmark()
    results = benchmark.run_complete_benchmark_suite()
    
    # Save results to file
    with open("benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📁 Benchmark results saved to: benchmark_results.json")

if __name__ == "__main__":
    main()
