#!/usr/bin/env python3
"""Render dashboard Markdown for sample or provided payloads."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.dashboard import render_dashboard_home, render_dashboard_sales

SAMPLE_HOME = {
    "inbox": {
        "awaiting_review": 6,
        "awaiting_review_sla_minutes": 45,
        "threads": [
            {
                "conversation_id": "c101",
                "channel": "chat",
                "subject": "Fuel pump sizing",
                "sla_breach": True,
                "draft_status": "proposed",
                "next_action_owner": "human",
            },
            {
                "conversation_id": "c102",
                "channel": "email",
                "subject": "Returnless setup",
                "sla_breach": False,
                "draft_status": "edited",
                "next_action_owner": "assistant",
            },
        ],
    },
    "learning": {
        "edits_last_24h": 3,
        "new_corrections": [
            {"pattern": "regulator", "author": "justin", "added_at": "2024-07-09"}
        ],
    },
    "system_health": {
        "rag_index_age_hours": 6,
        "last_ingest": "2024-07-09T12:00:00Z",
        "openai_latency_p95_ms": 420,
        "error_rate_pct": 1.2,
    },
}

SAMPLE_SALES = {
    "period": {"label": "Last 7 days"},
    "revenue": {
        "gross": 52000,
        "net": 42700,
        "previous_period_delta_pct": 8,
        "top_products": [
            {"name": "AN-8 PTFE hose kit", "revenue": 12000, "delta_pct": 22}
        ],
    },
    "assistant_pipeline": {
        "open_opportunities": [
            {
                "conversation_id": "c118",
                "stage": "quote_sent",
                "estimated_value": 4200,
                "owner": "human",
                "last_message": "2024-07-07T10:00:00Z",
            },
            {
                "conversation_id": "c109",
                "stage": "waiting_payment",
                "estimated_value": 2100,
                "owner": "assistant",
                "last_message": "2024-07-05T09:00:00Z",
            },
        ],
        "wins_last_period": 3,
        "wins_previous_period": 2,
    },
    "inventory_watch": [
        {"sku": "AN6-BULK", "name": "AN-6 bulkhead kit", "status": "critical", "days_of_cover": 2},
        {"sku": "AN8-HOSE", "name": "AN-8 PTFE hose", "status": "warning", "days_of_cover": 5},
    ],
    "demand_signals": {
        "product_requests": [
            {"category": "Dual-tank switching", "count": 9, "trend": "up"}
        ],
        "faq_gaps": [{"topic": "Return vs returnless", "requests": 4}],
    },
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Render dashboard Markdown from payload JSON.",
        epilog="Examples:\n  python3 scripts/render_dashboard_samples.py home\n  python3 scripts/render_dashboard_samples.py sales payload.json",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("route", choices=["home", "sales"], help="Which dashboard route to render")
    parser.add_argument(
        "payload",
        help="Path to JSON payload file. If omitted, use built-in sample.",
        nargs="?",
    )
    args = parser.parse_args(argv)

    payload: Dict[str, Any]
    if args.payload:
        try:
            payload = json.load(open(args.payload))
        except OSError as exc:
            print(f"Failed to read {args.payload}: {exc}", file=sys.stderr)
            return 1
        except json.JSONDecodeError as exc:
            print(f"Invalid JSON in {args.payload}: {exc}", file=sys.stderr)
            return 1
    else:
        payload = SAMPLE_HOME if args.route == "home" else SAMPLE_SALES

    renderer = render_dashboard_home if args.route == "home" else render_dashboard_sales
    result = renderer(payload)
    print(result["markdown"])
    print("\nEscalate:", result["escalate"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
