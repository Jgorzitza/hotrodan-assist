"""Utilities for building Sync orders endpoint payloads."""
from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

DEFAULT_PAGE_SIZE = 12


def _now() -> datetime:
    return datetime.now(timezone.utc)


def encode_offset_cursor(offset: int) -> str:
    return f"ofs:{_to_base36(max(offset, 0))}"


def decode_offset_cursor(cursor: Optional[str]) -> int:
    if not cursor or not cursor.startswith("ofs:"):
        return 0
    try:
        return int(cursor.split(":", 1)[1], 36)
    except ValueError:
        return 0


def build_stub_orders_response(params: Dict[str, Optional[str]]) -> Dict[str, Any]:
    """Return the legacy stub payload for local integration tests."""
    page_size = int(params.get("pageSize") or DEFAULT_PAGE_SIZE)
    offset = decode_offset_cursor(params.get("cursor"))
    orders = _stub_orders()
    items = orders[offset : offset + page_size]
    has_next = offset + page_size < len(orders)
    has_prev = offset > 0

    return {
        "period": _default_period(params.get("date_start"), params.get("date_end")),
        "metrics": _stub_metrics(len(orders)),
        "orders": {
            "items": items,
            "page_info": {
                "startCursor": encode_offset_cursor(offset) if items else None,
                "endCursor": encode_offset_cursor(offset + len(items) - 1) if items else None,
                "nextCursor": encode_offset_cursor(offset + page_size) if has_next else None,
                "previousCursor": encode_offset_cursor(max(offset - page_size, 0)) if has_prev else None,
                "hasNextPage": has_next,
                "hasPreviousPage": has_prev,
                "page": offset // page_size + 1,
                "pageSize": page_size,
                "totalPages": max((len(orders) + page_size - 1) // page_size, 1),
                "shopifyCursor": encode_offset_cursor(offset),
            },
        },
        "shipments": _stub_shipments(),
        "returns": _stub_returns(),
        "inventory_blocks": _stub_inventory_blocks(),
        "alerts": ["Tracking sync skipped last run"],
        "data_gaps": [],
    }


def build_orders_alerts_feed(since: Optional[str]) -> Dict[str, Any]:
    ts = _now().isoformat()
    return {
        "alerts": [
            {
                "id": base64.b64encode(ts.encode()).decode(),
                "type": "shipment_delay",
                "order_number": "#4712",
                "message": "Carrier delay exceeds 24h",
                "created_at": ts,
            },
            {
                "id": base64.b64encode(f"gap:{ts}".encode()).decode(),
                "type": "data_gap",
                "message": "Fulfillment poller skipped last run",
                "created_at": ts,
            },
        ],
    }


def build_orders_payload(
    params: Dict[str, Optional[str]],
    page_orders: Iterable[Dict[str, Any]],
    total_orders: int,
    metrics_orders: Iterable[Dict[str, Any]],
) -> Dict[str, Any]:
    if total_orders == 0:
        return build_stub_orders_response(params)

    page_size = int(params.get("pageSize") or DEFAULT_PAGE_SIZE)
    offset = decode_offset_cursor(params.get("cursor"))

    page_orders_list = list(page_orders)
    metrics_orders_list = list(metrics_orders)

    if not page_orders_list:
        return build_stub_orders_response(params)

    items = [_serialize_order(order) for order in page_orders_list]
    shipments = _compute_shipments(metrics_orders_list)
    returns = _compute_returns(metrics_orders_list)
    inventory_blocks = _compute_inventory_blocks(metrics_orders_list)

    period = _default_period(params.get("date_start"), params.get("date_end"))
    metrics = _compute_metrics(metrics_orders_list, total_orders)

    has_next = offset + page_size < total_orders
    has_prev = offset > 0

    return {
        "period": period,
        "metrics": metrics,
        "orders": {
            "items": items,
            "page_info": {
                "startCursor": encode_offset_cursor(offset) if items else None,
                "endCursor": encode_offset_cursor(offset + len(items) - 1) if items else None,
                "nextCursor": encode_offset_cursor(offset + page_size) if has_next else None,
                "previousCursor": encode_offset_cursor(max(offset - page_size, 0)) if has_prev else None,
                "hasNextPage": has_next,
                "hasPreviousPage": has_prev,
                "page": offset // page_size + 1,
                "pageSize": page_size,
                "totalPages": max((total_orders + page_size - 1) // page_size, 1),
                "shopifyCursor": _shopify_cursor_hint(page_orders_list),
            },
        },
        "shipments": shipments,
        "returns": returns,
        "inventory_blocks": inventory_blocks,
        "alerts": ["Tracking sync skipped last run"],
        "data_gaps": [],
    }


def _default_period(date_start: Optional[str], date_end: Optional[str]) -> Dict[str, str]:
    end = _now()
    start = end - timedelta(days=7)
    if date_start and date_end:
        return {"label": "Custom", "start": date_start, "end": date_end}
    return {
        "label": "Last 7 days",
        "start": start.isoformat(),
        "end": end.isoformat(),
    }


def _serialize_order(order: Dict[str, Any]) -> Dict[str, Any]:
    now = _now()
    created_at = order.get("created_at")
    ship_by = order.get("ship_by")
    tags = [t.lower() for t in order.get("tags", []) if isinstance(t, str)]
    raw = order.get("raw", {})

    age_hours: Optional[float] = None
    if isinstance(created_at, datetime):
        age_hours = round((now - created_at).total_seconds() / 3600, 1)

    priority = "vip" if any(tag in {"vip", "rush"} for tag in tags) else "standard"
    issue = _infer_issue(raw)
    timeline = _build_timeline(raw)

    return {
        "id": order.get("id"),
        "order_number": order.get("name") or f"#{order.get('id')}",
        "placed_at": created_at.isoformat() if isinstance(created_at, datetime) else None,
        "ship_by": ship_by.isoformat() if isinstance(ship_by, datetime) else None,
        "status": _normalize_status(order.get("fulfillment_status")),
        "priority": priority,
        "value_usd": round(order.get("total_price") or 0.0, 2),
        "issue": issue,
        "assigned_to": order.get("assigned_to") or "unassigned",
        "age_hours": age_hours,
        "support_thread": order.get("support_thread"),
        "timeline": timeline,
    }


def _compute_metrics(orders: Iterable[Dict[str, Any]], total_orders: int) -> Dict[str, Any]:
    orders_list = list(orders)
    awaiting_fulfillment = sum(1 for order in orders_list if not order.get("fulfillment_status"))
    awaiting_tracking = sum(
        1
        for order in orders_list
        if _normalize_status(order.get("fulfillment_status")) == "awaiting_tracking"
    )
    overdue = sum(1 for order in orders_list if _is_overdue(order))
    avg_hours = _avg_fulfillment_hours(orders_list)
    breaches = sum(1 for order in orders_list if _is_breach(order))

    return {
        "total_orders": total_orders,
        "awaiting_fulfillment": awaiting_fulfillment,
        "awaiting_tracking": awaiting_tracking,
        "overdue": overdue,
        "overdue_pct": round(overdue / total_orders, 2) if total_orders else 0,
        "avg_fulfillment_hours": avg_hours,
        "breaches": breaches,
    }


def _compute_shipments(orders: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    now = _now()
    tracking_pending: List[Dict[str, Any]] = []
    delayed: List[Dict[str, Any]] = []
    delivered_today = 0

    for order in orders:
        raw = order.get("raw", {}) or {}
        fulfillments = raw.get("fulfillments") or []
        created_at = order.get("created_at")

        if not fulfillments:
            if isinstance(created_at, datetime) and (now - created_at) > timedelta(hours=2):
                tracking_pending.append(
                    {
                        "order_number": order.get("name") or f"#{order.get('id')}",
                        "expected_ship_date": (
                            created_at + timedelta(hours=24)
                        ).isoformat()
                        if isinstance(created_at, datetime)
                        else None,
                        "owner": order.get("assigned_to") or "unassigned",
                    }
                )
            continue

        for fulfillment in fulfillments:
            status = (fulfillment.get("shipment_status") or fulfillment.get("status") or "").lower()
            updated_at = _parse_datetime(
                fulfillment.get("updated_at") or fulfillment.get("created_at")
            )
            if status == "delivered":
                if updated_at and updated_at.date() == now.date():
                    delivered_today += 1
            elif status in {"in_transit", "out_for_delivery"}:
                if updated_at and (now - updated_at) > timedelta(hours=24):
                    delayed.append(
                        {
                            "order_number": order.get("name") or f"#{order.get('id')}",
                            "carrier": fulfillment.get("tracking_company") or "Unknown",
                            "delay_hours": round((now - updated_at).total_seconds() / 3600, 1),
                            "last_update": updated_at.isoformat(),
                        }
                    )

    return {
        "tracking_pending": tracking_pending[:10],
        "delayed": delayed[:10],
        "delivered_today": delivered_today,
    }


def _compute_returns(orders: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    pending: List[Dict[str, Any]] = []
    refunds_due = 0
    refund_value = 0.0

    for order in orders:
        raw = order.get("raw", {}) or {}
        returns = raw.get("returns") or raw.get("refunds") or []
        for entry in returns:
            stage = entry.get("status") or entry.get("state") or "pending"
            if stage.lower() in {"completed", "refunded"}:
                refund_value += _sum_refund_amount(entry)
                refunds_due += 1
            else:
                pending.append(
                    {
                        "order_number": order.get("name") or f"#{order.get('id')}",
                        "stage": stage,
                        "reason": entry.get("reason") or entry.get("note") or "",
                        "age_days": _age_days(entry.get("created_at")),
                        "refund_amount": round(_sum_refund_amount(entry), 2),
                    }
                )

    return {
        "pending": pending[:10],
        "refunds_due": refunds_due,
        "refund_value_usd": round(refund_value, 2),
    }


def _compute_inventory_blocks(orders: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    accumulator: Dict[str, Dict[str, Any]] = {}
    for order in orders:
        raw = order.get("raw", {}) or {}
        for line in raw.get("line_items", []):
            fulfillable = line.get("fulfillable_quantity") or 0
            if fulfillable <= 0:
                continue
            status = (line.get("fulfillment_status") or "").lower()
            if status == "fulfilled":
                continue
            sku = line.get("sku") or f"item-{line.get('id')}"
            block = accumulator.setdefault(
                sku,
                {
                    "sku": sku,
                    "name": line.get("name") or "Unknown",
                    "orders_waiting": 0,
                    "on_hand": line.get("quantity") or 0,
                    "eta": None,
                },
            )
            block["orders_waiting"] += 1
    return list(accumulator.values())[:10]


def _shopify_cursor_hint(page_orders: Iterable[Dict[str, Any]]) -> Optional[str]:
    for order in page_orders:
        raw = order.get("raw", {}) or {}
        cursor = raw.get("cursor") or raw.get("admin_graphql_api_id")
        if cursor:
            return cursor
    return encode_offset_cursor(0)


def _stub_metrics(total: int) -> Dict[str, Any]:
    return {
        "total_orders": total,
        "awaiting_fulfillment": 6,
        "awaiting_tracking": 3,
        "overdue": 4,
        "overdue_pct": 0.19,
        "avg_fulfillment_hours": 16.4,
        "breaches": 2,
    }


def _stub_orders() -> List[Dict[str, Any]]:
    base = _now()
    return [
        {
            "id": f"gid://shopify/Order/{4720 + idx}",
            "order_number": f"#{4720 + idx}",
            "placed_at": (base - timedelta(hours=idx * 3 + 4)).isoformat(),
            "ship_by": (base + timedelta(hours=24 - idx)).isoformat(),
            "status": "awaiting_fulfillment" if idx % 3 == 0 else "awaiting_tracking",
            "priority": "vip" if idx % 4 == 0 else "standard",
            "value_usd": 1890 if idx == 0 else 260 + idx * 15,
            "issue": "inventory" if idx % 5 == 0 else None,
            "assigned_to": "assistant" if idx % 2 == 0 else "unassigned",
            "age_hours": float(8 + idx * 1.5),
            "support_thread": f"conversation:c8{10 + idx}",
            "timeline": _stub_timeline(idx, base),
        }
        for idx in range(24)
    ]


def _stub_timeline(idx: int, base: datetime) -> List[Dict[str, Any]]:
    events = [
        ("payment_captured", "Payment captured"),
        ("inventory_hold", "Awaiting restock"),
        ("fulfillment_submitted", "Label printed"),
    ]
    return [
        {
            "ts": (base - timedelta(hours=idx * 2 + offset)).isoformat(),
            "event": evt,
            "details": details,
        }
        for offset, (evt, details) in enumerate(events)
    ]


def _stub_shipments() -> Dict[str, Any]:
    base = _now()
    return {
        "tracking_pending": [
            {
                "order_number": "#4726",
                "expected_ship_date": (base + timedelta(hours=6)).isoformat(),
                "owner": "assistant",
            }
        ],
        "delayed": [
            {
                "order_number": "#4712",
                "carrier": "UPS",
                "delay_hours": 26,
                "last_update": (base - timedelta(hours=26)).isoformat(),
            }
        ],
        "delivered_today": 9,
    }


def _stub_returns() -> Dict[str, Any]:
    return {
        "pending": [
            {
                "order_number": "#4705",
                "stage": "inspection",
                "reason": "hose length",
                "age_days": 3.0,
                "refund_amount": 210.0,
            }
        ],
        "refunds_due": 2,
        "refund_value_usd": 640,
    }


def _stub_inventory_blocks() -> List[Dict[str, Any]]:
    base = _now()
    return [
        {
            "sku": "AN8-KIT",
            "name": "AN-8 Hose Kit",
            "orders_waiting": 4,
            "on_hand": 0,
            "eta": (base + timedelta(days=2)).isoformat(),
        }
    ]


def _normalize_status(status: Optional[str]) -> str:
    if not status:
        return "awaiting_fulfillment"
    status = status.lower()
    if status in {"fulfilled", "delivered"}:
        return "fulfilled"
    if status in {"partial", "in_progress", "in_transit"}:
        return "awaiting_tracking"
    return status


def _is_overdue(order: Dict[str, Any]) -> bool:
    created_at = order.get("created_at")
    status = _normalize_status(order.get("fulfillment_status"))
    if not isinstance(created_at, datetime):
        return False
    return status != "fulfilled" and (_now() - created_at) > timedelta(hours=24)


def _is_breach(order: Dict[str, Any]) -> bool:
    created_at = order.get("created_at")
    status = _normalize_status(order.get("fulfillment_status"))
    if not isinstance(created_at, datetime):
        return False
    return status != "fulfilled" and (_now() - created_at) > timedelta(hours=48)


def _avg_fulfillment_hours(orders: Iterable[Dict[str, Any]]) -> float:
    durations: List[float] = []
    for order in orders:
        created_at = order.get("created_at")
        raw = order.get("raw", {}) or {}
        fulfillments = raw.get("fulfillments") or []
        if not fulfillments or not isinstance(created_at, datetime):
            continue
        first = fulfillments[0]
        fulfilled_at = _parse_datetime(first.get("created_at"))
        if fulfilled_at:
            durations.append((fulfilled_at - created_at).total_seconds() / 3600)
    if not durations:
        return 0.0
    return round(sum(durations) / len(durations), 2)


def _build_timeline(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    for entry in (raw.get("events") or [])[-10:]:
        ts = _parse_datetime(entry.get("created_at"))
        events.append(
            {
                "ts": ts.isoformat() if ts else entry.get("created_at"),
                "event": entry.get("type") or entry.get("verb") or "event",
                "details": entry.get("message") or entry.get("body"),
            }
        )
    if not events:
        for fulfillment in (raw.get("fulfillments") or [])[-5:]:
            ts = _parse_datetime(fulfillment.get("created_at"))
            events.append(
                {
                    "ts": ts.isoformat() if ts else fulfillment.get("created_at"),
                    "event": fulfillment.get("status") or "fulfillment",
                    "details": fulfillment.get("tracking_company") or "",
                }
            )
    return events[:10]


def _infer_issue(raw: Dict[str, Any]) -> Optional[str]:
    tags = [t.lower() for t in raw.get("tags", []) if isinstance(t, str)] if isinstance(raw.get("tags"), list) else []
    if isinstance(raw.get("tags"), str):
        tags = [t.strip().lower() for t in raw.get("tags").split(",") if t.strip()]
    if "inventory" in tags:
        return "inventory"
    for line in raw.get("line_items", []):
        status = (line.get("fulfillment_status") or "").lower()
        if status != "fulfilled" and (line.get("fulfillable_quantity") or 0) > 0:
            return "inventory"
    return None


def _to_base36(value: int) -> str:
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if value == 0:
        return "0"
    chars: List[str] = []
    n = abs(value)
    while n:
        n, rem = divmod(n, 36)
        chars.append(digits[rem])
    return "".join(reversed(chars))


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value.replace("Z", "+00:00")
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _sum_refund_amount(entry: Dict[str, Any]) -> float:
    total = entry.get("total_refund_amount") or entry.get("amount")
    if total is not None:
        try:
            return float(total)
        except (TypeError, ValueError):
            pass
    transactions = entry.get("transactions") or entry.get("refund_line_items") or []
    accumulator = 0.0
    for tx in transactions:
        amount = tx.get("amount")
        if amount is None:
            continue
        try:
            accumulator += float(amount)
        except (TypeError, ValueError):
            continue
    return accumulator


def _age_days(created_at: Optional[str]) -> float:
    ts = _parse_datetime(created_at)
    if not ts:
        return 0.0
    return round((_now() - ts).total_seconds() / 86400, 2)


def _stub_returns() -> Dict[str, Any]:
    return {
        "pending": [
            {
                "order_number": "#4705",
                "stage": "inspection",
                "reason": "hose length",
                "age_days": 3.0,
                "refund_amount": 210.0,
            }
        ],
        "refunds_due": 2,
        "refund_value_usd": 640,
    }


def _stub_inventory_blocks() -> List[Dict[str, Any]]:
    base = _now()
    return [
        {
            "sku": "AN8-KIT",
            "name": "AN-8 Hose Kit",
            "orders_waiting": 4,
            "on_hand": 0,
            "eta": (base + timedelta(days=2)).isoformat(),
        }
    ]
