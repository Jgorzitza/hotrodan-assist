"""Normalize Shopify payloads into local models."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from data import CustomerRepository


def process_customer_payload(session, payload: Dict[str, Any]) -> Dict[str, Any]:
    repo = CustomerRepository(session)
    customer = repo.upsert_shopify_customer(
        email=payload.get("email"),
        shopify_id=str(payload.get("id")) if payload.get("id") else None,
        name=_full_name(payload),
        lifetime_value=_safe_int(payload.get("total_spent")),
        segment=payload.get("tags"),
        shipping_addresses=_extract_addresses(payload.get("addresses", [])),
    )
    return {"customer_id": str(customer.id)}


def process_order_payload(session, payload: Dict[str, Any]) -> Dict[str, Any]:
    repo = CustomerRepository(session)
    customer = None
    if payload.get("customer"):
        customer = repo.upsert_shopify_customer(
            email=payload["customer"].get("email"),
            shopify_id=str(payload["customer"].get("id")) if payload["customer"].get("id") else None,
            name=_full_name(payload["customer"]),
            lifetime_value=_safe_int(payload["customer"].get("total_spent")),
            segment=payload["customer"].get("tags"),
            shipping_addresses=_extract_addresses(payload["customer"].get("addresses", [])),
        )

    order = repo.upsert_order(
        shopify_id=str(payload.get("id")),
        customer=customer,
        status=payload.get("fulfillment_status") or payload.get("financial_status"),
        subtotal_cents=_safe_money(payload.get("subtotal_price"), payload.get("currency")),
        total_cents=_safe_money(payload.get("total_price"), payload.get("currency")),
        currency=payload.get("currency"),
        tracking_numbers=_extract_tracking(payload.get("fulfillments", [])),
        last_event_at=_parse_ts(payload.get("updated_at")),
    )
    return {"order_id": str(order.id)}


def process_inventory_payload(session, payload: Dict[str, Any]) -> Dict[str, Any]:
    repo = CustomerRepository(session)
    item = repo.upsert_inventory_item(
        sku=payload.get("sku") or str(payload.get("id")),
        shopify_id=str(payload.get("id")) if payload.get("id") else None,
        title=payload.get("title"),
        quantity_available=_safe_int(payload.get("available")),
        lead_time_days=_safe_int(payload.get("lead_time")),
        price_cents=_safe_money(payload.get("price"), payload.get("currency")),
        currency=payload.get("currency"),
        is_active=not payload.get("discontinued", False),
    )
    return {"inventory_item_id": str(item.id)}


def enqueue_shopify_event(event_type: str, payload: Dict[str, Any]) -> None:
    try:
        from jobs.tasks import process_shopify_event_task
    except ImportError as exc:  # pragma: no cover - optional dependency during bootstrapping
        raise RuntimeError("Celery tasks module not available") from exc

    process_shopify_event_task.delay(event_type, payload)


# Helpers -----------------------------------------------------------------

def _extract_addresses(addresses: Any) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for addr in addresses or []:
        if not isinstance(addr, dict):
            continue
        results.append(
            {
                "name": addr.get("name") or f"{addr.get('first_name','').strip()} {addr.get('last_name','').strip()}".strip(),
                "address1": addr.get("address1"),
                "address2": addr.get("address2"),
                "city": addr.get("city"),
                "province": addr.get("province"),
                "country": addr.get("country"),
                "postal_code": addr.get("zip"),
                "phone": addr.get("phone"),
                "default": addr.get("default", False),
            }
        )
    return results


def _extract_tracking(fulfillments: Any) -> list[str]:
    tracking_numbers = []
    for fulfillment in fulfillments or []:
        if not isinstance(fulfillment, dict):
            continue
        tracking_numbers.extend([tn for tn in fulfillment.get("tracking_numbers", []) if tn])
    return tracking_numbers


def _safe_int(value: Any) -> int | None:
    if value in (None, "", "null"):
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def _safe_money(value: Any, currency: str | None) -> int | None:
    if value in (None, ""):
        return None
    try:
        cents = round(float(value) * 100)
        return int(cents)
    except (ValueError, TypeError):
        return None


def _parse_ts(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        if isinstance(value, str) and value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _full_name(obj: Dict[str, Any]) -> str | None:
    if not isinstance(obj, dict):
        return None
    first = (obj.get("first_name") or "").strip()
    last = (obj.get("last_name") or "").strip()
    name = f"{first} {last}".strip()
    return name or obj.get("name")
