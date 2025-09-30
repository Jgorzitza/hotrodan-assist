# Approval App

FastAPI microservice providing human-in-the-loop approvals with workflow orchestration, SLA monitoring, and auto-approval rules.

## Features
- Workflow definitions with sequential/parallel stages, SLA timers, escalation hooks
- Persistent storage in SQLite (migrate-friendly schema)
- Auto-approval driven by `plans/agents/approvals/auto-approval-rules.json`
- HTTP API for workflows and approvals, plus lightweight HTML operator UI

## Quick Start
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r app/approval-app/requirements.txt
uvicorn app.approval_app.main:app --reload --port 8003
```

## Testing
```bash
source .venv/bin/activate
python -m pytest tests/approvals/test_engine.py
```

## Configuration
- `ASSISTANTS_BASE`: URL for assistants service (defaults to `http://assistants:8002`)
- `APPROVAL_DB_PATH`: SQLite database path (defaults to `app/data/approval_workflows.db`)
- `APPROVAL_APP_TEMPLATES`: override path for HTML templates

## API Overview
- `POST /api/v1/workflows` – create or update workflow
- `GET /api/v1/workflows` – list workflows
- `GET /api/v1/workflows/{id}` – fetch workflow definition
- `POST /api/v1/approvals` – submit approval request
- `GET /api/v1/approvals?status=` – list approvals by state
- `POST /api/v1/approvals/{id}/actions` – approve/reject/delegate/withdraw

## Deployment Notes
- Include database volume persistence in docker-compose or Kubernetes manifests
- Configure monitoring for SLA breaches (hook into worker or cron for timers)
- Ensure RBAC/identity integration for `actor_id` values when moving to production
