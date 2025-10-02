# RAG API Documentation

This document summarizes the production RAG API currently running under Docker Compose on port 8001.

Endpoints
- POST /query
  - Body: { "question": string, "top_k"?: number }
  - Behavior: Retrieval-only if OPENAI_API_KEY invalid/absent; otherwise OpenAI-backed. Returns { answer, sources[], mode }

- POST /query/hybrid
  - Body: { "question": string, "top_k"?: number }
  - Behavior: Hybrid mode with BM25 rerank across retrieved snippets; returns { answer, sources[], mode }

- GET /query/stream
  - Params: q (string), top_k (number), mode? ("hybrid"|undefined)
  - Behavior: SSE stream of compact answer lines + final SOURCES summary.

- GET /health
  - Returns API health snapshot and whether OpenAI is available.

- GET /ready
  - Returns { ready: boolean } based on Chroma collection availability.

- GET /metrics
  - JSON metrics (query_count, avg_response_time_ms, error_rate, etc.).

- GET /prometheus
  - Prometheus-format metrics for scraping.

- GET /ab/assign
  - Returns { variant } (A/B bucket assignment based on client IP hash).

- GET /analytics/queries
  - Returns recent query analytics stored in Redis (LRU window ~1000 records).

- POST /admin/clear-cache
  - Evicts cached query responses from Redis (keys rq:*).

Request/Response Examples
- POST /query
  - Body: { "question": "What micron filter should I run for EFI?", "top_k": 8 }
  - Response: {
      "answer": "• …\n\n[LLM disabled: configure OPENAI_API_KEY for full narratives]",
      "sources": [ "https://hotrodan.com/…" ],
      "mode": "retrieval-only"
    }

Environment Variables
- PORT: API port (default 8001)
- UVICORN_WORKERS: number of worker processes (default 1)
- CHROMA_PATH: path for Chroma persistence (default /workspace/chroma)
- PERSIST_DIR: LlamaIndex persistence dir (default /workspace/storage)
- COLLECTION: Chroma collection name (default hotrodan)
- INDEX_ID: LlamaIndex index id (default hotrodan)
- OPENAI_API_KEY: OpenAI API key; if missing/invalid, falls back to retrieval-only
- RAG_GENERATION_MODE: "openai" or "retrieval-only" (auto-falls back if key invalid)
- FASTEMBED_MODEL: embedding model for retrieval-only (default BAAI/bge-small-en-v1.5)
- REDIS_URL: Redis connection URL (default redis://redis:6379/0)
- RAG_CACHE_TTL: cache TTL seconds (default 600)
- RAG_RATE_LIMIT_PER_MIN: per-IP request/min (default 120)
- RAG_REQUIRE_AUTH: set to "true" to require bearer token
- RAG_API_TOKEN: token value when auth required
- CORS_ALLOW_ORIGINS: comma-separated origins for CORS
- OTEL_EXPORTER_OTLP_ENDPOINT: enable OTLP tracing export when set

Operational Notes
- Ingest + goldens loop runs every ~15 minutes via scripts/ingest-goldens-loop.sh
- 5-minute GO-SIGNAL/direction poller runs via scripts/poll-5m.sh
- Retrieval uses Chroma + LlamaIndex; retrieval-only mode summarizes top-k snippets and returns sources.

Validation & Monitoring
- Goldens: run `python3 run_goldens.py` in repo root – must pass before declaring changes complete.
- Health/Readiness: /health and /ready must be OK before considering service available.
- p95 Baseline: Measured over repeated POST /query calls; documented in coordination notes.

Security
- Optional bearer auth; rate limiting; CORS control; no secrets printed in logs or terminal.

Change Log
- 2025-10-01: initial documentation authored by RAG engineer agent covering endpoints, env, and ops.
