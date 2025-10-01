"""Sync service: normalize Zoho and Shopify events into Postgres + assistants."""
from __future__ import annotations

import base64
import hmac
import json
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse, PlainTextResponse
from prometheus_client import generate_latest
from sqlalchemy import JSON, DateTime, Integer, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from sync.orders_api import (
    DEFAULT_PAGE_SIZE,
    build_orders_alerts_feed,
    build_orders_payload,
    build_stub_orders_response,
    decode_offset_cursor,
)

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

def _database_url() -> str:
    raw = os.getenv("POSTGRES_URL", "sqlite+aiosqlite:///./assistants.db")
    if raw.startswith("postgresql+psycopg2://"):
        return raw.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    if raw.startswith("postgresql://"):
        return raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw


DATABASE_URL = _database_url()
ENGINE = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
SESSION: async_sessionmaker[AsyncSession] = async_sessionmaker(
    ENGINE, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


class ZohoMessage(Base):
    __tablename__ = "zoho_messages"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String(255))
    customer_email: Mapped[Optional[str]] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    raw: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ShopifyEvent(Base):
    __tablename__ = "shopify_events"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    shop_id: Mapped[Optional[str]] = mapped_column(String(255))
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ShopifyCustomer(Base):
    __tablename__ = "shopify_customers"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    email: Mapped[Optional[str]] = mapped_column(String(255))
    first_name: Mapped[Optional[str]] = mapped_column(String(255))
    last_name: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(128))
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    raw: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ShopifyOrder(Base):
    __tablename__ = "shopify_orders"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(64))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    customer_id: Mapped[Optional[str]] = mapped_column(String(32))
    total_price: Mapped[Optional[str]] = mapped_column(String(32))
    currency: Mapped[Optional[str]] = mapped_column(String(8))
    financial_status: Mapped[Optional[str]] = mapped_column(String(64))
    fulfillment_status: Mapped[Optional[str]] = mapped_column(String(64))
    order_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    raw: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ShopifyInventoryLevel(Base):
    __tablename__ = "shopify_inventory_levels"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    inventory_item_id: Mapped[str] = mapped_column(String(32), nullable=False)
    location_id: Mapped[str] = mapped_column(String(32), nullable=False)
    available: Mapped[Optional[int]] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    raw: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------


app = FastAPI(title="Sync Service", version="0.3.0")
ASSISTANTS_DRAFT_URL = os.getenv("ASSISTANTS_DRAFT_URL", "http://assistants:8002/assistants/draft")
DEFAULT_CHANNEL = "email"
SHOPIFY_WEBHOOK_SECRET = os.getenv("SHOPIFY_WEBHOOK_SECRET", "")


@app.get("/health")
async def health() -> Dict[str, Any]:
    """Liveness/readiness probe for Sync service."""
    ok = True
    try:
        # Simple DB ping
        async with ENGINE.begin() as conn:
            await conn.run_sync(lambda c: None)
    except Exception:
        ok = False
    return {
        "status": "ok" if ok else "degraded",
        "service": "sync",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/prometheus")
async def prometheus_metrics() -> PlainTextResponse:
    return PlainTextResponse(generate_latest().decode("utf-8"))

async def _post_draft(client: httpx.AsyncClient, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        resp = await client.post(ASSISTANTS_DRAFT_URL, json=payload, timeout=20.0)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"assistants service error: {exc}") from exc


def _normalize_zoho(payload: Dict[str, Any]) -> Dict[str, Any]:
    data = payload.get("data") or payload
    message = data.get("message") or data
    meta = data.get("meta", {})
    conversation_id = (
        str(message.get("thread_id"))
        or str(message.get("conversation_id"))
        or str(meta.get("conversation_id"))
        or f"zoho-{uuid4().hex[:8]}"
    )
    customer_email = message.get("from_email") or message.get("from")
    subject = message.get("subject") or meta.get("subject") or ""
    plain_body = message.get("plain_body") or message.get("body") or data.get("body") or ""
    return {
        "conversation_id": conversation_id,
        "customer_email": customer_email,
        "subject": subject,
        "body": plain_body.strip(),
        "raw": payload,
    }


@app.on_event("startup")
async def startup() -> None:
    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0))


