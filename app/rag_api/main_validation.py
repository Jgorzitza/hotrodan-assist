"""Simplified RAG API for validation testing."""

import os
import sys
import time
from dotenv import load_dotenv
from textwrap import shorten

# Add the parent directory to the path to import rag_config
sys.path.append("/home/justin/llama_rag")

import chromadb
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore

from rag_config import (
    COLLECTION,
    INDEX_ID,
    configure_settings,
)

configure_settings()
load_dotenv()

GENERATION_MODE = os.getenv("RAG_GENERATION_MODE", "openai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY and GENERATION_MODE == "openai":
    GENERATION_MODE = "retrieval-only"
    print("OPENAI_API_KEY not found, falling back to retrieval-only mode")

_SYSTEM_HINT = (
    "Retail EFI specialist. Cover pump sizing (LPH vs hp & fuel), "
    "return vs returnless, regulator placement, ≤10 μm pressure-side filtration, "
    "AN line sizes, PTFE-lined hose for gasoline/diesel/E85/methanol. Be concise."
)

app = FastAPI(
    title="RAG Validation API",
    description="RAG API for validation testing",
    version="2.0.0",
)

class QueryIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=10, ge=1, le=50)

class ValidationMetrics(BaseModel):
    query_count: int = 0
    total_response_time: float = 0.0
    error_count: int = 0
    start_time: str = ""

# Global metrics
validation_metrics = ValidationMetrics(
    start_time=time.strftime("%Y-%m-%d %H:%M:%S")
)

@app.post("/query")
def query(q: QueryIn):
    """Query the RAG system for validation."""
    start_time = time.time()
    
    try:
        validation_metrics.query_count += 1
        
        # Use absolute paths
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

        retriever = index.as_retriever(similarity_top_k=q.top_k)
        nodes = retriever.retrieve(q.question)

        if GENERATION_MODE == "openai" and OPENAI_API_KEY:
            qe = index.as_query_engine(
                response_mode="compact", similarity_top_k=q.top_k
            )
            resp = qe.query(_SYSTEM_HINT + "\n\nQuestion: " + q.question)
            sources = [
                n.metadata.get("source_url", "unknown")
                for n in getattr(resp, "source_nodes", [])
            ]
            answer = str(resp)
        else:
            # Retrieval-only mode
            summaries = []
            source_urls = []
            for node_with_score in nodes:
                node = getattr(node_with_score, "node", None) or node_with_score
                text = getattr(node, "text", None)
                if text is None and hasattr(node, "get_content"):
                    text = node.get_content()
                if not text:
                    continue
                summaries.append(
                    shorten(text.replace("\n", " "), width=400, placeholder="…")
                )
                source = node.metadata.get("source_url", "unknown")
                if source not in source_urls:
                    source_urls.append(source)

            if not summaries:
                return {
                    "answer": "No relevant documents retrieved.",
                    "sources": [],
                    "mode": "retrieval-only",
                }

            answer = "\n\n".join(f"• {snippet}" for snippet in summaries[:3])
            sources = source_urls[:10]

        response_time = time.time() - start_time
        validation_metrics.total_response_time += response_time

        return {
            "answer": answer,
            "sources": sources,
            "mode": GENERATION_MODE,
            "response_time_ms": response_time * 1000,
            "query_id": validation_metrics.query_count
        }

    except Exception as e:
        validation_metrics.error_count += 1
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")

@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "mode": GENERATION_MODE,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "validation_active": True
    }

@app.get("/metrics")
def metrics():
    """Get validation metrics."""
    avg_response_time = 0
    if validation_metrics.query_count > 0:
        avg_response_time = (validation_metrics.total_response_time / validation_metrics.query_count) * 1000
    
    return {
        "query_count": validation_metrics.query_count,
        "avg_response_time_ms": avg_response_time,
        "error_count": validation_metrics.error_count,
        "error_rate": validation_metrics.error_count / max(validation_metrics.query_count, 1),
        "start_time": validation_metrics.start_time,
        "uptime_seconds": time.time() - time.mktime(time.strptime(validation_metrics.start_time, "%Y-%m-%d %H:%M:%S"))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
