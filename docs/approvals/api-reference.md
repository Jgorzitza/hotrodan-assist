# Approvals API Reference

_Last updated: 2025-09-29 • Maintainer: Approvals & Inbox Engineer • Scope: FastAPI service at `app/approval_app/main.py`_

> **Important**: Repository cleanup is underway. The semantics captured here reflect the codebase as of 2025-09-29 (commit TBD). No code changes should be made until the Tooling agent confirms a clean working tree.

## Overview

The Approvals API provides programmatic access to the approval workflow engine, including workflow definition, approval submission, and action processing. It is served by FastAPI on port `8003` (development) or per deployment configuration. Authentication and authorization layers are pending implementation (planned in security hardening tasks).

- **Base URL (default)**: `http://localhost:8003`
- **Version**: 0.4.0
- **Content Type**: JSON unless otherwise specified
- **Authentication**: _Not yet implemented — assume trusted internal callers_
- **Rate Limiting**: _Not yet implemented_

## Resource Summary

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/` | HTML dashboard (operator UI) |
| GET | `/drafts/{draft_id}` | View single draft (HTML) |
| POST | `/drafts/{draft_id}/approve` | Approve draft through assistants service |
| POST | `/drafts/{draft_id}/edit` | Edit draft through assistants service |
| POST | `/api/v1/workflows` | Register or update a workflow definition |
| GET | `/api/v1/workflows` | List workflows |
| GET | `/api/v1/workflows/{workflow_id}` | Retrieve workflow definition + stages |
| POST | `/api/v1/approvals` | Submit approval request |
| GET | `/api/v1/approvals` | List approvals (optionally filter by status) |
| POST | `/api/v1/approvals/{approval_id}/actions` | Act on approval (approve/reject/delegate/etc.) |
| GET | `/health` | Lightweight health probe |

The HTML endpoints are primarily for human operators. API automation should rely on the `/api/v1/**` routes.

## Authentication & Authorization

_Current state_: None. All endpoints are unauthenticated. Production hardening backlog includes OAuth2/JWT with RBAC (see security documentation).

## Error Handling

- Successful responses return standard HTTP 2xx status codes with JSON bodies.
- Validation or business rule failures raise FastAPI `HTTPException` with relevant status (400/404/etc.) and JSON error payload: `{ "detail": "..." }`.
- Downstream assistants service errors are propagated with the upstream status code and body text.

## Endpoints

### GET `/`
- **Description**: Render operator dashboard showing draft queue and active workflows.
- **Auth**: None (pending).
- **Response**: HTML.
- **Dependencies**: Calls assistants service `/assistants/drafts`; falls back to empty list on error.

### GET `/drafts/{draft_id}`
- **Description**: Render detailed view for a single draft with approve/edit forms.
- **Path Parameters**: `draft_id` (string, required).
- **Response**: HTML; includes incoming message, suggested reply, sources, actions.

### POST `/drafts/{draft_id}/approve`
- **Description**: Submit approval to assistants service.
- **Form Data**:
  - `approver_user_id` (string, required)
- **Behavior**: Calls `/assistants/approve` and redirects back to draft page (`303 SEE OTHER`).

### POST `/drafts/{draft_id}/edit`
- **Description**: Submit edited draft to assistants service.
- **Form Data**:
  - `editor_user_id` (string, required)
  - `final_text` (string, required)
- **Behavior**: Calls `/assistants/edit` and redirects to draft page.

---

### POST `/api/v1/workflows`
- **Description**: Create or update a workflow definition.
- **Request Body** (`WorkflowDefinition` model):
  - `id` *(string, optional)* — custom workflow identifier; generated if omitted
  - `name` *(string, optional; default=`id`)*
  - `version` *(string, default "1.0")*
  - `description` *(string, optional)*
  - `stages` *(array, required)* — list of stage definitions (see Schema section)
  - `notifications` *(object, optional)* — email/SMS/webhook templates
  - `analytics` *(object, optional)* — metrics toggles
  - `created_by` *(string, optional)* — actor ID for audit trail
- **Responses**:
  - `201 Created`: `{ "workflow_id": "..." }`
- **Notes**: Engine upserts workflows; existing `id` is overwritten.

### GET `/api/v1/workflows`
- **Description**: List all workflows.
- **Response** (`200 OK`): JSON array of workflows
  ```json
  [
    {
      "id": "wf-support",
      "name": "Support Escalation",
      "version": "1.0",
      "status": "active",
      "created_at": "2025-09-29T18:00:00Z",
      "updated_at": "2025-09-29T18:00:00Z"
    }
  ]
  ```

### GET `/api/v1/workflows/{workflow_id}`
- **Description**: Retrieve workflow definition and stage details.
- **Path Parameters**: `workflow_id` (string, required)
- **Response** (`200 OK`):
  ```json
  {
    "workflow": { /* original definition */ },
    "stages": [ { /* stage configs */ } ]
  }
  ```
- **Errors**:
  - `404 Not Found` if workflow missing

### POST `/api/v1/approvals`
- **Description**: Submit approval request for a target entity.
- **Request Body** (`ApprovalSubmission`):
  - `workflow_id` *(string, required)*
  - `target_entity` *(string, required)* — domain-specific identifier (ticket, order, etc.)
  - `payload` *(object, required)* — arbitrary metadata used by auto-approval rules, audit, UI
  - `requester_id` *(string, required)* — actor initiating the request
- **Responses**:
  - `201 Created`: `{ "approval_id": "appr-abc123", "status": "pending" }`
- **Behavior**:
  - Creates approval record at first stage
  - Automatically performs approval if auto-rules fire (`status` may transition immediately)
  - Records audit logs & events

### GET `/api/v1/approvals`
- **Description**: List approvals, optionally by status.
- **Query Parameters**:
  - `status_filter` *(string, optional)* — e.g., `pending`, `approved`, `rejected`
- **Response** (`200 OK`): array of approval summaries
  ```json
  [
    {
      "id": "appr-xyz",
      "workflow_id": "wf-support",
      "status": "pending",
      "current_stage_id": "stage-intake",
      "created_at": "2025-09-29T18:00:00Z",
      "updated_at": "2025-09-29T18:15:00Z",
      "sla_due_at": "2025-09-29T19:00:00Z"
    }
  ]
  ```

### POST `/api/v1/approvals/{approval_id}/actions`
- **Description**: Perform an action on an approval.
- **Path Parameters**: `approval_id` (string, required)
- **Request Body** (`ApprovalActionRequest`):
  - `actor_id` *(string, required)* — user performing the action
  - `action` *(string, required)* — one of `approve`, `reject`, `delegate`, `reassign`, `withdraw`
  - `metadata` *(object, optional)* — additional context (e.g., notes, reassignment target)
- **Responses** (`200 OK`): action result payload (status, stage info)
- **Errors**:
  - `404 Not Found` if approval missing
  - `400 Bad Request` for invalid action (e.g., missing `assignee` on delegate)
- **Behavior**:
  - Records events & audit logs
  - Transitions to next stage or final state

### GET `/health`
- **Description**: Basic readiness probe. Currently returns static `{"status": "healthy"}` with app version; should be expanded with dependency checks in future tasks.

## Data Models

### WorkflowDefinition
- See `/api/v1/workflows` POST payload; align stage config with workflow DSL doc.

### ApprovalRecord Summary
- Response fields for listing approvals mirror `ApprovalRecord` dataclass in `db.py`.

### Events & Audit Logs
- Engine automatically records events (`approval_events` table) and audit entries (`audit_logs`). No direct API endpoints yet; future work may expose them.

## Pagination & Filtering
- `list_approvals` currently supports fixed `limit=50` (server-side). Pagination improvements planned.
- `list_workflows` returns all workflows (typically low cardinality).

## Rate Limiting / Throttling
- Not implemented. Clients should self-throttle to prevent overwhelming the SQLite backend.

## Idempotency
- Workflow creation upserts by `id`. Approval submissions are not idempotent; repeated submissions may create duplicates.

## Versioning Strategy
- Current API is v1. Future enhancements may introduce `/api/v2` with breaking changes or restructure.

## Dependencies
- **Assistants Service** (`ASSISTANTS_BASE` environment variable): required for draft endpoints.
- **SQLite database** (default path: `data/approval_workflows.db`).

## Change Log
- v0.4.0: Added SLA tracking, auto-approval integration, HTML operator UI, audit logging.

## Future Enhancements
- Authentication + RBAC (OAuth2/JWT).
- Webhook notifications for approval state changes.
- Pagination and additional filters.
- Exposure of audit/event endpoints.
- GraphQL layer for flexible querying.

---

Prepared by: Approvals & Inbox Engineer
