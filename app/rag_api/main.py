"""FastAPI service for RAG API.

- openai mode: use OpenAI via LlamaIndex if OPENAI_API_KEY is provided
- retrieval-only: summarize top-k retrieved nodes when no OpenAI key
"""

import os
import sys
from dotenv import load_dotenv
from textwrap import shorten
from dotenv import load_dotenv
from hashlib import sha1
import json
import time
from datetime import datetime

# Add the parent directory to the path to import rag_config
sys.path.append("/home/justin/llama_rag")

import chromadb
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore

# Monitoring helpers
from monitor import track_performance, get_metrics, save_metrics
from prometheus_client import Counter, generate_latest
import redis

# OpenTelemetry (optional)
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor

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
CORS_ALLOW_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "*")
AB_VARIANTS = [v.strip() for v in os.getenv("AB_VARIANTS", "A,B").split(",") if v.strip()]

# Load environment variables from .env file
load_dotenv()

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

# CORS
allow_origins = [o.strip() for o in CORS_ALLOW_ORIGINS.split(",")] if CORS_ALLOW_ORIGINS else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenTelemetry tracer (optional)
if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
    provider = TracerProvider()
    processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"], insecure=True))
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

REQUESTS = Counter("rag_requests_total", "Total RAG requests", ["route"])
RATE_LIMITED = Counter("rag_rate_limited_total", "Requests rejected due to rate limiting")

class QueryIn(BaseModel):
    question: str
    top_k: int = 10
    mode: str | None = None  # "hybrid" or None
    ab: str | None = None  # optional explicit A/B bucket

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
    raw = f"{q.question}\n{q.top_k}".encode()
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

# ----- A/B testing helpers -----
def assign_variant(identifier: str) -> str:
    if not AB_VARIANTS:
        return "A"
    h = int(sha1(identifier.encode()).hexdigest(), 16)
    return AB_VARIANTS[h % len(AB_VARIANTS)]

# ----- Analytics helpers -----
def record_query(q: QueryIn, variant: str, ip: str):
    r = get_redis()
    if not r:
        return
    try:
        rec = {
            "ts": datetime.utcnow().isoformat(),
            "q": q.question,
            "top_k": q.top_k,
            "variant": variant,
            "ip": ip,
        }
        r.lpush("rag:queries", json.dumps(rec))
        r.ltrim("rag:queries", 0, 999)
    except Exception:
        pass

class MetricsResponse(BaseModel):
    query_count: int
    avg_response_time_ms: float
    error_count: int
    error_rate: float
    last_query_time: str | None
    queries_by_hour: dict
    recent_response_times_ms: list

# ---- Corrections layer ----
import re
from pathlib import Path
from typing import List, Dict, Any

_CORRECTIONS: List[Dict[str, Any]] | None = None

def load_corrections():
    global _CORRECTIONS
    if _CORRECTIONS is not None:
        return _CORRECTIONS
    p = Path("/workspace/corrections/corrections.yaml")
    if not p.exists():
        _CORRECTIONS = []
        return _CORRECTIONS
    import yaml
    data = yaml.safe_load(p.read_text()) or []
    for item in data:
        item["_compiled"] = [re.compile(pat, re.I) for pat in item.get("patterns", [])]
    _CORRECTIONS = data
    return _CORRECTIONS

def corrections_hit(question: str):
    for item in load_corrections():
        for rx in item.get("_compiled", []):
            if rx.search(question):
                return item
    return None


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

    # Assign variant and record analytics
    variant = (q.ab or assign_variant(ip))
    record_query(q, variant, ip)

    # Offline corrections layer (no retrieval/LLM)
    hit = corrections_hit(q.question)
    if hit:
        result = {"answer": hit.get("answer",""), "sources": hit.get("sources", []), "mode": "corrections"}
        return result

    # Cache layer
    ck = cache_key_for(q)
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

        # Hybrid rerank: use BM25 across retrieved snippets to refine ordering if requested
        if (q.mode or "").lower() == "hybrid":
            try:
                from rank_bm25 import BM25Okapi
                corpus = []
                node_list = []
                for nws in nodes:
                    node = getattr(nws, "node", nws)
                    text = getattr(node, "text", None)
                    if text is None and hasattr(node, "get_content"):
                        text = node.get_content()
                    if text:
                        corpus.append(text.split())
                        node_list.append(node)
                if corpus:
                    bm = BM25Okapi(corpus)
                    scores = bm.get_scores(q.question.split())
                    # attach score to node order
                    paired = list(zip(scores, node_list))
                    paired.sort(key=lambda x: x[0], reverse=True)
                    # rebuild nodes list respecting top_k
                    nodes = [type("NS", (), {"node": nl}) for _, nl in paired[:q.top_k]]
            except Exception:
                pass

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

# Streaming endpoint (SSE-like)
from fastapi import Response
from starlette.responses import StreamingResponse

def _stream_chunks(answer: str, sources: list[str]):
    # simple chunking by lines
    for line in answer.split("\n"):
        if not line:
            continue
        yield f"data: {line}\n\n"
    yield f"data: SOURCES: {', '.join(sources[:5])}\n\n"

@app.get("/query/stream")
def query_stream(q: str, top_k: int = 10, mode: str | None = None):
    # Reuse JSON endpoint internally for consistent logic
    payload = QueryIn(question=q, top_k=top_k, mode=mode)
    # Fake a Request object: bypass auth/rate limit for streaming in this minimal implementation
    class _R: client=None
    res = query(_R(), payload)
    answer = res.get("answer", "")
    sources = res.get("sources", [])
    return StreamingResponse(_stream_chunks(answer, sources), media_type="text/event-stream")

@app.post("/query/hybrid")
@track_performance
def query_hybrid(req: Request, q: QueryIn):
    q.mode = "hybrid"
    return query(req, q)

@app.get("/ab/assign")
def ab_assign(req: Request):
    ip = req.client.host if req.client else "unknown"
    return {"variant": assign_variant(ip)}

@app.get("/analytics/queries")
def analytics_queries(limit: int = 50):
    r = get_redis()
    out = []
    if r:
        try:
            rows = r.lrange("rag:queries", 0, max(0, limit - 1))
            out = [json.loads(x) for x in rows]
        except Exception:
            out = []
    return {"queries": out}

@app.post("/admin/clear-cache")
def admin_clear_cache():
    r = get_redis()
    if not r:
        return {"cleared": 0}
    try:
        total = 0
        cursor = 0
        while True:
            cursor, keys = r.scan(cursor=cursor, match="rq:*", count=500)
            if keys:
                r.delete(*keys)
                total += len(keys)
            if cursor == 0:
                break
        return {"cleared": total}
    except Exception:
        return {"cleared": 0}

@app.post("/metrics/save")
def save_metrics_endpoint():
    save_metrics()
    return {"status": "metrics saved"}
