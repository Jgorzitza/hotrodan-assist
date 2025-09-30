import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi.testclient import TestClient
from app.rag_api.main import app

client = TestClient(app)

print("=== Testing Query Optimizer ===\n")

# Test different query types
queries = [
    "What is PTFE?",  # Simple factual
    "How to install a fuel pump regulator?",  # How-to
    "Why is my fuel pressure dropping and what could be wrong?",  # Complex troubleshooting
    "Compare PTFE vs rubber fuel lines for E85",  # Comparison
    "What's the difference between return and returnless fuel systems?",  # Explanation
]

for i, question in enumerate(queries, 1):
    print(f"Test {i}: {question}")
    response = client.post("/query/analyze", params={"question": question})
    
    if response.status_code == 200:
        data = response.json()
        print(f"  Complexity: {data['complexity']}")
        print(f"  Intent: {data['intent']}")
        print(f"  Recommended top_k: {data['recommended_top_k']}")
        print(f"  Recommended provider: {data.get('recommended_provider', 'default')}")
        print(f"  Keywords: {', '.join(data['keywords'][:5])}")
        if data.get('entities'):
            print(f"  Entities: {', '.join(data['entities'])}")
        print(f"  Confidence: {data['confidence']:.2f}")
        print(f"  Reasoning: {data['reasoning']}")
    print()

print("=== Query optimizer tests complete ===")