@app.on_event("shutdown")
async def shutdown() -> None:
    await app.state.http.aclose()
    await ENGINE.dispose()


def _verify_shopify_hmac(raw_body: bytes, signature: Optional[str]) -> None:
    if not SHOPIFY_WEBHOOK_SECRET:
        return
    if not signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Shopify HMAC header")
    digest = hmac.new(SHOPIFY_WEBHOOK_SECRET.encode("utf-8"), raw_body, "sha256").digest()
    expected = base64.b64encode(digest).decode("utf-8")
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Shopify HMAC signature")


async def _upsert_shopify_customer(session: AsyncSession, payload: Dict[str, Any]) -> None:
    customer_id = str(payload.get("id")) if payload.get("id") else None
    if not customer_id:
        return
    tags = payload.get("tags") or payload.get("tags_array") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    record = await session.get(ShopifyCustomer, customer_id)
    now = datetime.utcnow()
    if record is None:
        record = ShopifyCustomer(id=customer_id)
    record.email = payload.get("email")
    record.first_name = payload.get("first_name")
    record.last_name = payload.get("last_name")
    record.phone = payload.get("phone")
    record.tags = tags
    record.raw = payload
    record.updated_at = now
    session.add(record)


async def _upsert_shopify_order(session: AsyncSession, payload: Dict[str, Any]) -> None:
    order_id = str(payload.get("id")) if payload.get("id") else None
    if not order_id:
        return
    record = await session.get(ShopifyOrder, order_id)
    now = datetime.utcnow()
    if record is None:
        record = ShopifyOrder(id=order_id)
    record.name = payload.get("name")
    customer = payload.get("customer") or {}
    record.email = payload.get("email") or customer.get("email")
    record.customer_id = str(customer.get("id")) if customer.get("id") else (payload.get("customer_id") and str(payload.get("customer_id")))
    record.total_price = payload.get("total_price")
    record.currency = payload.get("currency")
    record.financial_status = payload.get("financial_status")
    record.fulfillment_status = payload.get("fulfillment_status")
    created_at = payload.get("created_at") or payload.get("processed_at")
    if isinstance(created_at, str):
        try:
            record.order_created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except ValueError:
            record.order_created_at = None
    record.raw = payload
    record.updated_at = now
    session.add(record)


async def _upsert_inventory_level(session: AsyncSession, payload: Dict[str, Any]) -> None:
    item_id = payload.get("inventory_item_id")
    location_id = payload.get("location_id")
    if item_id is None or location_id is None:
        return
    record_id = f"{item_id}:{location_id}"
    record = await session.get(ShopifyInventoryLevel, record_id)
    now = datetime.utcnow()
    if record is None:
        record = ShopifyInventoryLevel(
            id=record_id,
            inventory_item_id=str(item_id),
            location_id=str(location_id),
        )
    record.available = payload.get("available")
    updated_at = payload.get("updated_at")
    if isinstance(updated_at, str):
        try:
            record.updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        except ValueError:
            record.updated_at = now
    else:
        record.updated_at = now
    record.raw = payload
    session.add(record)


async def _process_shopify_topic(session: AsyncSession, topic: str, payload: Dict[str, Any]) -> None:
    topic = (topic or "").lower()
    if topic.startswith("customers/"):
        await _upsert_shopify_customer(session, payload)
    elif topic.startswith("orders/"):
        await _upsert_shopify_order(session, payload)
    elif topic.startswith("inventory_levels/"):
        await _upsert_inventory_level(session, payload)


def _utcnow() -> datetime:
    return datetime.utcnow()


async def _parse_json_body(request: Request) -> Dict[str, Any]:
    try:
        payload = await request.json()
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON payload: {exc}") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request body must be a JSON object")
    return payload


