#!/usr/bin/env python3
"""Test script for RAG API validation and integration testing."""
import requests
import json
import sys

API_BASE = "http://localhost:8000"

def test_config_endpoint():
    """Test the config endpoint."""
    print("Testing /config endpoint...")
    try:
        response = requests.get(f"{API_BASE}/config", timeout=10)
        if response.status_code == 200:
            config = response.json()
            print(f"✓ Config endpoint working: {config['generation_mode']} mode")
            return True
        else:
            print(f"✗ Config endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Config endpoint error: {e}")
        return False

def test_query_validation():
    """Test query input validation."""
    print("Testing query validation...")
    
    # Test valid query
    try:
        response = requests.post(f"{API_BASE}/query", 
                               json={"question": "test pump sizing", "top_k": 5}, 
                               timeout=10)
        if response.status_code == 200:
            print("✓ Valid query accepted")
        else:
            print(f"✗ Valid query rejected: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Valid query error: {e}")
        return False
    
    # Test invalid query (empty question)
    try:
        response = requests.post(f"{API_BASE}/query", 
                               json={"question": "", "top_k": 5}, 
                               timeout=10)
        if response.status_code == 422:
            print("✓ Empty question properly rejected")
        else:
            print(f"✗ Empty question not rejected: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Empty question test error: {e}")
        return False
    
    # Test invalid top_k
    try:
        response = requests.post(f"{API_BASE}/query", 
                               json={"question": "test", "top_k": 100}, 
                               timeout=10)
        if response.status_code == 422:
            print("✓ Invalid top_k properly rejected")
        else:
            print(f"✗ Invalid top_k not rejected: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Invalid top_k test error: {e}")
        return False
    
    return True

def test_health_endpoint():
    """Test the health endpoint."""
    print("Testing /health endpoint...")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            health = response.json()
            print(f"✓ Health endpoint working: {health['status']}")
            return True
        else:
            print(f"✗ Health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Health endpoint error: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Starting RAG API validation tests")
    print("=" * 50)
    
    tests = [
        test_health_endpoint,
        test_config_endpoint,
        test_query_validation
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
        print("🎉 All validation tests PASSED!")
        return 0
    else:
        print("❌ Some validation tests FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
