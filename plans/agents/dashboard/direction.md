# Dashboard Engineer (Shopify Admin / Remix + Polaris) — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/dashboard.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- Backlog: `dashboard.settings-v1` (see `plans/tasks.backlog.yaml`).
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `MCP_FORCE_MOCKS` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/dashboard.md` using the template.

## Current Sprint Tasks (Production Readiness)
Status: DOING
- Remove `MCP_FORCE_MOCKS` toggles; integrate live MCP data.
- Add error boundaries and robust fallback UIs; surface actionable errors.
- Harden security headers (CSP), no inline scripts; sanitize inputs.
Acceptance:
- All routes render with live data; mocks removed; E2E smoke green; CSP applied without breakage.

## Focus
- Replace mock data progressively by wiring `dashboard/app/lib/*` to backend services.
- Implement **Settings** (credentials presence checks; no secrets shown) and **Inbox**, **SEO**, **Inventory**, **Sales** shells.
- Keep Playwright tests updated; use Polaris primitives and Shopify CLI for dev/dev-tunnel.

## Auth Reset Plan (Option 1 — Shopify Remix Template)
**Goal:** rebuild the dashboard app on top of Shopify’s maintained Remix template so embedded auth, token exchange, and session storage match the official implementation while preserving our MCP integrations and domain logic.

### Pre-flight & Safety Net
1. Snapshot the current state:
   - Confirm `git status -sb` shows only intentional dashboard edits; stash or commit any WIP not related to the auth reset.
   - Copy `.env`, `dashboard/.env`, and `dashboard/shopify.app.toml` to a safe location so secrets survive the scaffold.
   - Export a list of custom files we must reapply (e.g., `dashboard/app/lib/**`, custom routes, tests) and drop it in `coordination/inbox/dashboard/<date>-notes.md` for traceability.

2. Create a scratch workspace directory (`tmp/dashboard-template` or similar) to hold the Shopify-generated project while we merge.

### Scaffold the Official Template
3. From repo root run:
   ```bash
   cd tmp
   shopify app init hran-dashboard-reset --template=remix
   ```
   - When prompted, choose the same partner org/app the current project uses.
   - Verify the scaffold contains `/app/routes/auth.*`, `/app/shopify.server.ts`, and `/app/session.server.ts` (the canonical auth pieces).

4. Sync CLI config:
   ```bash
   cd hran-dashboard-reset
   shopify app config link --client-id e3a2bf5f152861dba209c58ee7f92ae5
   ```
   - Update the generated `shopify.app.toml` using values from our saved copy (application_url, scopes, redirect URLs, `embedded=true`, `use_legacy_install_flow=false`).

### Migrate Our App Onto the Template
5. Replace the existing `dashboard/` directory methodically:
   - Move the template into the repo: `rsync -a --delete hran-dashboard-reset/ ../dashboard/` (keep `.git` metadata from our repo, not the template).
   - Restore our saved `.env` and `shopify.app.toml` values; ensure secrets live only in local files, not committed.

6. Re-introduce custom code in controlled layers:
   - Reapply domain logic (`app/lib/**`, `app/routes/**` other than the template’s auth routes) by copying files in small batches and running `git diff` after each batch.
   - Keep the template’s auth-related files intact (`app/routes/auth*`, `app/session.server.ts`, `app/shopify.server.ts`). Only extend extension points (e.g., add MCP hooks) without rewriting the scaffold logic.
   - Restore Playwright/Vitest config (`vitest.config.ts`, `test/setup.ts`), MCP client modules, and Prisma schema/files.
   - Update imports to match template structure (e.g., new path aliases or session helpers).

7. Reinstall dependencies at the dashboard root to pick up template versions:
   ```bash
   npm --prefix dashboard install
   npm --prefix dashboard run prisma:generate
   ```

### Verification & Cleanup
8. Run template smoke checks before custom logic:
   ```bash
   npm --prefix dashboard run lint
   ENABLE_MCP=true MCP_FORCE_MOCKS=true \
     npx --prefix dashboard vitest run --config dashboard/vitest.config.ts \
     "dashboard/app/routes/__tests__/auth*.test.ts?(x)"
   ```
   - Fix any immediate issues before proceeding.

9. Reintroduce MCP + feature tests gradually (inventory, sales, SEO). Use live-mode env toggles only after mock suites pass.

10. Execute the full auth install flow: `shopify app dev --reset --store hotroddash.myshopify.com`, approve the install in the partner dev store, and confirm the embedded Admin loads without redirects. Capture evidence (command output + iframe screenshot path) in `feedback/dashboard.md` and the daily inbox.

11. Verify all vitest bundles and (optionally) Playwright smoke succeed with mocks, then rerun the live MCP test to ensure token exchange persists sessions.

12. Once satisfied, remove the temporary scaffold directory, ensure `git status` shows only deliberate changes, and prepare a migration summary commit (auth scaffold + reintegrated features) for review.

## First Actions Now
- You have scaffolded the template and begun lint cleanup. Continue from the Auth Reset Plan at steps 5–10:
  1. Ensure the template auth files match upstream: copy `tmp/hran-dashboard-reset/app/routes/auth*`, `app/session.server.ts`, and `app/shopify.server.ts` over the `dashboard/` versions if they drifted. Record any edits you keep (e.g., MCP hooks) in the inbox note.
  2. Align environment variables for Prisma: add `DATABASE_URL`, `DIRECT_URL`, and (if needed) `SHADOW_DATABASE_URL` to both `.env` and `.env.example`, reusing the existing Postgres connection string (DIRECT_URL should be the plain Postgres URL without the `postgresql+psycopg2` driver prefix). Do **not** commit secrets.
  3. Run `npm --prefix dashboard run prisma:generate` and re-run the CLI prep:
     ```bash
     shopify app dev --reset --store hotroddash.myshopify.com --client-id e3a2bf5f152861dba209c58ee7f92ae5
     ```
     Capture the tunnel URL, prisma migrate output, and any prompts in feedback + inbox.
  4. Update vitest targets: run the core suites that exist in this repo (mcp, settings, inventory, sales) instead of the missing `auth*.test.ts` glob. Example:
     ```bash
     ENABLE_MCP=true MCP_FORCE_MOCKS=true \
       npx --prefix dashboard vitest run --config dashboard/vitest.config.ts \
       "dashboard/app/lib/mcp/__tests__/*.test.ts" \
       "dashboard/app/lib/settings/__tests__/*.test.ts" \
       "dashboard/app/routes/__tests__/app.inventory*.test.ts?(x)" \
       "dashboard/app/routes/__tests__/app.sales.test.ts"
     ```
  5. Remove the temporary scaffold directory (`rm -rf tmp/hran-dashboard-reset`) once the template files are fully merged and documented.
- Log each command, output, and resulting diff in `coordination/inbox/dashboard/2025-10-02-notes.md` and summarize in `feedback/dashboard.md`.
- Surface blockers immediately (e.g., prisma migrate failures after setting DIRECT_URL, App Bridge auth mismatches) so Manager can respond.

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/dashboard.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-02 21:45 UTC)
1) Complete Shopify template scaffold (Auth Reset Plan steps 1–4) and document outputs.
2) Merge template into `dashboard/` while preserving auth files; reapply custom libs/routes in small batches with diffs captured.
3) Restore MCP features and vitest/Playwright harnesses; ensure mock-mode suites pass before toggling live data.
4) Run `shopify app dev --reset --store hotroddash.myshopify.com`, execute the embedded install, and capture proof the iframe loads on the new scaffold.
5) Re-run targeted vitest bundles (mocks + live MCP) and summarize results + remaining gaps in `feedback/dashboard.md`.
- Keep MCP feature toggles (`ENABLE_MCP`, `MCP_FORCE_MOCKS`) consistent while migrating; do not regress existing loaders.
- Log every step (commands, file moves, test runs) in the dashboard inbox and feedback file for auditability.
- Flag blockers immediately (template mismatch, CLI prompts, session errors) so Manager can intervene.

## Production Today — Priority Override (2025-10-01)

## Partner Dev Setup via Shopify CLI — Today

Goal: Link this repo to the new Partner app and dev store, run dev with the Shopify CLI, and validate embedded OAuth without breaking MCP.

Steps (CLI-first; use in dashboard/ unless noted):
1) Poll and restate focus (5 min cadence)
- Read coordination/GO-SIGNAL.md and this direction file, then append a brief focus update to coordination/inbox/dashboard/$(date -I)-notes.md before starting.

2) Shopify CLI auth (login/logout as needed)
```bash
shopify whoami || true
# If needed:
shopify logout || true
shopify login --store {{your-dev-store.myshopify.com}}
shopify whoami
```

3) Link local project to the Partner app
- Option A (recommended): link via app client_id (API key)
```bash
shopify app config link --client-id {{YOUR_API_KEY}}
```
- Option B (interactive): pick the app when prompted by dev
```bash
shopify app dev --store {{your-dev-store.myshopify.com}}
```

4) Update URLs and run dev via CLI
- Let the CLI update application_url and redirects automatically (it may tunnel for you).
```bash
shopify app dev --store {{your-dev-store.myshopify.com}}
```
- If you prefer the existing cloudflared flow, run:
```bash
APP_PORT=8080 TUNNEL_TOOL=cloudflared RUN_CHECKS=1 scripts/prepare_dashboard_dev.sh
# then push the config if needed
shopify app config push --path dashboard
```

5) Validate embedded Admin and metrics
```bash
# Open the Admin via the dev install prompt, complete OAuth, and ensure the embedded UI loads
# Verify metrics endpoint responds 200
curl -sI "$SHOPIFY_APP_URL/app/metrics" | head -n1
```

6) MCP readiness (mock suites first)
```bash
# Ensure Prisma client for tests
npx prisma generate --schema dashboard/prisma/schema.prisma
# Run MCP client + settings connection tests (mock acceptable while live creds evolve)
ENABLE_MCP=true MCP_FORCE_MOCKS=${MCP_FORCE_MOCKS:-true} \
  npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  "dashboard/app/lib/mcp/__tests__/*.test.ts" \
  "dashboard/app/lib/settings/__tests__/connection-tests.test.ts"
```

7) Live MCP validation (temporary local workflow)
```bash
# Bootstrap creds if ~/.mcp-auth is empty
npx -y mcp-remote@latest https://tired-green-ladybug.fastmcp.app/mcp || true

export MCP_CLIENT_ID=$(jq -r '.client_id' ~/.mcp-auth/mcp-remote-*/a960bca2d6b1f85744bfe7369d47c9b6_client_info.json)
export MCP_REFRESH_TOKEN=$(jq -r '.refresh_token' ~/.mcp-auth/mcp-remote-*/a960bca2d6b1f85744bfe7369d47c9b6_tokens.json)
export MCP_API_URL="https://tired-green-ladybug.fastmcp.app/mcp"
export MCP_API_KEY="$(scripts/fetch_mcp_token.sh)"
ENABLE_MCP=true MCP_FORCE_MOCKS=false   npx vitest run --root dashboard --config dashboard/vitest.config.ts   "dashboard/app/lib/mcp/__tests__/live-connection.test.ts"
```
  If jq cannot locate the files, run `ls ~/.mcp-auth/mcp-remote-*` to identify the correct directory. Log token length + vitest summary in coordination/inbox/dashboard notes (never paste the token itself).

8) Proof-of-work (5-minute cadence)
- Append commands, outputs, tunnel URL, OAuth status, and test results to coordination/inbox/dashboard/$(date -I)-notes.md
- Summarize in feedback/dashboard.md

If blocked
- Record blocker in coordination/inbox/dashboard/$(date -I)-notes.md with exact command/output, then proceed with fallback tasks from this direction (CSP/error boundaries, MCP loaders, Playwright smoke).

Goals (EOD):
- Embedded Admin loads via Cloudflare tunnel; key routes use live MCP behind feature flags; CSP and error boundaries enforced; /api/health and /app/metrics verified.

Tasks (EOD):
1) Capture Cloudflare tunnel and update application_url/redirects (scripts/prepare_dashboard_dev.sh); verify tunnel returns 200; record URL in coordination/inbox/dashboard/2025-10-01-notes.md.
2) Remove `MCP_FORCE_MOCKS` from home and settings routes; enable MCP-backed loaders behind feature flag with graceful fallback.
3) Use `scripts/fetch_mcp_token.sh` to fetch a live MCP_API_KEY, then rerun loaders/settings tests with `MCP_FORCE_MOCKS=false` and record evidence.
4) Enforce CSP and add error boundaries across routes; run Playwright smoke (settings + one route each).

Acceptance:
- HEAD on tunnel returns 200 and Admin iframe renders.
- Server + UI tests pass; Playwright smoke succeeds.
- No inline script violations; degraded states show actionable messages.

### CEO Dependencies — Today
- Approve/confirm target domain for embedded Admin if not using the Cloudflare tunnel long-term. Provide final production application_url if different from tunnel.

## Backlog / Secondary Work
- Expand smoke documentation (E2E scripts, /api/mcp/health runbook) and update `dashboard/data-integration-guide.md` as fixes land.
- Harden telemetry dashboards (add error counters, circuit-breaker logs) and archive snapshots in `artifacts/phase3/dashboard/`.
- Review outstanding repo diffs touching dashboard/ for merge readiness; prep isolated patches once blockers clear.

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
