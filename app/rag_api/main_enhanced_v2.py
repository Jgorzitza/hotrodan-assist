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
from pydantic import BaseModel, Field, validator

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore

from rag_config import (
    COLLECTION,
    INDEX_ID,
    configure_settings,
)

# Import our modules
from security import check_rate_limit, validate_request
from advanced_functions import query_routing, context_aware_response, query_analytics, performance_optimization

# Import monitoring
from monitor import track_performance, get_metrics, save_metrics

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
def query(q: QueryIn, request: Request):
    """Query the RAG system with advanced processing."""
    # Security validation
    validate_request(request)
    
    start_time = time.time()
    
    try:
        # Query routing and optimization
        routing = query_routing(q.question)
        optimization = performance_optimization(q.question, q.top_k)
        
        # Use absolute paths to ensure we find the storage files
        chroma_path = "/home/justin/llama_rag/chroma"
        persist_dir = "/home/justin/llama_rag/storage"

        client = chromadb.PersistentClient(path=chroma_path)
        collection = client.get_or_create_collection(
            COLLECTION, metadata={"hnsw:space": "cosine"}
        )
        vector_store = ChromaVectorStore(chroma_collection=collection)
        storage = StorageContext.from_defaults(
            vector_store=vector_store, persist_dir=persist_dir
        )
        index = load_index_from_storage(storage, index_id=INDEX_ID)

        retriever = index.as_retriever(similarity_top_k=optimization["optimized_top_k"])
        nodes = retriever.retrieve(q.question)

        if GENERATION_MODE == "openai" and OPENAI_API_KEY:
            qe = index.as_query_engine(
                response_mode="compact", similarity_top_k=optimization["optimized_top_k"]
            )
            resp = qe.query(_SYSTEM_HINT + "\n\nQuestion: " + q.question)
            sources = [
                n.metadata.get("source_url", "unknown")
                for n in getattr(resp, "source_nodes", [])
            ]
            answer = str(resp)
        else:
            # Retrieval-only mode with advanced processing
            retrieved_docs = []
            source_urls = []
            
            for node_with_score in nodes:
                node = getattr(node_with_score, "node", None) or node_with_score
                text = getattr(node, "text", None)
                if text is None and hasattr(node, "get_content"):
                    text = node.get_content()
                if not text:
                    continue
                
                retrieved_docs.append({
                    "text": text,
                    "source_url": node.metadata.get("source_url", "unknown")
                })
                source = node.metadata.get("source_url", "unknown")
                if source not in source_urls:
                    source_urls.append(source)

            if not retrieved_docs:
                return {
                    "answer": "No relevant documents retrieved. Configure OPENAI_API_KEY for full responses.",
                    "sources": [],
                    "mode": "retrieval-only",
                    "query_analytics": query_analytics(q.question, time.time() - start_time, 0, "retrieval-only")
                }

            # Context-aware response generation
            answer = context_aware_response(q.question, retrieved_docs)
            sources = source_urls[:10]

        # Generate analytics
        analytics = query_analytics(q.question, time.time() - start_time, len(sources), GENERATION_MODE)
        
        return {
            "answer": answer,
            "sources": sources,
            "mode": GENERATION_MODE,
            "query_analytics": analytics,
            "routing": routing,
            "optimization": optimization
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")

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
