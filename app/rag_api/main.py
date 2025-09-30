"""Enhanced RAG API with security and advanced functions."""

import os
import sys
import time
from dotenv import load_dotenv
from textwrap import shorten

# Add the parent directory to the path to import rag_config
sys.path.append("/home/justin/llama_rag")

import chromadb
from fastapi import FastAPI, HTTPException, Request
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore

from rag_config import (
    COLLECTION,
    INDEX_ID,
    configure_settings,
)

# Import our modules
from app.rag_api.security import check_rate_limit, validate_request
from app.rag_api.advanced_functions import query_routing, context_aware_response, query_analytics, performance_optimization

# Import monitoring
from app.rag_api.monitor import track_performance, get_metrics, save_metrics
from app.rag_api.model_selector import MODEL_SELECTOR

configure_settings()

# Load environment variables from .env file
load_dotenv()

GENERATION_MODE = os.getenv("RAG_GENERATION_MODE", "openai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Determine actual mode based on API key availability
if not OPENAI_API_KEY and GENERATION_MODE == "openai":
    GENERATION_MODE = "retrieval-only"
    print("OPENAI_API_KEY not found, falling back to retrieval-only mode")

_SYSTEM_HINT = (
    "Retail EFI specialist. Cover pump sizing (LPH vs hp & fuel), "
    "return vs returnless, regulator placement, ≤10 μm pressure-side filtration, "
    "AN line sizes, PTFE-lined hose for gasoline/diesel/E85/methanol. Be concise."
)

app = FastAPI(
    title="Enhanced RAG API",
    description="RAG API with security and advanced functions",
    version="2.0.0",
)

class QueryIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="Question to ask the RAG system")
    top_k: int = Field(default=10, ge=1, le=50, description="Number of top results to retrieve")
    provider: Optional[str] = Field(None, description="Optional LLM provider (openai, anthropic, local, retrieval-only)")
    
    @validator('question')
    def validate_question(cls, v):
        if not v or not v.strip():
            raise ValueError('Question cannot be empty or whitespace only')
        return v.strip()

class ConfigResponse(BaseModel):
    generation_mode: str
    openai_available: bool
    collection_name: str
    index_id: str
    max_top_k: int = 50
    min_top_k: int = 1
    max_question_length: int = 2000
    system_hint: str
    features: list
    available_providers: Dict[str, Any] = {}

class MetricsResponse(BaseModel):
    query_count: int
    avg_response_time_ms: float
    error_count: int
    error_rate: float
    last_query_time: str
    queries_by_hour: dict
    recent_response_times_ms: list

@app.post("/query")
@track_performance
@track_performance
def query(q: QueryIn, request: Request):
@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "mode": GENERATION_MODE,
        "openai_available": bool(OPENAI_API_KEY),
        "timestamp": os.popen("date -Iseconds").read().strip(),
        "features": ["security", "query_routing", "analytics", "optimization"]
    }

@app.get("/config", response_model=ConfigResponse)
def get_config():
    """Get API configuration and limits."""
    return ConfigResponse(
        generation_mode=GENERATION_MODE,
        openai_available=bool(OPENAI_API_KEY),
        collection_name=COLLECTION,
        index_id=INDEX_ID,
        max_top_k=50,
        min_top_k=1,
        max_question_length=2000,
        system_hint=_SYSTEM_HINT,
        features=["security", "query_routing", "analytics", "optimization", "context_aware"]
    )

@app.get("/metrics", response_model=MetricsResponse)
def metrics():
    """Get performance metrics."""
    return get_metrics()

@app.post("/metrics/save")
def save_metrics_endpoint():
    """Manually save metrics to file."""
    save_metrics()
    return {"status": "metrics saved"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
