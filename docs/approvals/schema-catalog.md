# Approvals Data & Schema Catalog

_Last updated: 2025-09-29 • Maintainer: Approvals & Inbox Engineer_

## Overview

This catalog documents the persisted data structures, in-memory models, and configuration schemas used by the approvals workflow service. It complements the API reference by detailing table layouts, stage configuration DSL, and auxiliary rule files.

> **Scope**: Documentation only while repository cleanup is underway. Schema definitions reflect `app/approval_app/db.py` and `engine.py` as of 2025-09-29.

---

## Database (SQLite)

Default path: `data/approval_workflows.db` (configurable via `APPROVAL_DB_PATH`). The service uses plain `sqlite3` with foreign key support.

### Table: `workflows`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT (PK) | Workflow identifier (string) |
| `name` | TEXT | Display name |
| `version` | TEXT | Semantic version (string) |
| `description` | TEXT | Optional summary |
| `definition` | TEXT | JSON blob of full workflow definition |
| `status` | TEXT | `active`, `inactive`, etc. |
| `created_at` | TEXT | ISO8601 timestamp |
| `updated_at` | TEXT | ISO8601 timestamp |

### Table: `workflow_stages`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT (PK) | Stage identifier |
| `workflow_id` | TEXT (FK) | References `workflows.id` |
| `name` | TEXT | Stage name |
| `stage_type` | TEXT | `sequential` | `parallel` |
| `position` | INTEGER | Zero-based index |
| `config` | TEXT | JSON representation of stage config |
| `created_at` | TEXT | ISO8601 timestamp |

### Table: `approvals`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT (PK) | Approval identifier (`appr-...`) |
| `workflow_id` | TEXT (FK) | Parent workflow |
| `workflow_version` | TEXT | Snapshot of workflow version |
| `target_entity` | TEXT | Business object identifier |
| `current_stage_id` | TEXT (FK nullable) | Current stage |
| `status` | TEXT | `pending`, `approved`, `rejected`, `withdrawn`, etc. |
| `payload` | TEXT | JSON metadata supplied during submission |
| `requester_id` | TEXT | Actor submitting request |
| `created_at` | TEXT | ISO8601 timestamp |
| `updated_at` | TEXT | ISO8601 timestamp |
| `sla_due_at` | TEXT | ISO8601 timestamp or NULL |

### Table: `approval_events`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER (PK AUTOINCREMENT) | Event identifier |
| `approval_id` | TEXT (FK) | Parent approval |
| `stage_id` | TEXT (FK nullable) | Stage at event time |
| `actor_id` | TEXT | Actor performing action |
| `action` | TEXT | `submitted`, `approve`, `reject`, etc. |
| `data` | TEXT | JSON metadata |
| `created_at` | TEXT | ISO8601 timestamp |

### Table: `audit_logs`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER (PK AUTOINCREMENT) | Audit entry id |
| `entity_type` | TEXT | `workflow`, `approval`, etc. |
| `entity_id` | TEXT | Identifier of entity |
| `action` | TEXT | e.g., `workflow.created`, `approval.approved` |
| `actor_id` | TEXT | Actor responsible (nullable) |
| `payload` | TEXT | JSON metadata (may include definition excerpts) |
| `created_at` | TEXT | ISO8601 timestamp |

> **Indexes**: Not currently defined beyond PKs; planned enhancements include indexing `approvals.status`, `approval_events.approval_id`, etc.

---

## In-Memory Data Models

### Dataclasses (`app/approval_app/db.py`)
- `WorkflowRecord`
- `WorkflowStageRecord`
- `ApprovalRecord`

Each mirrors the columns above and is used for type-safe access within the engine.

### Pydantic Models (`app/approval_app/main.py`)
- `WorkflowDefinition`
- `ApprovalSubmission`
- `ApprovalActionRequest`

These represent request bodies for API endpoints. See API reference for field descriptions.

---

## Workflow Definition Schema (DSL)

Stages are defined as objects within `workflow_definition["stages"]`. Typical stage schema:

```json
{
  "id": "stage-intake",
  "name": "Intake",
  "type": "sequential",           // or "parallel"
  "position": 0,                    // optional; defaults to array order
  "approvers": ["user-123"],       // optional future enhancement
  "quorum": 2,                      // required for parallel stages
  "conditions": {                   // JSON expression (reserved)
    "risk_score_lt": 0.5
  },
  "sla": {
    "duration": "1h"               // Supports "Xm", "Xh", "Xd"
  },
  "escalations": {
    "timeout": "2h",
    "target": "team-leads"
  },
  "auto_rules": {
    "action_type": "query"         // See auto-approval rules file
  }
}
```

Fields beyond `id`, `type`, `position`, `sla`, and `auto_rules` are forward-looking placeholders. The engine currently consumes `type`, `position`, `sla`, and `auto_rules` to drive routing.

#### Stage Types
- `sequential`: Approvals must be completed in order.
- `parallel`: Multiple approvers concurrently; optional `quorum` indicates number of approvals required.

#### SLA Configuration
- `sla.duration`: string ending with `m`, `h`, or `d`. Engine converts to `timedelta` and sets `sla_due_at` for next stage.

#### Auto Rules
- References rules in `plans/agents/approvals/auto-approval-rules.json`. Stage config typically provides `action_type` hint; full evaluation uses payload (`agent`, `action_type`, `risk_score`).

---

## Auto-Approval Rules Configuration

Stored in `plans/agents/approvals/auto-approval-rules.json` (JSON). Key sections:
- `auto_approval_rules.by_action_type` — toggles per action.
- `auto_approval_rules.by_agent_trust_level` — enable/disable by trust tier.
- `auto_approval_rules.by_risk_score` — numeric threshold `auto_approve_below`.
- `auto_approval_rules.by_time_window` — optional business-hours overrides.
- `auto_approval_rules.batch_approval` — future support for batched approvals.
- `escalation_rules.high_risk_actions` / `always_manual_approval` — enumerations of sensitive actions.

The engine loads rules at instantiation. Missing file results in empty rule set (no auto-approvals).

---

## Environment Variables

| Name | Default | Purpose |
| --- | --- | --- |
| `APPROVAL_DB_PATH` | `data/approval_workflows.db` | Override database location |
| `ASSISTANTS_BASE` | `http://assistants:8002` | Base URL for assistants microservice |
| `APPROVAL_JWT_SECRET` | _planned_ | Not yet in use |
| `APPROVAL_TOKEN_EXPIRE_MINUTES` | _planned_ | Not yet in use |

---

## Data Lifecycle & Retention Considerations

- Approvals and workflow definitions are versioned via `workflow_version` snapshot.
- No archival or purging strategy implemented yet. Future work should define retention policies and consider migrating to PostgreSQL for concurrency and durability.

---

## Known Gaps / TODOs

1. Formal JSON Schema for workflow definitions to validate on ingestion.
2. Indexes for frequently queried columns (status, timestamps).
3. Migration framework (Alembic) once repository cleanup completes.
4. User/role tables for RBAC once security work begins.

---

Prepared for overnight documentation sprint to unblock future approvals work.
