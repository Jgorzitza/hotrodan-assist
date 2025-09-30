# Approvals Operator User Guide

_Last updated: 2025-09-29_

## Audience
Human operators responsible for reviewing and approving assistants-generated drafts or workflow-based requests.

## Accessing the Dashboard
1. Navigate to `http://<host>:5173/` (may differ by deployment).
2. Authenticate (future implementation). For now, internal network access required.

## Draft Queue Overview
- **Drafts Table**: Shows draft ID, channel, status, conversation ID, creation time.
- Click a draft ID to view details.

## Draft Detail View
- **Incoming Message**: Original request from customer/user.
- **Suggested Reply**: AI-generated response awaiting approval.
- **Sources**: Links to supporting data or references.
- **Approve Form**: Provide your user ID and click “Approve and Send”.
- **Edit Form**: Modify final text and submit as the editor.

## Approval Workflow Actions (API-backed)
Operators with API access can:
- Submit approvals programmatically via POST `/api/v1/approvals`.
- Check status in `list` endpoints.
- Perform actions (approve, reject, delegate) via `/api/v1/approvals/{id}/actions`.

## best practices
- Verify suggested reply accuracy before approving.
- Use edit form to correct tone/accuracy issues.
- Monitor SLA deadlines (pending UI enhancements).
- Escalate to team leads for high-risk or uncertain cases.

## Common Scenarios
1. **Low-risk query**: Approve quickly; auto-approval may handle once rules configured.
2. **Medium-risk**: Review thoroughly; add notes to metadata when acting via API.
3. **High-risk**: Manual review by senior approver; consider delegation.

## Notifications (Future)
Email/SMS/webhook notifications planned for overdue approvals and escalations.

## Support
- Contact Approvals engineering team via #approvals Slack channel.
- File tickets in internal issue tracker for bugs or requests.

---

Prepared during documentation sprint while codebase remains frozen.
