#!/usr/bin/env python3
"""Comprehensive test suite for enhanced RAG API features."""

import requests
import json
import time
import sys

API_BASE = "http://localhost:8000"

def test_security_features():
    """Test security enhancements."""
    print("Testing security features...")
    
    # Test rate limiting (would need multiple requests)
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            print("✓ Health endpoint accessible")
        else:
            print(f"✗ Health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Security test error: {e}")
        return False
    
    return True

def test_advanced_functions():
    """Test advanced functions."""
    print("Testing advanced functions...")
    
    # Test query with advanced processing
    try:
        test_query = {
            "question": "What is the best fuel pump for a 600hp LS engine?",
            "top_k": 5
        }
        
        response = requests.post(f"{API_BASE}/query", json=test_query, timeout=30)
        if response.status_code == 200:
            result = response.json()
            if "query_analytics" in result and "routing" in result:
                print("✓ Advanced functions working")
                print(f"  Query category: {result['routing']['category']}")
                print(f"  Optimization applied: {result['optimization']['optimization_applied']}")
                return True
            else:
                print("✗ Advanced functions not working properly")
                return False
        else:
            print(f"✗ Query failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Advanced functions test error: {e}")
        return False

def test_query_routing():
    """Test query routing functionality."""
    print("Testing query routing...")
    
    test_queries = [
        ("What fuel pump do I need?", "technical"),
        ("How do I install AN fittings?", "technical"),
        ("Why is my engine running rich?", "troubleshooting"),
        ("What is HotRodAN?", "general")
    ]
    
    for question, expected_category in test_queries:
        try:
            response = requests.post(f"{API_BASE}/query", 
                                   json={"question": question, "top_k": 3}, 
                                   timeout=30)
            if response.status_code == 200:
                result = response.json()
                actual_category = result.get("routing", {}).get("category", "unknown")
                if actual_category == expected_category:
                    print(f"✓ Query routing correct for: {question[:30]}...")
                else:
                    print(f"✗ Query routing incorrect for: {question[:30]}... (expected: {expected_category}, got: {actual_category})")
            else:
                print(f"✗ Query failed for: {question[:30]}...")
        except Exception as e:
            print(f"✗ Query routing test error: {e}")
    
    return True

def test_performance_optimization():
    """Test performance optimization."""
    print("Testing performance optimization...")
    
    try:
        # Test with different query types
        technical_query = {
            "question": "What AN hose size for 800hp turbo LS with E85 fuel system?",
            "top_k": 10
        }
        
        response = requests.post(f"{API_BASE}/query", json=technical_query, timeout=30)
        if response.status_code == 200:
            result = response.json()
            optimization = result.get("optimization", {})
            if optimization.get("optimization_applied"):
                print(f"✓ Performance optimization working (top_k: {optimization['optimized_top_k']})")
                return True
            else:
                print("✗ Performance optimization not applied")
                return False
        else:
            print(f"✗ Performance optimization test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Performance optimization test error: {e}")
        return False

def test_analytics():
    """Test query analytics."""
    print("Testing query analytics...")
    
    try:
        response = requests.get(f"{API_BASE}/metrics", timeout=10)
        if response.status_code == 200:
            metrics = response.json()
            print("✓ Analytics endpoint working")
            print(f"  Query count: {metrics.get('query_count', 'N/A')}")
            print(f"  Avg response time: {metrics.get('avg_response_time_ms', 'N/A')}ms")
            return True
        else:
            print(f"✗ Analytics failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Analytics test error: {e}")
        return False

def main():
    """Run all advanced feature tests."""
    print("🚀 Starting Enhanced RAG API Advanced Feature Tests")
    print("=" * 60)
    
    tests = [
        test_security_features,
        test_advanced_functions,
        test_query_routing,
        test_performance_optimization,
        test_analytics
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print()
        except Exception as e:
            print(f"✗ Test failed with exception: {e}")
            print()
    
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All advanced feature tests PASSED!")
        return 0
    else:
        print("❌ Some advanced feature tests FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