def _normalize_order_id(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    raw = str(value)
    if raw.startswith("gid://shopify/Order/"):
        return raw.rsplit("/", 1)[-1]
    return raw


def _prepare_order_ids(values: Iterable[Any]) -> tuple[list[str], Dict[str, str]]:
    normalized: list[str] = []
    lookup: Dict[str, str] = {}
    for value in values:
        if value is None:
            continue
        raw = str(value).strip()
        if not raw:
            continue
        item = _normalize_order_id(raw)
        if not item:
            continue
        normalized.append(item)
        lookup.setdefault(item, raw)
    return normalized, lookup


def _set_note_attribute(raw: Dict[str, Any], key: str, value: str) -> None:
    note_attributes = raw.get("note_attributes") or []
    if not isinstance(note_attributes, list):
        note_attributes = []
    normalized_key = key.lower()
    filtered = []
    for attr in note_attributes:
        name = str(attr.get("name") or attr.get("key") or "").lower()
        if name and name == normalized_key:
            continue
        filtered.append(attr)
    filtered.append({"name": key, "value": str(value)})
    raw["note_attributes"] = filtered


def _orders_action_response(
    *,
    success: bool,
    message: Optional[str] = None,
    updated: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    response: Dict[str, Any] = {"success": success}
    if message is not None:
        response["message"] = message
    response["updatedOrders"] = updated or []
    return response


async def _load_orders(session: AsyncSession, order_ids: List[str]) -> List[ShopifyOrder]:
    if not order_ids:
        return []
    stmt = select(ShopifyOrder).where(ShopifyOrder.id.in_(order_ids))
    result = await session.execute(stmt)
    return result.scalars().all()


@app.post("/zoho/incoming")
async def zoho_incoming(req: Request) -> Dict[str, Any]:
    payload = await req.json()
    record = _normalize_zoho(payload)
    context = {
        "subject": record["subject"],
        "source": "zoho",
        "received_at": datetime.utcnow().isoformat(),
    }
    draft_payload = {
        "channel": DEFAULT_CHANNEL,
        "conversation_id": record["conversation_id"],
        "incoming_text": record["body"],
        "customer_email": record["customer_email"],
        "context": context,
    }
    draft = await _post_draft(app.state.http, draft_payload)
    message = ZohoMessage(
        id=f"zoho-{uuid4().hex[:10]}",
        conversation_id=record["conversation_id"],
        subject=record["subject"],
        customer_email=record["customer_email"],
        body=record["body"],
        raw=payload,
    )
    async with SESSION() as session:
        session.add(message)
        await session.commit()
    return {"ok": True, "conversation_id": record["conversation_id"], "draft": draft}


@app.post("/shopify/webhook")
async def shopify_webhook(req: Request) -> Dict[str, Any]:
    raw_body = await req.body()
    signature = req.headers.get("X-Shopify-Hmac-Sha256")
    _verify_shopify_hmac(raw_body, signature)
    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON payload: {exc}") from exc

    topic = req.headers.get("X-Shopify-Topic") or payload.get("topic") or "unknown"
    shop_id = req.headers.get("X-Shopify-Shop-Domain") or payload.get("shop_id")
    event = ShopifyEvent(
        id=f"shopify-{uuid4().hex[:10]}",
        topic=topic,
        shop_id=shop_id,
        payload=payload,
        received_at=datetime.utcnow(),
    )
    async with SESSION() as session:
        session.add(event)
        await _process_shopify_topic(session, topic, payload)
        await session.commit()
    return {"ok": True, "topic": topic, "event_id": event.id}


@app.post("/sync/orders/assign")
async def sync_orders_assign(request: Request) -> Dict[str, Any]:
    payload = await _parse_json_body(request)
    order_ids_raw = payload.get("orderIds")
    if not isinstance(order_ids_raw, list) or not order_ids_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="orderIds must be a non-empty array")
    assignee = str(payload.get("assignee") or "").strip()
    if not assignee:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="assignee is required")

    normalized_ids, id_lookup = _prepare_order_ids(order_ids_raw)
    async with SESSION() as session:
        orders = await _load_orders(session, normalized_ids)
        updated: List[Dict[str, Any]] = []
        now = _utcnow()
        for order in orders:
            raw = dict(order.raw or {})
            _set_note_attribute(raw, "orders_control_tower.assignee", assignee)
            raw["assigned_to"] = assignee
            order.raw = raw
            order.updated_at = now
            updated.append({
                "id": id_lookup.get(order.id, order.id),
                "assignedTo": assignee,
            })
        await session.commit()

    message = (
        f"Assigned {len(updated)} order(s) to {assignee}."
        if updated
        else "No matching orders found for assignment."
    )
    return _orders_action_response(success=True, message=message, updated=updated)


