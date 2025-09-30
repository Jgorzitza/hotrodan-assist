import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi.testclient import TestClient
from app.rag_api.main import app

client = TestClient(app)

# Test 1: Retrieval-only mode
print("\n=== Test 1: Retrieval-only mode ===")
response = client.post(
    "/query",
    json={
        "question": "Summarize PTFE hose guidance for EFI.",
        "top_k": 5,
        "provider": "retrieval-only",
    },
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Mode: {data.get('mode', 'N/A')}")
    print(f"Provider info: {data.get('provider_info', 'N/A')}")
    print(f"Answer length: {len(data.get('answer', ''))}")
    print(f"Sources: {len(data.get('sources', []))}")
else:
    print(f"Error: {response.text}")

# Test 2: Default mode (should use MODEL_SELECTOR priority)
print("\n=== Test 2: Default mode ===")
response = client.post(
    "/query",
    json={
        "question": "Summarize PTFE hose guidance for EFI.",
        "top_k": 5,
    },
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Mode: {data.get('mode', 'N/A')}")
    print(f"Provider info: {data.get('provider_info', 'N/A')}")
    print(f"Answer length: {len(data.get('answer', ''))}")
else:
    print(f"Error: {response.text}")

# Test 3: Config endpoint
print("\n=== Test 3: Config endpoint ===")
response = client.get("/config")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Generation mode: {data.get('generation_mode', 'N/A')}")
    print(f"Available providers: {list(data.get('available_providers', {}).keys())}")
else:
    print(f"Error: {response.text}")

print("\n=== All tests complete ===")
