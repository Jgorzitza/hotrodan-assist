import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi.testclient import TestClient
from app.rag_api.main import app

client = TestClient(app)

# Make a few queries to generate analytics data
print("Generating analytics data...")
for i in range(3):
    response = client.post(
        "/query",
        json={
            "question": f"Test question {i}",
            "top_k": 3,
            "provider": "retrieval-only"
        }
    )
    print(f"Query {i+1}: {response.status_code}")

# Test analytics endpoints
print("\n=== Analytics Dashboard ===")
response = client.get("/analytics/dashboard")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Performance metrics: {data.get('performance', {})}")
    print(f"Providers tracked: {list(data.get('provider_metrics', {}).keys())}")

print("\n=== Provider Metrics ===")
response = client.get("/analytics/providers")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    for provider, metrics in data.items():
        print(f"{provider}: {metrics}")

print("\n=== Performance Metrics ===")
response = client.get("/analytics/performance")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Total queries: {data.get('total_queries')}")
    print(f"Avg response time: {data.get('avg_response_time_ms')}ms")
    print(f"Success rate: {data.get('success_rate')}")
    print(f"Avg quality score: {data.get('avg_quality_score')}")

print("\n=== Analytics tests complete ===")
