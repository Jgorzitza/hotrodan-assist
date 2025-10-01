"""FastAPI service for RAG API.

- openai mode: use OpenAI via LlamaIndex if OPENAI_API_KEY is provided
- retrieval-only: summarize top-k retrieved nodes when no OpenAI key
"""

import os
from textwrap import shorten
from dotenv import load_dotenv
from hashlib import sha1
import json
import time

import chromadb
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore

# Monitoring helpers
from monitor import track_performance, get_metrics, save_metrics
from prometheus_client import Counter, generate_latest
import redis

# Load .env for container and local runs
load_dotenv()

# Resolve storage/collection settings from environment
CHROMA_PATH = os.getenv("CHROMA_PATH", "/workspace/chroma")
PERSIST_DIR = os.getenv("PERSIST_DIR", "/workspace/storage")
COLLECTION = os.getenv("COLLECTION", "hotrodan")
INDEX_ID = os.getenv("INDEX_ID", "hotrodan")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
RAG_CACHE_TTL = int(os.getenv("RAG_CACHE_TTL", "600"))
RAG_RATE_LIMIT_PER_MIN = int(os.getenv("RAG_RATE_LIMIT_PER_MIN", "120"))
RAG_REQUIRE_AUTH = os.getenv("RAG_REQUIRE_AUTH", "false").lower() == "true"
RAG_API_TOKEN = os.getenv("RAG_API_TOKEN", "")

