# Approvals Service Troubleshooting Playbook

_Last updated: 2025-09-29_

This playbook provides rapid diagnostics for common issues in the approvals workflow service. Repository remains under cleanup; refrain from code edits. Use this document during overnight operations to maintain service health.

---

## 1. Service Unavailable
**Symptoms**: `/health` endpoint unreachable, UI/API timeouts.

**Actions**:
1. Check container status: `docker ps | grep approval`
2. View logs: `docker logs approval-app`
3. Inspect uvicorn errors (port conflicts, import errors).
4. Verify dependencies (`assistants`, `db`, `redis`) running.

**Resolution**:
- Restart service: `docker-compose restart approval-app`
- Fix configuration mismatches (env vars, port).

---

## 2. Database Locked / Concurrency Errors
**Symptoms**: API returns `500` with message `database is locked`.

**Actions**:
1. Inspect logs for concurrent writes.
2. Confirm SQLite file located on fast storage.
3. Ensure WAL mode enabled (future enhancement).

**Resolution**:
- Retry after brief delay.
- Schedule migration to PostgreSQL.
- Limit concurrent writes via throttling.

---

## 3. Auto-Approval Not Triggering
**Symptoms**: Approvals remain pending despite low-risk payloads.

**Actions**:
1. Inspect `plans/agents/approvals/auto-approval-rules.json` for enabled flags.
2. Confirm payload includes expected keys (`agent`, `action_type`, `risk_score`).
3. Review workflow stage `auto_rules` configuration.

**Resolution**:
- Update rules file (post-cleanup) and redeploy.
- Add diagnostic logging around rule evaluation (future task).

---

## 4. Missing Workflows / Approvals
**Symptoms**: API returns 404 or empty lists.

**Actions**:
1. Query database directly using `sqlite3 data/approval_workflows.db`.
2. Check audit logs for deletions.
3. Ensure correct `APPROVAL_DB_PATH`.

**Resolution**:
- Restore from backup if data loss confirmed.
- Re-import workflows from DSL definitions.

---

## 5. Draft UI Errors
**Symptoms**: Operator dashboard fails to load or shows empty tables.

**Actions**:
1. Check assistants service health.
2. Inspect browser console for CORS errors (pending middleware).
3. Validate network connectivity between services.

**Resolution**:
- Restart assistants service.
- Update CORS settings once security hardening begins.

---

## 6. SLA Escalations Not Occurring
**Symptoms**: Approvals past due with no escalation.

**Actions**:
1. Review SLA timers in database (`sla_due_at`).
2. Verify background worker (Celery/RQ) if implemented.
3. Check logs for escalation triggers.

**Resolution**:
- Implement/repair asynchronous worker (future).
- Manual escalation via admin action.

---

## 7. Audit Logs Missing or Incorrect
**Symptoms**: Audit trails blank or incomplete.

**Actions**:
1. Query `audit_logs` table.
2. Confirm actions hitting engine methods.
3. Check for JSON serialization errors.

**Resolution**:
- Add logging around `append_audit_log`.
- Ensure no accidental deletions (foreign keys cascade).

---

## 8. Performance Degradation
**Symptoms**: API latency spikes, high CPU.

**Actions**:
1. Monitor system metrics (top, htop, Prometheus once available).
2. Identify heavy queries (lack of indexes).
3. Review log volume, GC frequency.

**Resolution**:
- Add database indexes (post-cleanup task).
- Scale horizontally (multiple replicas behind load balancer).
- Implement caching for static data (workflow definitions).

---

## 9. Deployment Failures
**Symptoms**: Container crashes on startup.

**Actions**:
1. Check `docker logs` for stack traces.
2. Validate environment variables.
3. Ensure auto-approval rules file accessible.

**Resolution**:
- Correct path or permissions.
- Rebuild image with latest dependencies.

---

## 10. Security Incidents
**Symptoms**: Unauthorized approvals, suspicious activity.

**Actions**:
1. Review audit logs for anomalous actors.
2. Temporarily disable auto-approval rules.
3. Notify security team.

**Resolution**:
- Implement emergency manual approval only mode.
- Accelerate RBAC implementation.

---

Prepared for overnight operational readiness.
