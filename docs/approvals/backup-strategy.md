# Backup Strategy

_Last updated: 2025-09-29_

## Objectives
- Safeguard workflow definitions, approvals, and audit logs against data loss.
- Provide recovery point objective (RPO) and recovery time objective (RTO).

## Data to Backup
- SQLite database (`approval_workflows.db`)
- Auto-approval rules (`auto-approval-rules.json`)
- Configuration files (.env, secrets) stored securely

## Frequency
- Daily full backups
- Hourly incremental backups (if DB size warrants)

## Retention
- Keep daily backups for 30 days
- Keep weekly backups for 3 months
- Store offsite copies using secure storage (S3 with encryption)

## Backup Procedure
1. Quiesce writes if possible (scheduled maintenance window).
2. Copy database file to backup location (`sqlite3 .backup` command recommended).
3. Version and timestamp backup files.
4. Verify backup integrity (checksum or test restore).

## Restoration Procedure
1. Stop service to prevent writes.
2. Restore database file from backup.
3. Restore configuration/rules if changed.
4. Start service and validate data.

## Automation
- Use cron job or cloud backup service to schedule tasks.
- Monitor backup success/failure notifications.

Prepared during overnight documentation sprint.
