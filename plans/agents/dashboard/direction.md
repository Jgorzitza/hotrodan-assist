# Dashboard Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## ✅ TASK COMPLETE - NEXT PHASE READY
**CURRENT STATUS**: ✅ dashboard.advanced-features COMPLETE
**NEXT TASK**: dashboard.cloudflare-tunnel-fix (CRITICAL PRIORITY)

**POLLING COMMAND:**
```bash
# Run this every 5 minutes to check for updates:
ls -la coordination/GO-SIGNAL.md plans/agents/dashboard/direction.md
```

**IMMEDIATE ACTION REQUIRED:**
1. **START WORKING NOW** - dashboard.cloudflare-tunnel-fix
2. **DO NOT WAIT** - You have approved work to do
3. **CONTINUE WORKING** - While checking for updates every 5 minutes
4. **REPORT PROGRESS** - Submit feedback when work complete

## CURRENT TASK: dashboard.cloudflare-tunnel-fix (CRITICAL FIX)
**Status**: READY TO START
**Priority**: CRITICAL - Fix Cloudflare tunnel URL configuration
**Estimated Time**: 30-60 minutes

## 🚨 CRITICAL ISSUE IDENTIFIED
**Problem**: Shopify app is using hardcoded URL `https://hotrodan.com/dashboard` in shopify.app.toml
**Reality**: Shopify app dev creates dynamic Cloudflare tunnel URLs (e.g., `https://xyz.trycloudflare.com`)
**Result**: App refuses to connect because URL mismatch

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- 🆕 Fix shopify.app.toml application_url configuration
- 🆕 Ensure dynamic tunnel URL is used correctly
- 🆕 Test Shopify app accessibility via correct tunnel URL
- 🆕 Verify app loads properly in Shopify Admin
- 🆕 Update configuration to handle dynamic URLs
- 🆕 Document the correct URL setup process

## Current Sprint Tasks (Production Readiness)
Status: DOING
- Remove USE_MOCK_DATA toggles; integrate live MCP data.
- Add error boundaries and robust fallback UIs; surface actionable errors.
- Harden security headers (CSP), no inline scripts; sanitize inputs.
Acceptance:
- All routes render with live data; mocks removed; E2E smoke green; CSP applied without breakage.

## Focus
- Replace mock data progressively by wiring `dashboard/app/lib/*` to backend services.
- Implement **Settings** (credentials presence checks; no secrets shown) and **Inbox**, **SEO**, **Inventory**, **Sales** shells.
- Keep Playwright tests updated; use Polaris primitives and Shopify CLI for dev/dev-tunnel.

## First Actions Now
- Run the dashboard prep (captures Cloudflare tunnel, updates application_url + redirects, sets ASSISTANTS_BASE, optional lint/tests):

```bash
APP_PORT=8080 TUNNEL_TOOL=cloudflared RUN_CHECKS=1 \
  scripts/prepare_dashboard_dev.sh
```

- Run dashboard vitest subsets (server + UI with shims) and MCP mocks:
```bash
npx prisma generate --schema dashboard/prisma/schema.prisma
ENABLE_MCP=true USE_MOCK_DATA=true MCP_FORCE_MOCKS=true \
  npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  "dashboard/app/**/__tests__/**/*.test.ts?(x)"
```

- Minimal E2E smoke (optional while UI deps policy B is in effect):
```bash
npm run -s test:e2e
```

- Then open the embedded Admin in a browser to validate the iframe loads using the printed tunnel URL.

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/dashboard.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Remove USE_MOCK_DATA from routes; MCP-backed loaders behind feature flags
2) Fix failing mocks histogram test; expand Playwright smoke (settings + one route each)
3) Enforce CSP and headers; remediate any inline usage
4) Add /api/health, /app/metrics routes fully verified
5) Tunnel capture procedure doc; verify Admin loads end-to-end
- Remove USE_MOCK_DATA toggles; route data through MCP-backed loaders.
- Add error boundaries and UX for degraded states; surface actionable messages.
- Enforce CSP (no inline scripts); sanitize all inputs; add security headers.
- Update Playwright smoke to cover settings + one route per feature.
- Append results to feedback/dashboard.md.

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

6) MCP readiness (must be loaded fully; mock vs live ok)
```bash
# Ensure Prisma client for tests
npx prisma generate --schema dashboard/prisma/schema.prisma
# Run MCP client + settings connection tests (mock acceptable if live creds not present)
ENABLE_MCP=true USE_MOCK_DATA=${USE_MOCK_DATA:-true} MCP_FORCE_MOCKS=${MCP_FORCE_MOCKS:-true} \
  npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  "dashboard/app/lib/mcp/__tests__/*.test.ts" \
  "dashboard/app/lib/settings/__tests__/connection-tests.test.ts"
```

7) Proof-of-work (5-minute cadence)
- Append commands, outputs, tunnel URL, OAuth status, and test results to coordination/inbox/dashboard/$(date -I)-notes.md
- Summarize in feedback/dashboard.md

If blocked
- Record blocker in coordination/inbox/dashboard/$(date -I)-notes.md with exact command/output, then proceed with fallback tasks from this direction (CSP/error boundaries, MCP loaders, Playwright smoke).

Goals (EOD):
- Embedded Admin loads via Cloudflare tunnel; key routes use live MCP behind feature flags; CSP and error boundaries enforced; /api/health and /app/metrics verified.

Tasks (EOD):
1) Capture Cloudflare tunnel and update application_url/redirects (scripts/prepare_dashboard_dev.sh); verify tunnel returns 200; record URL in coordination/inbox/dashboard/2025-10-01-notes.md.
2) Remove USE_MOCK_DATA from home and settings routes; enable MCP-backed loaders behind feature flag with graceful fallback.
3) Enforce CSP and add error boundaries across routes; run Playwright smoke (settings + one route each).

Acceptance:
- HEAD on tunnel returns 200 and Admin iframe renders.
- Server + UI tests pass; Playwright smoke succeeds.
- No inline script violations; degraded states show actionable messages.

### CEO Dependencies — Today
- Approve/confirm target domain for embedded Admin if not using the Cloudflare tunnel long-term. Provide final production application_url if different from tunnel.
