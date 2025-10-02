# Approvals Runbook

Last updated: 2025-10-01

This runbook describes lightweight checks and procedures to keep the Approvals UI production-ready.

## Health and Readiness
- Liveness: GET /health -> {"status":"ok","ts":...}
- Readiness: GET /ready -> {"ready":true|false,"timestamp":...}
  - Checks Assistants minimal endpoint (drafts?limit=1)

Quick smoke:
```
curl -sS http://127.0.0.1:8002/health | jq .
curl -sS http://127.0.0.1:8002/ready  | jq .
```

## SSE Stream Stability
- Server emits `event: ping` every 20s (dashboard bridge) and every 15s (assistants events)
- Client bridge has exponential backoff and caps buffer at 256KB

Soak test (10 minutes):
```
mkdir -p artifacts/phase3/approvals
timeout 600 curl -N http://127.0.0.1:8002/assistants/events \
  | sed -n '1,5p' > artifacts/phase3/approvals/sse-soak-$(date -u +%H%M).log
```

## Audit Logging & PII Redaction
- Middleware masks emails, tokens, and phone numbers in logs
- Example masked: `john@example.com` -> `j***@example.com`, tokens -> `=***`, phone -> `<redacted>`

## Security Headers / CSP
- x-frame-options: DENY
- x-content-type-options: nosniff
- referrer-policy: no-referrer
- content-security-policy: default allow 'self' (adjust as needed)

Check:
```
curl -I http://127.0.0.1:8002/ | grep -iE "content-security-policy|x-frame-options|referrer-policy|x-content-type-options"
```

## Assistants Dependency
- Local smoke: Assistants service on 127.0.0.1:8005
- Health: GET /health -> JSON
- If unreachable, gate UI features and show banner

## Approve/Edit Roundtrip (no UI)
```
ASS=http://127.0.0.1:8005
DRAFT_ID=$(curl -s "$ASS/assistants/draft" -H 'content-type: application/json' \
  -d '{"channel":"email","conversation_id":"conv","incoming_text":"Hello"}' | jq -r .draft_id)

curl -s -X POST http://127.0.0.1:8002/drafts/$DRAFT_ID/approve -d 'approver_user_id=cli'
curl -s -X POST http://127.0.0.1:8002/drafts/$DRAFT_ID/edit \
  -d 'editor_user_id=cli&final_text=Edited'
```

## Common Errors
- Missing python-multipart -> install in venv or container
- OTEL exporter missing -> telemetry disabled automatically
- SSE endpoint unreachable -> verify service ports and gate UI
