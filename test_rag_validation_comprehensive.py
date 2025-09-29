#!/usr/bin/env python3
"""Comprehensive validation testing for RAG API."""

import requests
import json
import time
import threading
import sys
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

class RAGValidator:
    def __init__(self, api_base="http://localhost:8000"):
        self.api_base = api_base
        self.results = {
            "integration_tests": {},
            "sustained_queries": {},
            "performance_metrics": {},
            "errors": []
        }
    
    def test_api_health(self):
        """Test API health and basic connectivity."""
        print("Testing API health...")
        try:
            response = requests.get(f"{self.api_base}/health", timeout=10)
            if response.status_code == 200:
                health_data = response.json()
                print(f"✓ API healthy: {health_data.get('status')}")
                self.results["integration_tests"]["health"] = {
                    "status": "passed",
                    "response": health_data
                }
                return True
            else:
                print(f"✗ API health failed: {response.status_code}")
                self.results["integration_tests"]["health"] = {
                    "status": "failed",
                    "error": f"HTTP {response.status_code}"
                }
                return False
        except Exception as e:
            print(f"✗ API health error: {e}")
            self.results["integration_tests"]["health"] = {
                "status": "error",
                "error": str(e)
            }
            return False
    
    def test_query_endpoint(self):
        """Test query endpoint functionality."""
        print("Testing query endpoint...")
        test_queries = [
            "What fuel pump do I need for a 600hp LS engine?",
            "How do I size AN hose for fuel systems?",
            "What's the difference between return and returnless fuel systems?",
            "What AN fittings work with PTFE hose?",
            "How do I install a fuel pressure regulator?"
        ]
        
        successful_queries = 0
        total_response_time = 0
        
        for i, query in enumerate(test_queries):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.api_base}/query",
                    json={"question": query, "top_k": 5},
                    timeout=30
                )
                response_time = time.time() - start_time
                total_response_time += response_time
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✓ Query {i+1}: {response_time:.2f}s")
                    successful_queries += 1
                else:
                    print(f"✗ Query {i+1} failed: {response.status_code}")
                    self.results["errors"].append(f"Query {i+1} failed: {response.status_code}")
            except Exception as e:
                print(f"✗ Query {i+1} error: {e}")
                self.results["errors"].append(f"Query {i+1} error: {e}")
        
        avg_response_time = total_response_time / len(test_queries) if test_queries else 0
        
        self.results["integration_tests"]["query_endpoint"] = {
            "status": "passed" if successful_queries == len(test_queries) else "partial",
            "successful_queries": successful_queries,
            "total_queries": len(test_queries),
            "avg_response_time": avg_response_time
        }
        
        return successful_queries == len(test_queries)
    
    def run_sustained_queries(self, duration_seconds=60, concurrent_requests=5):
        """Run sustained queries to test performance under load."""
        print(f"Running sustained queries for {duration_seconds} seconds with {concurrent_requests} concurrent requests...")
        
        test_queries = [
            "What fuel pump do I need?",
            "How do I size AN hose?",
            "What's the best fuel system setup?",
            "How do I install AN fittings?",
            "What's the difference between return and returnless?"
        ]
        
        start_time = time.time()
        query_count = 0
        error_count = 0
        total_response_time = 0
        
        def make_query(query_text):
            nonlocal query_count, error_count, total_response_time
            try:
                query_start = time.time()
                response = requests.post(
                    f"{self.api_base}/query",
                    json={"question": query_text, "top_k": 3},
                    timeout=10
                )
                query_time = time.time() - query_start
                total_response_time += query_time
                query_count += 1
                
                if response.status_code != 200:
                    error_count += 1
                
                return response.status_code == 200
            except Exception as e:
                error_count += 1
                return False
        
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            while time.time() - start_time < duration_seconds:
                futures = []
                for _ in range(concurrent_requests):
                    query = test_queries[query_count % len(test_queries)]
                    future = executor.submit(make_query, query)
                    futures.append(future)
                
                # Wait for all requests to complete
                for future in as_completed(futures):
                    future.result()
        
        total_time = time.time() - start_time
        queries_per_second = query_count / total_time
        avg_response_time = (total_response_time / query_count) * 1000 if query_count > 0 else 0
        error_rate = (error_count / query_count) * 100 if query_count > 0 else 0
        
        print(f"✓ Sustained queries completed:")
        print(f"  Total queries: {query_count}")
        print(f"  Queries/second: {queries_per_second:.2f}")
        print(f"  Avg response time: {avg_response_time:.2f}ms")
        print(f"  Error rate: {error_rate:.2f}%")
        
        self.results["sustained_queries"] = {
            "duration_seconds": duration_seconds,
            "concurrent_requests": concurrent_requests,
            "total_queries": query_count,
            "queries_per_second": queries_per_second,
            "avg_response_time_ms": avg_response_time,
            "error_count": error_count,
            "error_rate": error_rate
        }
        
        return error_rate < 10  # Consider successful if error rate < 10%
    
    def test_metrics_endpoint(self):
        """Test metrics endpoint."""
        print("Testing metrics endpoint...")
        try:
            response = requests.get(f"{self.api_base}/metrics", timeout=10)
            if response.status_code == 200:
                metrics = response.json()
                print("✓ Metrics endpoint working")
                self.results["integration_tests"]["metrics"] = {
                    "status": "passed",
                    "metrics": metrics
                }
                return True
            else:
                print(f"✗ Metrics endpoint failed: {response.status_code}")
                self.results["integration_tests"]["metrics"] = {
                    "status": "failed",
                    "error": f"HTTP {response.status_code}"
                }
                return False
        except Exception as e:
            print(f"✗ Metrics endpoint error: {e}")
            self.results["integration_tests"]["metrics"] = {
                "status": "error",
                "error": str(e)
            }
            return False
    
    def run_comprehensive_validation(self):
        """Run all validation tests."""
        print("🚀 Starting Comprehensive RAG API Validation")
        print("=" * 60)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API not healthy, stopping validation")
            return False
        
        print()
        
        # Run integration tests
        self.test_query_endpoint()
        print()
        
        self.test_metrics_endpoint()
        print()
        
        # Run sustained queries
        self.run_sustained_queries(duration_seconds=30, concurrent_requests=3)
        print()
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"rag_validation_results_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"📊 Validation results saved to: {results_file}")
        
        # Summary
        total_tests = len(self.results["integration_tests"])
        passed_tests = sum(1 for test in self.results["integration_tests"].values() 
                          if test["status"] == "passed")
        
        print(f"\n📈 Validation Summary:")
        print(f"  Integration tests: {passed_tests}/{total_tests} passed")
        print(f"  Sustained queries: {'PASSED' if self.results['sustained_queries'].get('error_rate', 100) < 10 else 'FAILED'}")
        print(f"  Total errors: {len(self.results['errors'])}")
        
        return passed_tests == total_tests and self.results['sustained_queries'].get('error_rate', 100) < 10

def main():
    validator = RAGValidator()
    success = validator.run_comprehensive_validation()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
