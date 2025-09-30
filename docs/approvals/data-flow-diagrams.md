# Approvals Data Flow Diagrams

_Last updated: 2025-09-29_

## Workflow Submission Flow
```
Client / Connector
    |
    | POST /api/v1/approvals (payload, requester_id)
    v
FastAPI Endpoint
    |
    | -> WorkflowEngine.submit_approval
    v
WorkflowEngine
    |
    | -> db.create_approval
    | -> record_approval_event ("submitted")
    | -> append_audit_log
    | -> auto_rules.should_auto_approve?
    |     - yes -> act_on_approval (approve)
    |     - no  -> pending
    v
SQLite Database
    |
    | -> workflows, approvals, events, audit logs
    v
Operator UI / Dashboard (poll for status)
```

## Approval Action Flow
```
Actor / System
    |
    | POST /api/v1/approvals/{id}/actions (action, metadata)
    v
FastAPI Endpoint
    |
    | -> WorkflowEngine.act_on_approval
    v
WorkflowEngine
    |
    | -> validate current stage
    | -> record_approval_event(action)
    | -> append_audit_log
    | -> update state / move to next stage
    | -> auto_rules (next stage)
    v
Updated approval status in DB
```

## Draft Approval Flow
```
Operator UI
    |
    | POST /drafts/{id}/approve (form data)
    v
Approvals Service (FastAPI)
    |
    | -> _assistants_post("/assistants/approve")
    v
Assistants Service
    |
    | -> finalize draft and send response
    v
Redirect back to /drafts/{id}
```

Prepared to aid integration planning.
