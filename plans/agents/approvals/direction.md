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
- Backlog: `approvals.loop-v1` (see `plans/tasks.backlog.yaml`).
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `MCP_FORCE_MOCKS` toggle working until connectors are live.
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
- Stop the manual SSE probes. Validate the automated handshake test and log proof:
  1. Confirm the fix exists (`app/assistants/main.py` yields `event: handshake\ndata: ...` before the loop).
  2. Run the targeted pytest once:
     ```bash
     PYTHONPATH=. .venv_assistants/bin/pytest app/assistants/tests/test_api.py -k handshake -vv --maxfail=1 --log-cli-level=INFO
     ```
  3. Paste the command, duration, and result into `feedback/approvals.md` and today’s approvals inbox entry.
  4. Send the log to QA so they can rerun and sign off. Do **not** launch custom asyncio scripts unless Manager requests it.
- After QA confirms the fix, return to SSE/UI tasks:
  - Run the 10-minute SSE soak using the existing harness and log timestamps + stats in notes.
  - Finish the `sse_online` banner work in templates/index.html + draft.html and capture screenshots or tests.
- Only re-run curl/docker diagnostics if the pytest or soak fails; otherwise stay on the scripted workflow above.


## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/approvals.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) SSE stability: reconnect/backpressure/error surfaces (include curl + docker log evidence each cycle)
2) Audit logging + PII redaction
3) Assistants smoke when base reachable; verify approve/edit 303 flow
4) Add /health and /ready endpoints to approval-app
5) Append soak results to feedback/approvals.md (with start/end timestamps and error counts)
- Stabilize SSE provider: reconnect, backpressure, error surfaces (log evidence from curl + compose logs).
- Add audit logs; verify PII redaction.
- Append soak test outcomes (timestamped) to feedback/approvals.md.

## Production Today — Priority Override (2025-10-01)

Goals (EOD):
- SSE stable (10‑minute soak) OR UI gated gracefully; audit logging + PII redaction active; /health and /ready verified.

Tasks (EOD):
1) Verify ASSISTANTS_BASE and curl SSE; implement reconnect/backpressure/error surfaces; record 10‑minute soak result.
2) Add audit logs with PII redaction; attach masked sample logs to feedback/approvals.md.
3) Verify /health and /ready endpoints; add to runbook.

Acceptance:
- SSE soak passes without disconnects OR gating banner active with clear messaging.
- Audit log sample shows masked PII.
- /health and /ready return 200.

### CEO Dependencies — Today
- Provide ASSISTANTS_BASE only if service is hosted behind a CEO-controlled URL; otherwise proceed with local/compose defaults.

## Backlog / Secondary Work
- Capture additional SSE soak analytics (event samples, ping/data ratios) and attach artifacts for triage.
- Document the offline banner UX and error-handling flow in approvals README/runbooks.
- Draft test harness for future webhook integrations (Zoho/Assistants) while waiting on live endpoints.

## Automation & Monitoring
- Keep local scripts running (where applicable) to provide real-time stats (health_grid, live_check, soak harness).
- If automation reveals regressions, log blockers immediately and pivot to remediation tasks.

## Execution Policy (no permission-seeking)
- Treat this `direction.md` as **pre-approval**. Do not ask to proceed.
- Every cycle must end in one of two outcomes:
  1) **PR-or-Commit**: open a PR (or local commit if PRs are off) with code + artifacts, **and** append a one-line status to `feedback/<agent>.md` (PR/commit id, molecule id).
  2) **Concrete Blocker**: append a one-line blocker to `feedback/<agent>.md` with required input/credential AND immediately switch to your next assigned molecule.
- **Forbidden phrases:** "should I proceed", "wait for approval", "let me know if you want", "next up", "next steps", "suggested next steps".
- **Forbidden behavior:** any plan-only/summary message that lacks (a) a PR/commit id, or (b) a concrete blocker + immediate switch to next molecule.
- When `direction.md` changes: checkpoint, re-read, adjust, continue (do **not** wait for chat).
- Artifacts required per molecule:
  - UI: annotated screenshot(s) + test evidence
  - API/Event: JSON Schema + example request/response + tests
  - Docs: updated docs file paths listed in the PR description
