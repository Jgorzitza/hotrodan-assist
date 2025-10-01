# MCP Integrations Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/mcp.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- See `plans/tasks.backlog.yaml` items tagged with your node id.
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/mcp.md` using the template.

## Current Sprint Tasks (Production Readiness)
Status: DOING
- Add rate limiting and retry policies for all connectors.
- Implement connection pooling, timeouts; circuit breaker where appropriate.
- Wire error tracking and metrics dashboards per connector.
Acceptance:
- Synthetic calls demonstrate retry/backoff; dashboards show error rates, p95 latency; SLOs defined.

## Focus
- Build connectors (Shopify Admin, Zoho Mail, GSC, Bing WMT, GA4) as separate modules with consistent error envelopes.
- Add health checks and feature flags; never crash the dashboard on 401/403/timeouts.
- Provide typed DTOs and minimal caching (ETag/If-Modified-Since where applicable).

## First Actions Now

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/mcp.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Finalize rate limit/retry/pooling defaults; config via env
2) Expose connector health and metrics to dashboard routes
3) Add circuit breaker dashboards + alerts
4) Write integration tests over registry + protocol contracts
5) Prepare live-connect playbook gated by creds
- Add rate limiting and retries to all connectors; set sane timeouts.
- Implement connection pooling and circuit breaker where applicable.
- Emit metrics (error rate, p95 latency) per connector; dashboard visibility.
- Append test runs + metrics screenshots to feedback/mcp.md.