@app.post("/sync/orders/fulfill")
async def sync_orders_fulfill(request: Request) -> Dict[str, Any]:
    payload = await _parse_json_body(request)
    order_ids_raw = payload.get("orderIds")
    if not isinstance(order_ids_raw, list) or not order_ids_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="orderIds must be a non-empty array")

    tracking_payload = payload.get("tracking")
    tracking: Optional[Dict[str, str]] = None
    if isinstance(tracking_payload, dict):
        number = str(tracking_payload.get("number") or "").strip()
        carrier = str(tracking_payload.get("carrier") or "").strip()
        if number and carrier:
            tracking = {"number": number, "carrier": carrier}

    normalized_ids, id_lookup = _prepare_order_ids(order_ids_raw)
    async with SESSION() as session:
        orders = await _load_orders(session, normalized_ids)
        updated: List[Dict[str, Any]] = []
        now = _utcnow()
        for order in orders:
            raw = dict(order.raw or {})
            raw["fulfillment_status"] = "fulfilled"
            if tracking:
                raw["latest_tracking"] = tracking
            order.raw = raw
            order.fulfillment_status = "fulfilled"
            order.updated_at = now
            updated.append({
                "id": id_lookup.get(order.id, order.id),
                "fulfillmentStatus": "fulfilled",
                "tracking": tracking,
            })
        await session.commit()

    message_base = (
        f"Marked {len(updated)} order(s) fulfilled"
        if updated
        else "No matching orders found to mark fulfilled"
    )
    if tracking and updated:
        message_base = f"{message_base} with tracking {tracking['number']}"
    message = f"{message_base}."
    return _orders_action_response(success=True, message=message, updated=updated)


@app.post("/sync/orders/support")
async def sync_orders_support(request: Request) -> Dict[str, Any]:
    payload = await _parse_json_body(request)
    order_id_raw = payload.get("orderId")
    if not isinstance(order_id_raw, str) or not order_id_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="orderId is required")
    normalized_id = _normalize_order_id(order_id_raw)
    if not normalized_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="orderId is invalid")

    conversation_id = str(payload.get("conversationId") or f"support-{uuid4().hex[:8]}")
    note = str(payload.get("note") or "").strip()

    async with SESSION() as session:
        order = await session.get(ShopifyOrder, normalized_id)
        if not order:
            return _orders_action_response(
                success=False,
                message=f"Order {order_id_raw} not found.",
                updated=[],
            )
        raw = dict(order.raw or {})
        _set_note_attribute(raw, "support_thread", conversation_id)
        thread_notes = raw.get("support_notes") or []
        if not isinstance(thread_notes, list):
            thread_notes = []
        now = _utcnow()
        if note:
            thread_notes.append({
                "note": note,
                "created_at": now.isoformat(),
            })
        raw["support_notes"] = thread_notes
        raw["support_thread"] = conversation_id
        order.raw = raw
        order.updated_at = now
        await session.commit()

    message = f"Support requested for {order_id_raw}."
    return _orders_action_response(
        success=True,
        message=message,
        updated=[{"id": order_id_raw, "supportThread": conversation_id}],
    )


@app.post("/sync/orders/returns")
async def sync_orders_returns(request: Request) -> Dict[str, Any]:
    payload = await _parse_json_body(request)
    order_id_raw = payload.get("orderId")
    if not isinstance(order_id_raw, str) or not order_id_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="orderId is required")
    normalized_id = _normalize_order_id(order_id_raw)
    if not normalized_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="orderId is invalid")

    action = str(payload.get("action") or "").strip()
    allowed_actions = {"approve_refund", "deny", "request_inspection"}
    if action not in allowed_actions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported return action")
    note = str(payload.get("note") or "").strip()

    async with SESSION() as session:
        order = await session.get(ShopifyOrder, normalized_id)
        if not order:
            return _orders_action_response(
                success=False,
                message=f"Order {order_id_raw} not found.",
                updated=[],
            )
        raw = dict(order.raw or {})
        returns_log = raw.get("returns") or []
        if not isinstance(returns_log, list):
            returns_log = []
        now = _utcnow()
        returns_log.append({
            "action": action,
            "note": note or None,
            "recorded_at": now.isoformat(),
        })
        raw["returns"] = returns_log
        order.raw = raw
        order.updated_at = now
        await session.commit()

    message = f"Return updated ({action}) for {order_id_raw}."
    return _orders_action_response(success=True, message=message, updated=[])


