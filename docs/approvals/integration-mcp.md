# MCP Integration Plan

_Last updated: 2025-09-29_

## Goal
Ensure the approvals service interfaces cleanly with the Managed Connector Platform (MCP), enabling connectors (Shopify, Zendesk, Intercom, etc.) to leverage human-in-the-loop approvals.

## Components
- **MCP Connectors**: Existing connectors already integrate with approvals per performance report; document future enhancements.
- **Approvals API**: Provides endpoints for orchestrating workflows.
- **Notification Channels**: Webhooks, email, SMS (pending full rollout).

## Integration Workflow
1. Connector submits approval request via `/api/v1/approvals` with payload including connector metadata.
2. Auto-approval rules evaluate based on connector trust level and action type.
3. MCP receives callbacks or polls status to proceed once approved.
4. Audit data flows back to MCP logging pipeline.

## Mapping Connector Events
| Connector | Event | Approval Payload Fields |
| --- | --- | --- |
| Shopify | Inventory change | `payload: { "connector": "shopify", "action_type": "write", ... }` |
| Zendesk | Ticket escalation | `payload: { "connector": "zendesk", "risk_score": 0.4 }` |
| Intercom | Lead outreach | `payload: { "connector": "intercom", "action_type": "query" }` |

## Security Considerations
- Use API keys/JWT per connector.
- Validate payload schema prior to recording approval.
- Implement rate limiting and throttling per connector to prevent abuse.

## Monitoring & Metrics
- Track approval volume per connector.
- Measure auto-approval vs manual approval ratios.
- Feed data into MCP monitoring dashboards for holistic visibility.

## Future Enhancements
- Webhook callbacks to MCP when approvals complete.
- Connector-specific workflows with conditional routing.
- Managed secrets for connector-level credentials.

Prepared as part of integration planning documentation.
