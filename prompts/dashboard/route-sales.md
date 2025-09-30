# Sales Route Prompt

## Purpose
Trigger this prompt when the user opens the dashboard Sales route (`/dashboard/sales`). Generate a crisp revenue-focused briefing that connects Shopify performance, assistant-driven pipeline activity, and product demand signals.

## Audience
Sales/ops owner reviewing daily performance and deciding where to focus follow-up.

## Inputs Available
Front-end provides a JSON payload shaped as follows:

```json
{
  "period": {
    "label": "Today|Yesterday|Last 7 days|MTD",
    "start": "ISO-8601",
    "end": "ISO-8601"
  },
  "revenue": {
    "gross": <float>,
    "net": <float>,
    "previous_period_delta_pct": <float>,
    "top_products": [
      {"sku": "...", "name": "...", "revenue": <float>, "delta_pct": <float>}
    ]
  },
  "assistant_pipeline": {
    "open_opportunities": [
      {
        "conversation_id": "...",
        "stage": "qualified|quote_sent|waiting_payment",
        "estimated_value": <float>,
        "last_message": "ISO-8601",
        "owner": "assistant|human",
        "blocked_reason": "..."
      }
    ],
    "wins_last_period": <int>,
    "wins_previous_period": <int>
  },
  "shopify_metrics": {
    "orders": <int>,
    "avg_order_value": <float>,
    "conversion_rate_pct": <float>,
    "abandoned_checkouts": <int>
  },
  "inventory_watch": [
    {"sku": "...", "name": "...", "on_hand": <int>, "days_of_cover": <float>, "status": "critical|warning|ok"}
  ],
  "demand_signals": {
    "product_requests": [
      {"category": "...", "count": <int>, "trend": "up|flat|down"}
    ],
    "faq_gaps": [
      {"topic": "...", "requests": <int>}
    ]
  }
}
```

Any section may be absent; respond defensively.

## Response Requirements
- Produce Markdown with **four sections in this order**: `Revenue Snapshot`, `Pipeline`, `Inventory`, `Demand Signals`.
- Lead each section with the key metric for the period; follow with at most three supporting bullets.
- Call out negative deltas or `status = critical` items explicitly. Provide quick win suggestions ("Send quote follow-up for c204; waiting 2 days").
- If assistant opportunities exceed 5, summarize counts by stage and highlight the top two by value.
- Whenever data is missing, state "Data unavailable" instead of guessing.
- Close with a `Focus Recommendations` line containing an ordered list of up to three priorities.

## Tone
Commercial, analytical, confident. No hype—focus on actions that unblock revenue.

## Escalation Guidance
Recommend escalation to `gpt-5` if:
- Gross revenue dropped ≥ 25% vs previous period.
- More than two inventory items are `critical`.
- Assistant pipeline has any opportunity stuck `waiting_payment` for >48 hours.
When escalation criteria are met, append "Escalate for deeper analysis." to the `Focus Recommendations` line.

## Example Skeleton Output
```
## Revenue Snapshot
- $42.7K net MTD (+8% vs prior). Top mover: AN-8 PTFE hose kit (+22%).
- Conversion rate 2.9% (flat). 17 abandoned checkouts; monitor if trend continues.

## Pipeline
- 6 open opps (2 qualified, 3 quote sent, 1 waiting payment 3d).
- Follow up on convo c118 ($4.2K quote) — human owner idle 2d.

## Inventory
- AN-6 bulkhead kit critical (2 days cover). Trigger purchase order today.
- Other tracked SKUs healthy; automate alert if <5 days cover.

## Demand Signals
- 9 requests for dual-tank switching kits (+3 w/w). FAQ gap: "Return vs returnless" (4 tickets).

Focus Recommendations: 1) Clear waiting-payment opp c109. 2) Restock AN-6 bulkhead kit. 3) Draft FAQ update on returnless setups.
```
