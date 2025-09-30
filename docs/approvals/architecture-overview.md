# Approvals Architecture Overview

_Last updated: 2025-09-29_

## High-Level Architecture

```
+--------------------+        +------------------+
|  Operator UI       | HTTP   |  Approvals API   |
|  (Jinja Templates) +------->|  (FastAPI)       |
+--------------------+        +--------+---------+
                                        |
                                        | Workflow actions
                                        v
                                 +------+-------+
                                 | Workflow     |
                                 | Engine       |
                                 | (engine.py)  |
                                 +------+-------+
                                        |
                                        | CRUD
                                        v
                                 +------+-------+
                                 | Persistence  |
                                 | (SQLite via  |
                                 |  db.py)      |
                                 +------+-------+
                                        |
                                        | Audit/Events
                                        v
                              +---------+----------+
                              | Auto-Approval Rules |
                              | (JSON config)       |
                              +---------------------+
```

## Components
- **FastAPI Application**: Hosts REST endpoints and HTML templates.
- **Workflow Engine**: Orchestrates stages, SLA, auto-approval logic.
- **Persistence Layer**: SQLite database for workflows, stages, approvals, events, audit logs.
- **Auto-Approval Rules**: Externalized JSON configuration.
- **Assistants Service**: External dependency for draft approval/edit flows.

## Data Flow
1. User or system submits approval via API.
2. Engine validates workflow, creates approval record.
3. Auto-rules evaluate payload; may auto-approve.
4. Actions update approval state, log events, and move to next stage.
5. UI queries API to display status.

## Infrastructure
- Containerized via Docker, orchestrated with docker-compose or Kubernetes.
- Future enhancements: background workers for SLA, notification services, caching layer.

## Security & Compliance (Planned)
- OAuth2/JWT authentication and role-based access control.
- Audit trail stored in `audit_logs` table.
- Additional security hardening (CORS, rate limiting) pending repository cleanup.

---

Prepared for overnight documentation tasks.
