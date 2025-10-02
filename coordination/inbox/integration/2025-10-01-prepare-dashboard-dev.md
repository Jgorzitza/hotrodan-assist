# Implementation Directive — Prepare Dashboard Dev (2025-10-01T14:13Z)

- Script path confirmed: scripts/prepare_dashboard_dev.sh
- Made executable and enhanced to update BOTH shopify.app.toml files, populate empty redirect_urls, set ASSISTANTS_BASE, and optionally run lint/tests.

Usage (Cloudflare Tunnel on port 8080):

```bash
APP_PORT=8080 TUNNEL_TOOL=cloudflared RUN_CHECKS=1 \
  scripts/prepare_dashboard_dev.sh
```

Effects:
- Starts tunnel and captures https://<...>.trycloudflare.com
- Updates application_url in root and dashboard tomls
- Populates [auth].redirect_urls if empty
- Upserts ASSISTANTS_BASE=http://127.0.0.1:8002 into .env and dashboard/.env.local
- If RUN_CHECKS=1, runs dashboard lint and tests; JSON summary printed

Agents to implement NOW (poll cadence applies):
- Dashboard: run the script, open embedded Admin, and append outputs + next steps to feedback/dashboard.md
- SEO: run the script to refresh application_url; re-run targeted tests and update feedback/seo.md
- Integration: verify application_url change and record status on status-dashboard and blockers-log as needed
