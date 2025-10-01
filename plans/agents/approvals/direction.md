# Approvals & Inbox Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/approvals.md` instead.
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
- Append to `feedback/approvals.md` using the template.

## Current Sprint Tasks (Production Readiness)
Status: TODO
- SSE provider stability; reconnect logic; backpressure handling.
- Audit logging for all actions; PII redaction checks.
- Error handling surfaces; actionable guidance for failures.
Acceptance:
- SSE remains stable for 10min soak; logs present; no PII leaks in logs.

## Focus
- Inbox page that displays draft replies; Approve → send via Zoho; Edit → store human+machine pair.
- Telemetry: approval rate, edit distance, average time-to-approve.
- Integration: reads drafts from `rag` and posts decisions back to storage.

## First Actions Now
- Stabilize SSE provider: reconnect, backpressure, error surfaces.
- Add audit logs; verify PII redaction.
- Append soak test outcomes to feedback/approvals.md.
