# Dashboard Integration Plan

_Last updated: 2025-09-29_

## Objective
Integrate approvals workflow status into the internal dashboard (`apps/dashboard`) providing real-time visibility of approval pipelines, SLA adherence, and actionable items.

## Scope
- Display active approvals, status breakdown, and aging metrics.
- Enable drill-down links to approval details (via Approvals API).
- Surface alerts for overdue approvals and escalations.

## Integration Points
1. **Data Retrieval**
   - Use `/api/v1/approvals` endpoint with filters (`status_filter`).
   - Introduce pagination once API supports offsets.

2. **Visualization**
   - Cards for counts (pending, approved, rejected).
   - Table for pending approvals with SLA due times.
   - Trend chart for approvals per day (requires historical aggregation).

3. **Navigation**
   - Provide deep links to operator UI (`/drafts/{id}`) for manual review.
   - Future: embed approval detail pane within dashboard.

## Authentication
- Pending RBAC implementation; dashboard should use service account (API key/JWT).

## Data Refresh Strategy
- Poll Approvals API every 60 seconds (configurable).
- Cache results in dashboard backend to reduce load on SQLite DB.

## Error Handling
- Show offline banner if API unreachable.
- Provide manual refresh option.

## Monitoring
- Instrument dashboard API calls with metrics (request latency, error rate).

## Dependencies
- Approvals API availability.
- Dashboard service ability to make authenticated API calls once security requirements defined.

---

Prepared as part of integration documentation sprint.
