# RAG Runbook

This runbook covers common production operations for the RAG stack.

Prerequisites
- Docker and Docker Compose
- Python 3.10+
- Optional: Node.js (for MCP CLI checks)

Quick commands
- Health: `make health`
- Ready: `make ready`
- Goldens: `make goldens`
- Live check: `make live-check`
- Smoke: `make smoke`
- Ingest (incremental): `make ingest`

Background processes
- 5-minute poller: scripts/poll-5m.sh (nohup or tmux)
- 15-minute ingest loop: scripts/ingest-goldens-loop.sh

Deployment
- `docker compose up -d rag-api` to (re)start API service
- Logs: `docker logs -f llama_rag-rag-api-1`

Metrics
- JSON: GET /metrics
- Prometheus: GET /prometheus (scrape target)
- p95 baseline: see coordination/inbox/rag/<date>-notes.md

MCP
- Best-effort checks: `bash scripts/mcp_check.sh`
- Outputs appended to feedback/mcp.md

Validation gates
- All goldens must pass prior to declaring a change complete
- Health and readiness must be OK
- Document p95 if perf-sensitive changes are made
