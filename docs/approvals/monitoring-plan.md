# Monitoring & Alerting Plan

_Last updated: 2025-09-29_

## Goals
- Ensure service health and performance metrics are tracked.
- Provide alerts for SLA violations, error spikes, and dependency failures.

## Metrics
- Request rate, latency, error rate (FastAPI/Uvicorn metrics)
- DB operations (query time, lock occurrences)
- Approval backlog metrics (pending count, overdue count)
- Auto-approval ratio

## Tools
- Prometheus + Grafana or equivalent monitoring stack.
- Structured logging aggregated via ELK/CloudWatch.

## Dashboards
1. **Service Overview**: Latency, error rate, health status.
2. **Approvals Pipeline**: Pending approvals by workflow, SLA countdowns.
3. **Auto-Approval Analytics**: Percentage auto-approved vs manual.

## Alerts
- Health endpoint failure (5 min consecutive failures).
- High error rate (>5% over 5 minutes).
- Approvals pending beyond SLA threshold.
- Database error spikes (locks, connection failures).

## Logging
- Enable structured JSON logging.
- Include request IDs and workflow/approval IDs in logs.

## Tracing
- Integrate OpenTelemetry for distributed tracing once dependencies instrumented.

Prepared during overnight documentation sprint.