GENERATION_MODE = os.getenv("RAG_GENERATION_MODE", "openai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Configure LlamaIndex models
from llama_index.core import Settings as LISettings

if OPENAI_API_KEY and GENERATION_MODE == "openai":
    try:
        from llama_index.llms.openai import OpenAI as OpenAI_LLM
        from llama_index.embeddings.openai import OpenAIEmbedding
        LISettings.llm = OpenAI_LLM(model=os.getenv("RAG_LLM_MODEL", "gpt-4o-mini"))
        LISettings.embed_model = OpenAIEmbedding(model=os.getenv("RAG_EMBED_MODEL", "text-embedding-3-small"))
    except Exception:
        GENERATION_MODE = "retrieval-only"
        from llama_index.embeddings.fastembed import FastEmbedEmbedding
        LISettings.embed_model = FastEmbedEmbedding(model_name=os.getenv("FASTEMBED_MODEL", "BAAI/bge-small-en-v1.5"))
else:
    # retrieval-only (or missing key): ensure local embedding model for query vectors
    from llama_index.embeddings.fastembed import FastEmbedEmbedding
    LISettings.embed_model = FastEmbedEmbedding(model_name=os.getenv("FASTEMBED_MODEL", "BAAI/bge-small-en-v1.5"))

_SYSTEM_HINT = (
    "Retail EFI specialist. Cover pump sizing (LPH vs hp & fuel), "
    "return vs returnless, regulator placement, ≤10 μm pressure-side filtration, "
    "AN line sizes, PTFE-lined hose for gasoline/diesel/E85/methanol. Be concise."
)

app = FastAPI(
    title="RAG API",
    description="Retrieval-Augmented Generation API",
    version="1.0.0",
)

REQUESTS = Counter("rag_requests_total", "Total RAG requests", ["route"])
RATE_LIMITED = Counter("rag_rate_limited_total", "Requests rejected due to rate limiting")

class QueryIn(BaseModel):
    question: str
    top_k: int = 10

# ----- Redis helpers -----
_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(REDIS_URL)
        except Exception:
            _redis_client = None
    return _redis_client


def cache_key_for(q: QueryIn) -> str:
    raw = f"{q.question}\n{k}".encode()
    return "rq:" + sha1(raw).hexdigest()


def cache_get(k: str):
    r = get_redis()
    if not r:
        return None
    try:
        v = r.get(k)
        return json.loads(v) if v else None
    except Exception:
        return None


def cache_set(k: str, value: dict, ttl: int = RAG_CACHE_TTL):
    r = get_redis()
    if not r:
        return
    try:
        r.setex(k, ttl, json.dumps(value))
    except Exception:
        pass


def ip_rate_limited(ip: str) -> bool:
    r = get_redis()
    if not r:
        return False
    try:
        key = f"rl:{ip}:{int(time.time()//60)}"
        n = r.incr(key)
        if n == 1:
            r.expire(key, 65)
        return n > RAG_RATE_LIMIT_PER_MIN
    except Exception:
        return False

class MetricsResponse(BaseModel):
    query_count: int
    avg_response_time_ms: float
    error_count: int
    error_rate: float
    last_query_time: str | None
    queries_by_hour: dict
    recent_response_times_ms: list

@app.post("/query")
@track_performance
def query(req: Request, q: QueryIn):
    # Optional bearer auth
    if RAG_REQUIRE_AUTH:
        auth = req.headers.get("authorization", "")
        if not (auth.startswith("Bearer ") and auth.split(" ",1)[1] == RAG_API_TOKEN):
            raise HTTPException(status_code=401, detail="Unauthorized")

    # Rate limiting by client IP
    ip = req.client.host if req.client else "unknown"
    if ip_rate_limited(ip):
        RATE_LIMITED.inc()
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    REQUESTS.labels(route="query").inc()

    # Cache layer
    ck = "rq:" + sha1(f"{q.question}\n{q.top_k}".encode()).hexdigest()
    cached = cache_get(ck)
    if cached:
        return cached
    REQUESTS.labels(route="query").inc()
    try:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        collection = client.get_or_create_collection(
            COLLECTION, metadata={"hnsw:space": "cosine"}
        )
        vector_store = ChromaVectorStore(chroma_collection=collection)
        storage = StorageContext.from_defaults(
            vector_store=vector_store, persist_dir=PERSIST_DIR
        )
        index = load_index_from_storage(storage, index_id=INDEX_ID)

        retriever = index.as_retriever(similarity_top_k=q.top_k)
        nodes = retriever.retrieve(q.question)

        if GENERATION_MODE == "openai" and OPENAI_API_KEY:
            qe = index.as_query_engine(response_mode="compact", similarity_top_k=q.top_k)
            resp = qe.query(_SYSTEM_HINT + "\n\nQuestion: " + q.question)
            sources = [
                n.metadata.get("source_url", "unknown")
                for n in getattr(resp, "source_nodes", [])
            ]
            result = {"answer": str(resp), "sources": sources, "mode": "openai"}
            cache_set(ck, result)
            return result

        summaries = []
        source_urls = []
        for node_with_score in nodes:
            node = getattr(node_with_score, "node", None) or node_with_score
            text = getattr(node, "text", None)
            if text is None and hasattr(node, "get_content"):
                text = node.get_content()
            if not text:
                continue
            summaries.append(shorten(text.replace("\n", " "), width=400, placeholder="…"))
            src = node.metadata.get("source_url", "unknown")
            if src not in source_urls:
                source_urls.append(src)

        if not summaries:
            return {
                "answer": "No relevant documents retrieved. Configure OPENAI_API_KEY for full responses.",
                "sources": [],
                "mode": "retrieval-only",
            }

        answer = "\n\n".join(f"• {s}" for s in summaries[:3])
        result = {
            "answer": answer + "\n\n[LLM disabled: configure OPENAI_API_KEY for full narratives]",
            "sources": source_urls[:10],
            "mode": "retrieval-only",
        }
        cache_set(ck, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "mode": GENERATION_MODE,
        "openai_available": bool(OPENAI_API_KEY),
    }

@app.get("/ready")
def ready():
    try:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space": "cosine"})
        _ = collection.count()
        ok = True
    except Exception:
        ok = False
    return {"ready": ok}

@app.get("/metrics", response_model=MetricsResponse)
def metrics():
    return get_metrics()

@app.get("/prometheus")
def prometheus_metrics():
    return PlainTextResponse(generate_latest().decode("utf-8"))

@app.post("/metrics/save")
def save_metrics_endpoint():
    save_metrics()
    return {"status": "metrics saved"}