@app.get("/sync/orders")
async def sync_orders(
    tab: Optional[str] = Query(None),
    page_size: Optional[int] = Query(None, alias="pageSize"),
    cursor: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None, alias="assigned_to"),
    date_start: Optional[str] = Query(None, alias="date_start"),
    date_end: Optional[str] = Query(None, alias="date_end"),
) -> Dict[str, Any]:
    params = {
        "tab": tab,
        "pageSize": str(page_size) if page_size else None,
        "cursor": cursor,
        "direction": direction,
        "status": status_filter,
        "priority": priority,
        "assigned_to": assigned_to,
        "date_start": date_start,
        "date_end": date_end,
    }

    limit = int(page_size or DEFAULT_PAGE_SIZE)
    offset = decode_offset_cursor(cursor)

    async with SESSION() as session:
        total_orders = await session.scalar(select(func.count(ShopifyOrder.id)))
        if not total_orders:
            return build_stub_orders_response(params)

        ordering = (
            ShopifyOrder.order_created_at.desc().nullslast(),
            ShopifyOrder.updated_at.desc(),
        )
        page_stmt = (
            select(ShopifyOrder)
            .order_by(*ordering)
            .offset(offset)
            .limit(limit)
        )
        metrics_stmt = (
            select(ShopifyOrder)
            .order_by(*ordering)
            .limit(200)
        )

        page_rows = (await session.execute(page_stmt)).scalars().all()
        metrics_rows = (await session.execute(metrics_stmt)).scalars().all()

    page_orders = [_normalize_order_record(order) for order in page_rows]
    metrics_orders = [_normalize_order_record(order) for order in metrics_rows]
    return build_orders_payload(params, page_orders, total_orders, metrics_orders)


@app.get("/sync/orders/alerts")
async def sync_orders_alerts(request: Request, since: Optional[str] = Query(None)) -> Any:
    feed = build_orders_alerts_feed(since)
    if "text/event-stream" in (request.headers.get("accept") or ""):

        async def stream():
            for alert in feed["alerts"]:
                yield f"data: {json.dumps(alert)}\n\n"

        return StreamingResponse(stream(), media_type="text/event-stream")
    return feed


def _normalize_order_record(order: "ShopifyOrder") -> Dict[str, Any]:
    raw = order.raw or {}
    tags = _extract_tags(raw)
    created_at = order.order_created_at or _parse_order_datetime(raw.get("created_at"))
    ship_by = _extract_ship_by(raw)
    total_price = _to_float(order.total_price or raw.get("total_price"))
    assigned_to = _extract_assignee(raw)
    support_thread = _extract_support_thread(raw)

    return {
        "id": order.id,
        "name": order.name,
        "created_at": created_at,
        "ship_by": ship_by,
        "fulfillment_status": order.fulfillment_status,
        "financial_status": order.financial_status,
        "total_price": total_price,
        "currency": order.currency,
        "tags": tags,
        "assigned_to": assigned_to,
        "support_thread": support_thread,
        "raw": raw,
    }


def _extract_tags(raw: Dict[str, Any]) -> List[str]:
    tags = raw.get("tags")
    if isinstance(tags, list):
        return [str(tag) for tag in tags]
    if isinstance(tags, str):
        return [part.strip() for part in tags.split(",") if part.strip()]
    return []


