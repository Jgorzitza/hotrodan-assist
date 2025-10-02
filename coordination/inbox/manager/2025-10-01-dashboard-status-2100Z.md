# Dashboard Engineer — Partner App Migration and Dev Tunnel Status (2025-10-01T21:00Z)

Owner: Dashboard • Repo: /home/justin/llama_rag • App: hran-dashboard (React Router, TypeScript)

Summary
- We pivoted from a merchant custom app to a Partner (embedded + OAuth) app per direction. We scaffolded a new Shopify app using the official wizard: hran-dashboard (React Router, TS). We linked the local shopify.app.toml to the existing Partner app "HRAN-DASHBOARD" (confirmed by CLI success output). Dev store is now hotroddash.myshopify.com.
- Goal remains unchanged for EOD: run embedded Admin via a Cloudflare Quick Tunnel (CLI-managed), validate OAuth (302 → callback → final 200), and persist the tunnel URL + health evidence. Keep lint/tests green and record proof-of-work.

What changed today
1) Scaffold
   - New app created by user via wizard: /home/justin/llama_rag/hran-dashboard
   - Template: React Router + TypeScript (CLI 3.x default for app creation)
   - Local CLI confirmed linked: `shopify app config link` succeeded against "HRAN-DASHBOARD".

2) Config
   - hran-dashboard/shopify.app.toml:
     - embedded = true
     - [build].automatically_update_urls_on_dev = true
     - [build].dev_store_url = "hotroddash.myshopify.com"
     - Other defaults (application_url and redirect URLs) will be auto-managed by `shopify app dev`.
   - Root shopify.app.toml: updated [build].dev_store_url to "hotroddash.myshopify.com" earlier for alignment.

3) Non-interactive dev attempts
   - We attempted to run `npm run dev` (which maps to `shopify app dev`) in the background and capture the trycloudflare URL from logs with a bounded retry loop. Background runs executed, but our first two attempts were disrupted by quoting issues inside a multi-line script, yielding exit code 130 (^C) and `bash: : No such file or directory` lines. No persistent side effects; the app state remains intact.
   - Logs and notes:
     - Dev log: coordination/inbox/dashboard/hran-dev.log
     - Coordination notes: coordination/inbox/dashboard/2025-10-01-notes.md (multiple updates from today)

Current state
- Project: hran-dashboard is linked to the Partner app and configured for the new dev store.
- Embedded/OAuth path is ready; redirect URLs will be updated during dev run.
- Tunnel: not yet captured in notes due to the aborted background script. We expect the CLI to print a trycloudflare URL once dev is running in a foreground session.
- Tests/lint: planned to run post-tunnel validation to keep order-of-operations aligned with EOD acceptance.

Blockers and analysis
- Interactive vs. non-interactive: Our automation guardrails disallow interactive long-running foreground processes; the CLI dev server is designed to run interactively and print the tunnel URL to stdout. Backgrounding plus log tailing is viable, but our prior attempt included a quoting/escaping error in the shell heredoc that caused a premature termination.
- Networking: Per Shopify docs, the CLI defaults to Cloudflare Quick Tunnels. If the tunnel does not materialize due to firewall egress rules, we will switch to a Bring-Your-Own tunnel and pass it via `--tunnel-url`.
- Node engine: hran-dashboard package.json requires Node >= 20.10. Please ensure the machine Node meets this to avoid dev runtime surprises.

Plan (execution order)
1) Dev run (preferred)
   - Run in a dedicated foreground terminal inside hran-dashboard:
     - `cd /home/justin/llama_rag/hran-dashboard`
     - `shopify app dev`
   - When the trycloudflare URL prints, paste it into:
     - `coordination/inbox/dashboard/current_tunnel_url.txt`
   - I will concurrently (non-interactively) append to notes:
     - HEAD / and HEAD /api/health status lines
     - OAuth redirect chain headers to `/auth` endpoint (with hmac/state/code/session redacted)

2) If Cloudflare tunnel fails or is slow to appear (per docs)
   - Bring-your-own tunnel and pass it to the CLI:
     - Option A: `ngrok http 3000` → then run `shopify app dev --tunnel-url=https://<ngrok-url>`
     - Option B: `cloudflared tunnel --url http://localhost:3000` → then `shopify app dev --tunnel-url=https://<cf-url>`
   - Rationale: bypass Quick Tunnel constraints and still allow CLI to manage OAuth + redirect URLs in Partners using the provided tunnel URL.

3) After tunnel capture, validate embedded Admin
   - Evidence: 302 to accounts.shopify.com → 302 back to /api/auth (React Router template) → final 200
   - Append redacted header chain to coordination/inbox/dashboard/2025-10-01-notes.md

4) Lint/tests and hardening
   - `npm run lint` (hran-dashboard)
   - `npx --yes vitest run --root /home/justin/llama_rag/hran-dashboard --reporter=basic` (if tests present in template; otherwise run the template’s typecheck)
   - Harden CSP and error boundaries after first load, re-run lints/tests

5) Optional: Container parity (post-Admin validation)
   - Build and run container on port 8080, then re-run tunnel (keeping the same URL if possible to avoid re-syncing redirect URLs). This step is optional but recommended for production-like testing.

Risks
- Tunnel intermittency: Quick Tunnels occasionally stall; mitigation documented above via --tunnel-url.
- Node version drift: enforce >= 20.10 locally and in CI to match the template engines.
- Redirect URL mismatch: rely on auto-update during `app dev`; if mismatch persists, manually confirm App URL + redirect URLs in Partners (CLI will typically handle this when `automatically_update_urls_on_dev = true`).

Requests/Approvals
- Approval to use Bring-Your-Own tunnel if Quick Tunnel fails after 2 attempts (ngrok or cloudflared). We will redact any sensitive outputs in logs.
- Confirmation of Node >= 20.10 on the dev machine.

Evidence locations
- Tunnel URL (when captured): coordination/inbox/dashboard/current_tunnel_url.txt
- Dev log: coordination/inbox/dashboard/hran-dev.log
- Notes: coordination/inbox/dashboard/2025-10-01-notes.md
- Feedback summary: feedback/dashboard.md

Next status checkpoint
- After running `shopify app dev` and capturing the URL, we will post:
  - Current tunnel
  - HEAD / and HEAD /api/health results
  - OAuth redirect evidence
  - Lint/tests summary

We remain aligned with Production Today priorities; once embedded Admin is validated, we’ll move to CSP/error boundaries and minimal smoke tests as directed.
