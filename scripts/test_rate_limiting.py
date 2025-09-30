import sys
from pathlib import Path
import time

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi.testclient import TestClient
from app.rag_api.main import app

client = TestClient(app)

print("=== Testing Rate Limiting ===\n")

# Test 1: Check rate limit status endpoint
print("Test 1: Rate limit status endpoint")
response = client.get("/rate-limit/status")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"IP tokens available: {data.get('ip', {}).get('tokens_available', 'N/A')}")

# Test 2: Normal rate (should work)
print("\nTest 2: Normal request rate (3 requests)")
for i in range(3):
    response = client.post(
        "/query",
        json={
            "question": f"Test question {i}",
            "top_k": 3,
            "provider": "retrieval-only"
        }
    )
    print(f"Request {i+1}: {response.status_code}")
    time.sleep(0.1)

# Test 3: Check status after requests
print("\nTest 3: Check status after requests")
response = client.get("/rate-limit/status", params={"provider": "retrieval-only"})
if response.status_code == 200:
    data = response.json()
    print(f"IP tokens: {data.get('ip', {}).get('tokens_available', 'N/A')}/{data.get('ip', {}).get('capacity', 'N/A')}")
    if 'provider' in data:
        print(f"Provider tokens: {data.get('provider', {}).get('tokens_available', 'N/A')}/{data.get('provider', {}).get('capacity', 'N/A')}")

# Test 4: Rapid fire to potentially hit limit (for local testing)
# Note: With default config (100 capacity, 1/sec refill), this won't hit limit
# but shows the token depletion
print("\nTest 4: Rapid fire requests (10 quick requests)")
start_time = time.time()
responses = []
for i in range(10):
    response = client.post(
        "/query",
        json={"question": f"Quick test {i}", "top_k": 2, "provider": "retrieval-only"}
    )
    responses.append(response.status_code)

elapsed = time.time() - start_time
success_count = responses.count(200)
rate_limited_count = responses.count(429)

print(f"Completed in {elapsed:.2f}s")
print(f"Successful: {success_count}/10")
print(f"Rate limited: {rate_limited_count}/10")

if rate_limited_count > 0:
    print("\n✅ Rate limiting is working!")
    # Check for Retry-After header
    for i, status in enumerate(responses):
        if status == 429:
            print(f"Rate limit hit on request {i+1}")
else:
    print("\n✅ All requests within rate limit (as expected with default config)")

print("\n=== Rate limiting tests complete ===")
