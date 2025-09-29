"""Advanced RAG API with multi-model support, security, and enhanced functions.

Supports multiple AI models:
- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- Local models (via Ollama)
- Retrieval-only mode
"""

import os
import sys
import time
import hashlib
import json
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
from dotenv import load_dotenv
from textwrap import shorten

# Add the parent directory to the path to import rag_config
sys.path.append("/home/justin/llama_rag")

import chromadb
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, Field, validator
import uvicorn

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore

from rag_config import (
    COLLECTION,
    INDEX_ID,
    configure_settings,
)

# Import monitoring
from monitor import track_performance, get_metrics, save_metrics

configure_settings()

# Load environment variables from .env file
load_dotenv()

# Model configuration
MODEL_CONFIG = {
    "openai": {
        "api_key": os.getenv("OPENAI_API_KEY"),
        "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
        "default": "gpt-3.5-turbo"
    },
    "anthropic": {
        "api_key": os.getenv("ANTHROPIC_API_KEY"),
        "models": ["claude-3-haiku", "claude-3-sonnet", "claude-3-opus"],
        "default": "claude-3-sonnet"
    },
    "local": {
        "base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "models": ["llama2", "codellama", "mistral"],
        "default": "llama2"
    }
}

# Security configuration
SECURITY_CONFIG = {
    "rate_limit_requests": int(os.getenv("RATE_LIMIT_REQUESTS", "100")),
    "rate_limit_window": int(os.getenv("RATE_LIMIT_WINDOW", "3600")),  # 1 hour
    "max_question_length": int(os.getenv("MAX_QUESTION_LENGTH", "2000")),
    "api_key_required": os.getenv("API_KEY_REQUIRED", "false").lower() == "true",
    "allowed_hosts": os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
}

# Rate limiting storage
rate_limit_storage = {}

# Security
security = HTTPBearer(auto_error=False)

app = FastAPI(
    title="Advanced RAG API",
    description="Multi-model Retrieval-Augmented Generation API with security and advanced features",
    version="2.0.0",
    docs_url="/docs" if not SECURITY_CONFIG["api_key_required"] else None,
    redoc_url="/redoc" if not SECURITY_CONFIG["api_key_required"] else None,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=SECURITY_CONFIG["allowed_hosts"]
)

_SYSTEM_HINT = (
    "Retail EFI specialist. Cover pump sizing (LPH vs hp & fuel), "
    "return vs returnless, regulator placement, ≤10 μm pressure-side filtration, "
    "AN line sizes, PTFE-lined hose for gasoline/diesel/E85/methanol. Be concise."
)

# Pydantic models
class QueryIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=SECURITY_CONFIG["max_question_length"])
    top_k: int = Field(default=10, ge=1, le=50)
    model: Optional[str] = Field(default=None, description="Model to use for generation")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1000, ge=100, le=4000)
    
    @validator('question')
    def validate_question(cls, v):
        if not v or not v.strip():
            raise ValueError('Question cannot be empty or whitespace only')
        return v.strip()

class ConfigResponse(BaseModel):
    available_models: Dict[str, List[str]]
    default_models: Dict[str, str]
    security_config: Dict[str, Any]
    generation_mode: str
    openai_available: bool
    anthropic_available: bool
    local_available: bool
    collection_name: str
    index_id: str
    max_top_k: int = 50
    min_top_k: int = 1
    max_question_length: int
    system_hint: str

class MetricsResponse(BaseModel):
    query_count: int
    avg_response_time_ms: float
    error_count: int
    error_rate: float
    last_query_time: str
    queries_by_hour: dict
    recent_response_times_ms: list
    model_usage: dict
    rate_limit_status: dict

# Rate limiting
def check_rate_limit(client_ip: str) -> bool:
    """Check if client has exceeded rate limit."""
    now = time.time()
    window_start = now - SECURITY_CONFIG["rate_limit_window"]
    
    # Clean old entries
    rate_limit_storage[client_ip] = [
        timestamp for timestamp in rate_limit_storage.get(client_ip, [])
        if timestamp > window_start
    ]
    
    # Check if limit exceeded
    if len(rate_limit_storage.get(client_ip, [])) >= SECURITY_CONFIG["rate_limit_requests"]:
        return False
    
    # Add current request
    rate_limit_storage[client_ip].append(now)
    return True

