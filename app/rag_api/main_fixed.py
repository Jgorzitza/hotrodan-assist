"""FastAPI shim over the shared RAG index.

Supports two modes:
- ``openai`` (default): uses OpenAI for embeddings + generation.
- ``retrieval-only``: FastEmbed embeddings paired with a simple
  retrieval response when no OpenAI key is present.
"""

import os
import sys
from dotenv import load_dotenv
from textwrap import shorten

# Add the parent directory to the path to import rag_config
sys.path.append("/home/justin/llama_rag")

import chromadb
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore

from rag_config import (
    COLLECTION,
    INDEX_ID,
    #    PERSIST_DIR,  # Unused import
    configure_settings,
)

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
    title="RAG API",
    description="Retrieval-Augmented Generation API for HotRodAN knowledge base",
    version="1.0.0",
)


class QueryIn(BaseModel):
    question: str
    top_k: int = 10


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
def query(q: QueryIn):
    """Query the RAG system with a question."""
    try:
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
            return {"answer": str(resp), "sources": sources, "mode": "openai"}

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
                "answer": "No relevant documents retrieved. Configure OPENAI_API_KEY for full responses.",
                "sources": [],
                "mode": "retrieval-only",
            }

        answer = "\n\n".join(f"• {snippet}" for snippet in summaries[:3])
        return {
            "answer": answer
            + "\n\n[LLM disabled: configure OPENAI_API_KEY for full narratives]",
            "sources": source_urls[:10],
            "mode": "retrieval-only",
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
    }


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
