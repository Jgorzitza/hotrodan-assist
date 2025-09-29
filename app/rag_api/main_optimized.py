"""FastAPI shim over the shared RAG index - Optimized Version.

Enhanced with improved logging, error handling, and type safety.
"""

import os
import sys
import logging
from textwrap import shorten
from typing import Optional, List
from datetime import datetime

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

# Import monitoring
from monitor import track_performance, get_metrics, save_metrics

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

configure_settings()

GENERATION_MODE = os.getenv("RAG_GENERATION_MODE", "openai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Determine actual mode based on API key availability
if not OPENAI_API_KEY and GENERATION_MODE == "openai":
    GENERATION_MODE = "retrieval-only"
    logger.warning("OPENAI_API_KEY not found, falling back to retrieval-only mode")

_SYSTEM_HINT = (
    "Retail EFI specialist. Cover pump sizing (LPH vs hp & fuel), "
    "return vs returnless, regulator placement, ≤10 μm pressure-side filtration, "
    "AN line sizes, PTFE-lined hose for gasoline/diesel/E85/methanol. Be concise."
)

app = FastAPI(
    title="RAG API - Optimized",
    description="Optimized Retrieval-Augmented Generation API for HotRodAN knowledge base",
    version="2.0.0",
)

class QueryIn(BaseModel):
    """Input model for query requests."""
    question: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=10, ge=1, le=50)

class QueryResponse(BaseModel):
    """Response model for query requests."""
    answer: str
    sources: List[str]
    mode: str
    response_time_ms: Optional[float] = None

@app.post("/query", response_model=QueryResponse)
@track_performance
def query(q: QueryIn):
    """Query the RAG system with a question."""
    start_time = datetime.now().timestamp()
    
    try:
        logger.info(f"Processing query: {q.question[:50]}...")
        
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
            try:
                qe = index.as_query_engine(
                    response_mode="compact", similarity_top_k=q.top_k
                )
                resp = qe.query(_SYSTEM_HINT + "

Question: " + q.question)
                sources = [
                    n.metadata.get("source_url", "unknown")
                    for n in getattr(resp, "source_nodes", [])
                ]
                
                response_time = (datetime.now().timestamp() - start_time) * 1000
                logger.info(f"OpenAI query completed in {response_time:.2f}ms")
                
                return QueryResponse(
                    answer=str(resp),
                    sources=sources,
                    mode="openai",
                    response_time_ms=response_time
                )
            except Exception as e:
                logger.error(f"OpenAI query failed: {str(e)}")
                # Fall back to retrieval-only mode
                pass

        # Retrieval-only mode
        summaries = []
        source_urls = []
        for node_with_score in nodes:
            try:
                node = getattr(node_with_score, "node", None) or node_with_score
                text = getattr(node, "text", None)
                if text is None and hasattr(node, "get_content"):
                    text = node.get_content()
                if not text:
                    continue
                    
                # Clean and shorten text
                cleaned_text = text.replace("
", " ").strip()
                if cleaned_text:
                    summaries.append(
                        shorten(cleaned_text, width=400, placeholder="…")
                    )
                    
                # Extract source URL
                source = node.metadata.get("source_url", "unknown")
                if source not in source_urls:
                    source_urls.append(source)
                    
            except Exception as e:
                logger.warning(f"Error processing node: {str(e)}")
                continue

        if not summaries:
            logger.warning("No summaries generated from retrieved nodes")
            return QueryResponse(
                answer="No relevant documents retrieved. Configure OPENAI_API_KEY for full responses.",
                sources=[],
                mode="retrieval-only",
                response_time_ms=(datetime.now().timestamp() - start_time) * 1000
            )

        # Format answer
        answer = "

".join(f"• {snippet}" for snippet in summaries[:3])
        if GENERATION_MODE == "retrieval-only":
            answer += "

[LLM disabled: configure OPENAI_API_KEY for full narratives]"
        
        response_time = (datetime.now().timestamp() - start_time) * 1000
        logger.info(f"Retrieval-only query completed in {response_time:.2f}ms")
        
        return QueryResponse(
            answer=answer,
            sources=source_urls[:10],
            mode="retrieval-only",
            response_time_ms=response_time
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"RAG query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")

@app.get("/health")
def health():
    """Health check endpoint with comprehensive status."""
    try:
        # Test index availability
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
        index_status = "loaded"
    except Exception as e:
        logger.warning(f"Index health check failed: {str(e)}")
        index_status = "error"
    
    return {
        "status": "healthy" if index_status == "loaded" else "degraded",
        "mode": GENERATION_MODE,
        "openai_available": bool(OPENAI_API_KEY),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/metrics")
def metrics():
    """Get performance metrics."""
    try:
        return get_metrics()
    except Exception as e:
        logger.error(f"Failed to get metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics")

@app.post("/metrics/save")
def save_metrics_endpoint():
    """Manually save metrics to file."""
    try:
        save_metrics()
        logger.info("Metrics saved successfully")
        return {"status": "metrics saved"}
    except Exception as e:
        logger.error(f"Failed to save metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save metrics")

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting RAG API in optimized mode...")
    logger.info(f"Generation mode: {GENERATION_MODE}")
    logger.info(f"OpenAI available: {bool(OPENAI_API_KEY)}")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info",
        access_log=True
    )
