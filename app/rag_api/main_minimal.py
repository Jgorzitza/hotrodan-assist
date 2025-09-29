"""Minimal working RAG API for live testing."""

import os
import sys
from dotenv import load_dotenv

# Add the parent directory to the path
sys.path.append("/home/justin/llama_rag")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# Load environment
load_dotenv()

app = FastAPI(title="RAG API", version="1.0.0")

class QueryIn(BaseModel):
    question: str
    top_k: int = 10

@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": "2025-09-29T14:15:00Z",
        "mode": "minimal"
    }

@app.post("/query")
def query(q: QueryIn):
    """Query endpoint for testing."""
    return {
        "answer": f"Test response for: {q.question}",
        "sources": ["test-source-1", "test-source-2"],
        "mode": "minimal",
        "query_id": hash(q.question) % 10000
    }

@app.get("/metrics")
def metrics():
    """Metrics endpoint."""
    return {
        "query_count": 0,
        "avg_response_time_ms": 0.0,
        "error_count": 0,
        "status": "minimal"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
