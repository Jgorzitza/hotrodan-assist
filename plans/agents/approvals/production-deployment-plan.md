---
Workflow DSL Outline
---

1. Entities
   - `workflow`
   - `stage`
   - `approver`
   - `transition`

2. Schema Structure (YAML / JSON)
   - `id`: string
   - `name`: string
   - `version`: string
   - `description`: string
   - `stages`: [
       - `id`
       - `type`: sequential | parallel
       - `approvers`: [ user_id | role | group ]
       - `quorum`: integer / percentage
       - `conditions`: expression (risk score, amount, source)
       - `sla`: duration + escalation target
       - `escalations`: { timeout: duration, target: role }
       - `actions`: approve | reject | delegate | reassign | withdraw
       - `auto_rules`: reference to auto-approval config
     ]
   - `transitions`: [
       - `from`: stage id
       - `to`: stage id
       - `condition`: expression
       - `on`: approve | reject | timeout | withdraw
     ]
   - `notifications`: webhooks, email, sms templates
   - `analytics`: metrics collection flags

3. Routing Logic
   - Evaluate conditions via rule engine (JSONLogic style)
   - Support dynamic approver resolution (role, manager chain, workload balancer)
   - Parallel stages use quorum; sequential stages ensure ordering
   - Timeout triggers escalation or auto-approval per SLA
   - Reassignment/delegate maintain audit trail

4. Production Deployment Plan
   - Environment: docker-compose service `approval-app`
   - Dependencies: RAG service, assistants API, SQLite/pg for persistence
   - Steps:
       1. Add persistence layer (PostgreSQL / SQLite)
       2. Containerize FastAPI app with gunicorn/uvicorn workers
       3. Configure env vars and secrets (ASSISTANTS_BASE, DB_URL)
       4. Add migrations for workflows, approvals, audit logs
       5. Set up Celery / RQ worker for SLA timers & reminders
       6. Configure logging + metrics (Prometheus, OpenTelemetry)
       7. Deploy via docker-compose or Kubernetes manifests
       8. Add CI pipeline with tests, lint, security scans
       9. Integrate monitoring dashboards + alerting
      10. Run smoke tests + UAT scripts post-deploy

5. Next Steps
   - Finalize DSL schema and generate JSON Schema validators
   - Implement workflow engine service with persistence
   - Build API endpoints (create workflow, submit approval, act)
   - Develop UI admin builder leveraging schema
   - Instrument analytics dashboards + alerts
