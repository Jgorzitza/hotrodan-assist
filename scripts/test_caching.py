import sys
from pathlib import Path
import time

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi.testclient import TestClient
from app.rag_api.main import app

client = TestClient(app)

print("=== Testing Query Caching ===\n")

# Test 1: First query (cache miss)
print("Test 1: First query (cache miss)")
start = time.time()
response1 = client.post(
    "/query",
    json={
        "question": "What is PTFE hose used for?",
        "top_k": 5,
        "provider": "retrieval-only"
    }
)
elapsed1 = time.time() - start
print(f"Status: {response1.status_code}")
print(f"Response time: {elapsed1*1000:.0f}ms")
if response1.status_code == 200:
    data = response1.json()
    cached = data.get("cache_metadata", {}).get("cached", False)
    print(f"Cached: {cached}")

# Test 2: Same query (cache hit)
print("\nTest 2: Same query (cache hit)")
start = time.time()
response2 = client.post(
    "/query",
    json={
        "question": "What is PTFE hose used for?",
        "top_k": 5,
        "provider": "retrieval-only"
    }
)
elapsed2 = time.time() - start
print(f"Status: {response2.status_code}")
print(f"Response time: {elapsed2*1000:.0f}ms")
if response2.status_code == 200:
    data = response2.json()
    cache_meta = data.get("cache_metadata", {})
    print(f"Cached: {cache_meta.get('cached', False)}")
    print(f"Cache age: {cache_meta.get('age_seconds', 0):.2f}s")
    print(f"Cache hits: {cache_meta.get('hits', 0)}")

# Test 3: Cache stats
print("\nTest 3: Cache statistics")
response = client.get("/cache/stats")
if response.status_code == 200:
    stats = response.json()
    print(f"Cache size: {stats['size']}/{stats['max_size']}")
    print(f"Hit rate: {stats['hit_rate']:.1%}")
    print(f"Total hits: {stats['hits']}")
    print(f"Total misses: {stats['misses']}")

# Test 4: Performance comparison
print("\nTest 4: Performance improvement")
print(f"First query (no cache): {elapsed1*1000:.0f}ms")
print(f"Second query (cached): {elapsed2*1000:.0f}ms")
if elapsed1 > 0:
    speedup = (elapsed1 - elapsed2) / elapsed1 * 100
    print(f"Speed improvement: {speedup:.1f}%")

print("\n=== Caching tests complete ===")
