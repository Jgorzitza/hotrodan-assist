# Approvals Service Configuration Guide

_Last updated: 2025-09-29_

## Purpose
Defines configuration knobs for the approvals workflow service across environments. Focuses on environment variables, file-based configs, and external integrations. No code changes should be made until repository cleanup completes.

---

## 1. Environment Variables

| Variable | Description | Default | Notes |
| --- | --- | --- | --- |
| `APPROVAL_DB_PATH` | Filesystem path to SQLite DB | `data/approval_workflows.db` | Mount persistent storage in production |
| `ASSISTANTS_BASE` | Base URL for assistants microservice | `http://assistants:8002` | Used by draft endpoints |
| `APPROVAL_JWT_SECRET` | Symmetric key for JWT auth (future) | _None_ | Required once auth implemented |
| `APPROVAL_TOKEN_EXPIRE_MINUTES` | Token lifetime (minutes) | `60` (planned) | Effective when auth added |
| `PORT` | Override uvicorn port (Dockerfile default) | `5173` | Align with load balancer mappings |
| `LOG_LEVEL` | Logging verbosity (future) | `info` | Add to uvicorn configuration |

### Loading Env Vars
- Local: `.env` file loaded via `docker-compose`
- Kubernetes: ConfigMaps/Secrets
'to avoid code changes, use `envFrom.secretRef`
- Production: Prefer secrets manager (Vault, AWS Secrets Manager)

---

## 2. Filesystem Layout

```
app/approval_app/
  ├── main.py           # FastAPI entrypoint
  ├── engine.py         # Workflow engine
  ├── db.py             # Persistence layer
  ├── templates/        # HTML UI
  ├── requirements.txt  # Python deps
plans/agents/approvals/
  ├── auto-approval-rules.json
  ├── production-deployment-plan.md
  └── direction.md
```

`AUTO_RULES_PATH` is hard-coded in engine (`/home/justin/...`). Future configuration should externalize this path via env var.

---

## 3. External Services

| Service | Interaction | Config |
| --- | --- | --- |
| Assistants API | Draft approval/edit flows | `ASSISTANTS_BASE` |
| Notification (email/SMS) | Planned | TBD (e.g., SendGrid API key) |
| MCP connectors | Already integrated | Check respective configs |

---

## 4. Database

- SQLite is default; for production, plan migration to PostgreSQL (`DATABASE_URL`) once repo cleanup done.
- Ensure directory for `APPROVAL_DB_PATH` exists and is writable.

### WAL Mode (Future Enhancement)
- `PRAGMA journal_mode=WAL` recommended for concurrency; document enabling once code change is safe.

---

## 5. Auto-Approval Rules File
- Location: `plans/agents/approvals/auto-approval-rules.json`
- Format: JSON with sections for action types, trust levels, risk score, time windows, batch approval.
- Update cadence: as business logic evolves; ensure tests updated accordingly.

### Change Management
- Validate JSON via linting before deployment.
- Communicate rule changes to operations (affects auto-approval behavior immediately).

---

## 6. SLA & Escalation Configuration
- Configured per stage within workflow definition (see Schema Catalog).
- Add environment-level defaults for SLA durations/escalation targets in future.

---

## 7. Logging & Monitoring (Planned)
- `LOG_LEVEL` env var to control verbosity (info/debug/warn).
- Structured logging integration (JSON) to feed log aggregation.
- Monitoring endpoints will expand `/health`; configure `PROMETHEUS_MULTIPROC_DIR` when metrics added.

---

## 8. Secrets Handling
- Store sensitive values (JWT secret, API keys) in secrets manager.
- Document rotation procedures in Ops runbook.

---

Prepared to support upcoming security hardening and production readiness work.
