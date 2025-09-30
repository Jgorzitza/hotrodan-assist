# Webhooks Integration Plan

_Last updated: 2025-09-29_

## Objective
Define strategy for emitting webhook notifications on approval lifecycle events to downstream systems.

## Events to Publish
- `approval.submitted`
- `approval.approved`
- `approval.rejected`
- `approval.delegated`
- `approval.withdrawn`
- `approval.escalated` (future SLA feature)

## Payload Schema
```json
{
  "event": "approval.approved",
  "timestamp": "2025-09-29T21:00:00Z",
  "approval_id": "appr-xyz",
  "workflow_id": "wf-support",
  "status": "approved",
  "actor_id": "manager-1",
  "metadata": {
    "target_entity": "ticket-123",
    "stage_id": "stage-intake"
  }
}
```

## Delivery Mechanism
- Configurable webhook endpoints stored in persistence layer (future table `webhook_subscriptions`).
- HTTP POST with retry/backoff on failure.
- HMAC signature using shared secret per subscriber.

## Subscription Management
- API endpoints to register/list/delete webhook subscriptions (future tasks).
- Validate URLs and enforce auth (API key/JWT).

## Failure Handling
- Exponential backoff with DLQ (dead-letter queue) for persistent failures.
- Admin dashboard to monitor delivery status.

## Security
- Sign payloads with HMAC SHA256.
- Support IP allowlists for subscribers.

## Timeline
1. Define DB schema for subscriptions.
2. Implement event dispatcher in workflow engine.
3. Add background worker for retries.
4. Document configuration and onboarding process.

---

Prepared during integration documentation sprint.