def _extract_ship_by(raw: Dict[str, Any]) -> Optional[datetime]:
    for key in ("ship_by", "expected_delivery_date", "delivery_date", "max_delivery_date"):
        dt = _parse_order_datetime(raw.get(key))
        if dt:
            return dt
    shipping_lines = raw.get("shipping_lines") or []
    for line in shipping_lines:
        for key in ("delivery_date", "max_delivery_date", "expected_delivery_date"):
            dt = _parse_order_datetime(line.get(key))
            if dt:
                return dt
    return None


def _extract_assignee(raw: Dict[str, Any]) -> Optional[str]:
    for attr in raw.get("note_attributes") or []:
        key = (attr.get("name") or attr.get("key") or "").lower()
        if key in {"orders_control_tower.assignee", "assignee", "assigned_to"}:
            value = attr.get("value")
            if value:
                return str(value)
    return None


def _extract_support_thread(raw: Dict[str, Any]) -> Optional[str]:
    for attr in raw.get("note_attributes") or []:
        key = (attr.get("name") or attr.get("key") or "").lower()
        if key in {"support_thread", "conversation_id"}:
            value = attr.get("value")
            if value:
                return str(value)
    return None


def _parse_order_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value.replace("Z", "+00:00")
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


@app.get("/customer_summary")
async def customer_summary(email: Optional[str] = None, customer_id: Optional[str] = None) -> Dict[str, Any]:
    if not email and not customer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide email or customer_id")

    async with SESSION() as session:
        customer = None
        if customer_id:
            customer = await session.get(ShopifyCustomer, str(customer_id))
        if customer is None and email:
            result = await session.execute(
                select(ShopifyCustomer)
                .where(ShopifyCustomer.email == email)
                .order_by(ShopifyCustomer.updated_at.desc())
            )
            customer = result.scalars().first()

        orders_query = select(ShopifyOrder).order_by(ShopifyOrder.order_created_at.desc())
        if customer is not None:
            orders_query = orders_query.where(ShopifyOrder.customer_id == customer.id)
        elif email:
            orders_query = orders_query.where(ShopifyOrder.email == email)

        orders_result = await session.execute(orders_query.limit(25))
        orders = []
        total_spent = 0.0
        for order in orders_result.scalars().all():
            try:
                total_spent += float(order.total_price or 0)
            except (TypeError, ValueError):
                pass
            orders.append(
                {
                    "id": order.id,
                    "name": order.name,
                    "total_price": order.total_price,
                    "currency": order.currency,
                    "financial_status": order.financial_status,
                    "fulfillment_status": order.fulfillment_status,
                    "created_at": order.order_created_at.isoformat() if order.order_created_at else None,
                }
            )

    summary = {
        "email": email or (customer.email if customer else None),
        "customer": None,
        "orders": orders,
        "stats": {
            "order_count": len(orders),
            "total_spent": round(total_spent, 2),
        },
    }

    if customer is not None:
        summary["customer"] = {
            "id": customer.id,
            "email": customer.email,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "phone": customer.phone,
            "tags": customer.tags,
            "updated_at": customer.updated_at.isoformat() if customer.updated_at else None,
        }

    if orders:
        summary["stats"]["last_order"] = orders[0]

    return summary


@app.get("/debug/conversations")
async def list_conversations(limit: int = 50) -> Dict[str, Any]:
    async with SESSION() as session:
        result = await session.execute(
            select(ZohoMessage).order_by(ZohoMessage.created_at.desc()).limit(limit)
        )
        rows = [
            {
                "id": row.id,
                "conversation_id": row.conversation_id,
                "subject": row.subject,
                "customer_email": row.customer_email,
                "body": row.body,
                "created_at": row.created_at,
            }
            for row in result.scalars().all()
        ]
        return {"conversations": rows}


@app.get("/debug/shopify")
async def list_shopify_events(limit: int = 50) -> Dict[str, Any]:
    async with SESSION() as session:
        result = await session.execute(
            select(ShopifyEvent).order_by(ShopifyEvent.received_at.desc()).limit(limit)
        )
        rows = [
            {
                "id": row.id,
                "topic": row.topic,
                "shop_id": row.shop_id,
                "received_at": row.received_at,
            }
            for row in result.scalars().all()
        ]
        return {"events": rows}
