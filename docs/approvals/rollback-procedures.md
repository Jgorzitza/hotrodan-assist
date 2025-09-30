# Rollback Procedures

_Last updated: 2025-09-29_

## Objective
Provide clear steps to revert deployments if issues arise.

## Prerequisites
- Backups of database and configuration files.
- Access to previous stable container image/version.

## Rollback Steps (Docker Compose)
1. Identify previous image tag (e.g., `approvals-service:1.2.3`).
2. Update `docker-compose.yml` to use previous tag.
3. Run `docker-compose down approval-app`.
4. Restore database backup if schema/data corrupted.
5. Run `docker-compose up -d approval-app`.
6. Validate via `/health` and smoke tests.

## Rollback Steps (Kubernetes)
1. `kubectl rollout undo deployment approvals-service`
2. Monitor deployment status: `kubectl rollout status deployment approvals-service`
3. Verify pods running desired version.
4. Validate health and smoke tests.

## Data Restoration
- Use snapshot/backup to restore database.
- Ensure audit logs remain consistent; document any lost approvals.

## Communication
- Notify stakeholders immediately after initiating rollback.
- Provide incident report summarizing root cause and remediation steps.

Prepared during overnight documentation sprint.
