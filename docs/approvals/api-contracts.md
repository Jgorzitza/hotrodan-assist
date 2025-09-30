# External API Contracts

_Last updated: 2025-09-29_

## Purpose
Define contracts between the approvals service and external consumers (connectors, dashboard, assistants). Provides a reference for request/response schemas, error codes, and SLAs.

## Contracts

### 1. Approvals API Consumers
- Follow REST contract defined in `api-reference.md`.
- **Success**: HTTP 200/201 with JSON payloads.
- **Errors**:
  - 400: Validation failure or invalid action
  - 404: Resource not found
  - 500: Internal error (should be minimized)
- **SLA**: <300ms average response under normal load (pending performance tuning).

### 2. Assistants Service
a. **Approve Draft**
   - Request: `POST /assistants/approve`
   - Payload: `{ "draft_id": str, "approver_user_id": str }`
   - Response: 200 on success, error codes escalate to operator.

b. **Edit Draft**
   - Request: `POST /assistants/edit`
   - Payload: `{ "draft_id": str, "editor_user_id": str, "final_text": str }`

### 3. MCP Connectors
- Submit approvals with payload containing connector metadata and risk score.
- Must include `requester_id` and `target_entity` for traceability.

### 4. Webhook Subscribers (planned)
- Expect HTTP POST with event payload (see webhooks plan).
- Must respond within 5s; otherwise, retry scheduled.

## Versioning
- Use `Accept-Version` header or base path versioning for breaking changes.
- maintain backward compatibility for at least one minor version.

## Documentation & Change Management
- Publish change logs to `docs/approvals/CHANGELOG.md` (future).
- Notify stakeholders (dashboard, connectors) prior to API changes.
- Provide migration guides for major updates.

---

Prepared during integration planning tasks.