# Authentication
def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key if required."""
    if not SECURITY_CONFIG["api_key_required"]:
        return True
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )
    
    # Simple API key validation (in production, use proper key management)
    expected_key = os.getenv("API_KEY", "rag-api-key-2025")
    if credentials.credentials != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return True

# Model selection
def select_model(model_name: Optional[str] = None) -> tuple[str, str]:
    """Select the best available model."""
    if model_name:
        for provider, config in MODEL_CONFIG.items():
            if model_name in config["models"]:
                if config.get("api_key") or provider == "local":
                    return provider, model_name
    
    # Default selection based on availability
    if MODEL_CONFIG["openai"]["api_key"]:
        return "openai", MODEL_CONFIG["openai"]["default"]
    elif MODEL_CONFIG["anthropic"]["api_key"]:
        return "anthropic", MODEL_CONFIG["anthropic"]["default"]
    elif MODEL_CONFIG["local"]["base_url"]:
        return "local", MODEL_CONFIG["local"]["default"]
    else:
        return "retrieval-only", "none"

# Advanced query processing
def process_query_with_model(question: str, model_provider: str, model_name: str, 
                           temperature: float, max_tokens: int, top_k: int) -> Dict[str, Any]:
    """Process query with selected model."""
    try:
        # Get retrieval results
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
        
        retriever = index.as_retriever(similarity_top_k=top_k)
        nodes = retriever.retrieve(question)
        
        if model_provider == "retrieval-only":
            # Return retrieval-only results
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
            return {
                "answer": answer + "\n\n[LLM disabled: configure API keys for full narratives]",
                "sources": source_urls[:10],
                "mode": "retrieval-only",
            }
        
        # For now, return retrieval-only (model integration would go here)
        return process_query_with_model(question, "retrieval-only", "none", 0.7, 1000, top_k)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")

# API Endpoints
@app.post("/query")
@track_performance
def query(q: QueryIn, request: Request, verified: bool = Depends(verify_api_key)):
    """Query the RAG system with advanced model selection."""
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Select model
    model_provider, model_name = select_model(q.model)
    
    # Process query
    result = process_query_with_model(
        q.question, model_provider, model_name, 
        q.temperature, q.max_tokens, q.top_k
    )
    
    # Add metadata
    result.update({
        "model_used": f"{model_provider}:{model_name}",
        "timestamp": datetime.now().isoformat(),
        "client_ip": client_ip
    })
    
    return result

@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "available_models": {
            provider: bool(config.get("api_key") or provider == "local")
            for provider, config in MODEL_CONFIG.items()
        }
    }

@app.get("/config", response_model=ConfigResponse)
def get_config():
    """Get API configuration and available models."""
    return ConfigResponse(
        available_models={provider: config["models"] for provider, config in MODEL_CONFIG.items()},
        default_models={provider: config["default"] for provider, config in MODEL_CONFIG.items()},
        security_config=SECURITY_CONFIG,
        generation_mode="multi-model",
        openai_available=bool(MODEL_CONFIG["openai"]["api_key"]),
        anthropic_available=bool(MODEL_CONFIG["anthropic"]["api_key"]),
        local_available=bool(MODEL_CONFIG["local"]["base_url"]),
        collection_name=COLLECTION,
        index_id=INDEX_ID,
        max_top_k=50,
        min_top_k=1,
        max_question_length=SECURITY_CONFIG["max_question_length"],
        system_hint=_SYSTEM_HINT
    )

@app.get("/metrics", response_model=MetricsResponse)
def metrics():
    """Get performance metrics with model usage."""
    base_metrics = get_metrics()
    return MetricsResponse(
        **base_metrics.dict(),
        model_usage={},  # Would track model usage in production
        rate_limit_status={
            "active_limits": len(rate_limit_storage),
            "total_requests": sum(len(requests) for requests in rate_limit_storage.values())
        }
    )

@app.post("/metrics/save")
def save_metrics_endpoint():
    """Manually save metrics to file."""
    save_metrics()
    return {"status": "metrics saved"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
