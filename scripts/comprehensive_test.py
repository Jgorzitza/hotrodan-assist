import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi.testclient import TestClient
from app.rag_api.main import app

client = TestClient(app)

print("=== Comprehensive RAG API Test ===\n")

# Test 1: Health endpoints
print("Test 1: Health Checks")
response = client.get("/health")
print(f"  Basic health: {response.status_code}")

response = client.get("/health/detailed")
if response.status_code == 200:
    health = response.json()
    print(f"  Detailed health: {health['status']}")

response = client.get("/readiness")
if response.status_code == 200:
    readiness = response.json()
    print(f"  Readiness: {readiness['ready']}")

# Test 2: Production config
print("\nTest 2: Production Configuration")
response = client.get("/production/config")
if response.status_code == 200:
    config = response.json()
    print(f"  Cache enabled: {config['caching']['enabled']}")
    print(f"  Rate limiting: {config['rate_limiting']['enabled']}")
    print(f"  Hybrid search: {config['search']['hybrid_search_enabled']}")

# Test 3: Config endpoint with providers
print("\nTest 3: API Configuration")
response = client.get("/config")
if response.status_code == 200:
    config = response.json()
    print(f"  Available providers: {list(config.get('available_providers', {}).keys())}")
    print(f"  Features: {', '.join(config.get('features', []))}")

# Test 4: Analytics endpoints
print("\nTest 4: Analytics")
response = client.get("/analytics/performance")
if response.status_code == 200:
    perf = response.json()
    print(f"  Total queries: {perf.get('total_queries', 0)}")

# Test 5: Cache stats
print("\nTest 5: Cache")
response = client.get("/cache/stats")
if response.status_code == 200:
    cache = response.json()
    print(f"  Cache size: {cache['size']}/{cache['max_size']}")
    print(f"  Hit rate: {cache['hit_rate']:.1%}")

# Test 6: Rate limit status
print("\nTest 6: Rate Limiting")
response = client.get("/rate-limit/status")
if response.status_code == 200:
    rl = response.json()
    print(f"  IP tokens: {rl.get('ip', {}).get('tokens_available', 'N/A')}")

# Test 7: Query optimization
print("\nTest 7: Query Analyzer")
response = client.post("/query/analyze", params={"question": "How to troubleshoot fuel pressure issues?"})
if response.status_code == 200:
    analysis = response.json()
    print(f"  Intent: {analysis['intent']}")
    print(f"  Complexity: {analysis['complexity']}")
    print(f"  Recommended top_k: {analysis['recommended_top_k']}")

# Test 8: Benchmark
print("\nTest 8: Benchmarking")
response = client.get("/benchmark/suites")
if response.status_code == 200:
    suites = response.json()
    print(f"  Benchmark suites: {suites['count']}")

print("\n=== All comprehensive tests complete ===")
