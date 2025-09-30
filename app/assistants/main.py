"""Assistants service: inbox API with persistent storage and delivery adapters."""
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    create_engine,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from .adapters import DeliveryAdapterRegistry
from .mock_data import get_mock_scenario, list_mock_scenarios

app = FastAPI()


# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

def _database_url() -> str:
    return os.getenv("ASSISTANTS_DB_URL", "sqlite:///./assistants.db")


DATABASE_URL = _database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")
ENGINE = create_engine(
    DATABASE_URL,
    future=True,
    echo=False,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
)
SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class DraftModel(Base):
    __tablename__ = "drafts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"d{uuid4().hex}")
    channel: Mapped[str] = mapped_column(String(16), nullable=False)
    conversation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_display: Mapped[Optional[str]] = mapped_column(String(255))
    subject: Mapped[Optional[str]] = mapped_column(String(255))
    chat_topic: Mapped[Optional[str]] = mapped_column(String(255))
    incoming_text: Mapped[str] = mapped_column(Text, nullable=False)
    draft_text: Mapped[Optional[str]] = mapped_column(Text)
    incoming_excerpt: Mapped[Optional[str]] = mapped_column(String(255))
    draft_excerpt: Mapped[Optional[str]] = mapped_column(String(255))
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    llm_model: Mapped[Optional[str]] = mapped_column(String(64))
    estimated_tokens_in: Mapped[Optional[int]] = mapped_column(Integer)
    estimated_tokens_out: Mapped[Optional[int]] = mapped_column(Integer)
    usd_cost: Mapped[Optional[float]] = mapped_column(Float)
    sentiment: Mapped[Optional[str]] = mapped_column(String(16), default="neutral")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=lambda: utc_now())
    sla_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    source_snippets: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    conversation_summary: Mapped[List[str]] = mapped_column(JSON, default=list)
    order_context: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    model_latency_ms: Mapped[Optional[int]] = mapped_column(Integer)
    auto_escalated: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_escalation_reason: Mapped[Optional[str]] = mapped_column(String(255))
    extra_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    notes: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    learning_notes: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255))
    escalation_reason: Mapped[Optional[str]] = mapped_column(Text)
    audit_log: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False))
    usd_sent_copy: Mapped[bool] = mapped_column(Boolean, default=False)
    feedback_events: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    feedback_positive: Mapped[int] = mapped_column(Integer, default=0)
    feedback_negative: Mapped[int] = mapped_column(Integer, default=0)


Base.metadata.create_all(ENGINE)


# ---------------------------------------------------------------------------
# Constants & helpers
# ---------------------------------------------------------------------------

VALID_STATUSES = {"pending", "needs_review", "escalated", "sent"}
DEFAULT_CHANNELS = {"email", "chat", "sms", "social"}
MAX_EXCERPT_LEN = 160
DEFAULT_REFRESH_SECONDS = 30
VALID_SENTIMENTS = {"positive", "neutral", "negative"}
ASSIGNMENT_UNASSIGNED_TOKENS = {"unassigned", "none"}
USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "").lower() in {"1", "true", "yes", "on"}
DEFAULT_MOCK_SCENARIO = os.getenv("INBOX_MOCK_SCENARIO", "default")
TEST_SCENARIO_ENV = "ASSISTANTS_TEST_SCENARIO"
CONFIDENCE_BUCKETS: List[tuple[str, float, float]] = [
    ("low", 0.0, 0.4),
    ("medium", 0.4, 0.7),
    ("high", 0.7, 1.01),
]

SUPPORTED_EVENT_TYPES = [
    "draft.created",
    "draft.updated",
    "draft.sent",
    "draft.escalated",
    "draft.feedback",
]


class SourceSnippet(BaseModel):
    title: str
    url: str
    relevance_score: Optional[float] = None


class DraftCreate(BaseModel):
    channel: str
    conversation_id: str
    incoming_text: str
    draft_text: Optional[str] = None
    customer_display: Optional[str] = None
    subject: Optional[str] = None
    chat_topic: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    llm_model: Optional[str] = None
    estimated_tokens_in: Optional[int] = Field(default=None, ge=0)
    estimated_tokens_out: Optional[int] = Field(default=None, ge=0)
    usd_cost: Optional[float] = Field(default=None, ge=0.0)
    sla_deadline: Optional[str] = None
    sentiment: Optional[str] = Field(default="neutral")
    tags: List[str] = Field(default_factory=list)
    source_snippets: List[SourceSnippet] = Field(default_factory=list)
    conversation_summary: List[str] = Field(default_factory=list)
    order_context: Dict[str, Any] = Field(default_factory=dict)
    model_latency_ms: Optional[int] = Field(default=None, ge=0)
    auto_escalated: bool = False
    auto_escalation_reason: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, value: str) -> str:
        lowered = value.lower()
        if lowered not in DEFAULT_CHANNELS:
            raise ValueError(f"Unsupported channel '{value}'")
        return lowered

    @field_validator("tags")
    @classmethod
    def strip_tags(cls, value: List[str]) -> List[str]:
        return [tag.strip() for tag in value if tag and tag.strip()]

    @field_validator("sentiment")
    @classmethod
    def validate_sentiment(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        lowered = value.lower()
        if lowered not in VALID_SENTIMENTS:
            raise ValueError(f"Unsupported sentiment '{value}'")
        return lowered


class Approve(BaseModel):
    draft_id: str
    approver_user_id: str
    send_copy_to_customer: bool = False
    escalate_to_specialist: bool = False
    escalation_reason: Optional[str] = None
    assign_to: Optional[str] = None


class Edit(BaseModel):
    draft_id: str
    editor_user_id: str
    final_text: str
    learning_notes: Optional[str] = None
    send_copy_to_customer: bool = False


class Escalate(BaseModel):
    draft_id: str
    requester_user_id: str
    reason: str
    assigned_to: Optional[str] = None


class NoteCreate(BaseModel):
    draft_id: str
    author_user_id: str
    text: str


class FeedbackCreate(BaseModel):
    draft_id: str
    reviewer_user_id: str
    feedback: Literal["up", "down"]
    note: Optional[str] = None
    reason: Optional[str] = None
    source: Optional[str] = None


class InboxWebSocketManager:
    def __init__(self) -> None:
        self.connections: List[WebSocket] = []
        self._sse_subscribers: List[asyncio.Queue[Dict[str, Any]]] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.connections.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.connections:
                self.connections.remove(websocket)

    async def register_sse(self) -> asyncio.Queue[Dict[str, Any]]:
        queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
        async with self._lock:
            self._sse_subscribers.append(queue)
        return queue

    async def unregister_sse(self, queue: asyncio.Queue[Dict[str, Any]]) -> None:
        async with self._lock:
            if queue in self._sse_subscribers:
                self._sse_subscribers.remove(queue)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        async with self._lock:
            websocket_targets = list(self.connections)
            sse_targets = list(self._sse_subscribers)
        for ws in websocket_targets:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(ws)
        for queue in sse_targets:
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:  # pragma: no cover - defensive guard
                continue


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso8601(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def clean_excerpt(text: str) -> str:
    snippet = " ".join(text.split()) if text else ""
    return snippet[:MAX_EXCERPT_LEN]


def parse_statuses_param(value: Optional[str]) -> set[str]:
    if value:
        tokens = [tok.strip().lower() for tok in value.split(",") if tok.strip()]
        statuses = VALID_STATUSES if "all" in tokens else set(tokens)
    else:
        statuses = {"pending"}
    unknown = statuses - VALID_STATUSES
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unsupported status filter: {sorted(unknown)}")
    return statuses


def parse_channels_param(value: Optional[str]) -> Optional[set[str]]:
    if not value:
        return None
    channels = {tok.strip().lower() for tok in value.split(",") if tok.strip()}
    unknown = channels - DEFAULT_CHANNELS
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unsupported channel filter: {sorted(unknown)}")
    return channels


def parse_sentiments_param(value: Optional[str]) -> Optional[set[str]]:
    if not value:
        return None
    sentiments = {tok.strip().lower() for tok in value.split(",") if tok.strip()}
    unknown = sentiments - VALID_SENTIMENTS
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unsupported sentiment filter: {sorted(unknown)}")
    return sentiments


def parse_assignment_param(value: Optional[str]) -> Optional[Dict[str, Any]]:
    if not value:
        return None
    tokens = [tok.strip() for tok in value.split(",") if tok.strip()]
    if not tokens:
        return None
    lowered = {tok.lower() for tok in tokens}
    if any(tok in ASSIGNMENT_UNASSIGNED_TOKENS for tok in lowered):
        if len(tokens) > 1:
            raise HTTPException(status_code=400, detail="Cannot combine 'unassigned' with other assignment filters")
        return {"mode": "unassigned"}
    if "any" in lowered:
        if len(tokens) > 1:
            raise HTTPException(status_code=400, detail="Cannot combine 'any' with other assignment filters")
        return {"mode": "any"}
    return {"mode": "match", "values": set(tokens)}


def _session() -> Session:
    return SessionLocal()


def append_audit(record: DraftModel, actor: str, action: str, payload: Optional[Dict[str, Any]] = None) -> None:
    payload = payload or {}
    log = list(record.audit_log or [])
    log.append({"timestamp": to_iso(utc_now()), "actor": actor, "action": action, "payload": payload})
    record.audit_log = log


def build_draft_record(body: DraftCreate) -> DraftModel:
    """Construct a DraftModel from validated DraftCreate data."""
    return DraftModel(
        channel=body.channel,
        conversation_id=body.conversation_id,
        customer_display=body.customer_display,
        subject=body.subject,
        chat_topic=body.chat_topic,
        incoming_text=body.incoming_text,
        draft_text=body.draft_text,
        incoming_excerpt=clean_excerpt(body.incoming_text),
        draft_excerpt=clean_excerpt(body.draft_text or ""),
        confidence=body.confidence if body.confidence is not None else 0.75,
        llm_model=body.llm_model or "gpt-4o-mini",
        estimated_tokens_in=body.estimated_tokens_in,
        estimated_tokens_out=body.estimated_tokens_out,
        usd_cost=body.usd_cost,
        sentiment=body.sentiment or "neutral",
        sla_deadline=parse_iso8601(body.sla_deadline),
        tags=body.tags,
        source_snippets=[snippet.model_dump() for snippet in body.source_snippets],
        conversation_summary=body.conversation_summary,
        order_context=body.order_context,
        model_latency_ms=body.model_latency_ms,
        auto_escalated=body.auto_escalated,
        auto_escalation_reason=body.auto_escalation_reason,
        extra_metadata=body.metadata,
    )


def compute_time_fields(record: DraftModel) -> Dict[str, Any]:
    if not record.sla_deadline:
        return {"time_remaining_seconds": None, "overdue": False}
    deadline = record.sla_deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    delta = deadline - utc_now()
    seconds = int(delta.total_seconds())
    return {"time_remaining_seconds": seconds, "overdue": seconds < 0}


def serialize_list(record: DraftModel) -> Dict[str, Any]:
    timing = compute_time_fields(record)
    return {
        "draft_id": record.id,
        "channel": record.channel,
        "conversation_id": record.conversation_id,
        "customer_display": record.customer_display,
        "subject": record.subject,
        "chat_topic": record.chat_topic,
        "incoming_excerpt": record.incoming_excerpt,
        "draft_excerpt": record.draft_excerpt,
        "confidence": record.confidence,
        "sentiment": record.sentiment,
        "llm_model": record.llm_model,
        "estimated_tokens_in": record.estimated_tokens_in,
        "estimated_tokens_out": record.estimated_tokens_out,
        "usd_cost": record.usd_cost,
        "created_at": to_iso(record.created_at),
        "sla_deadline": to_iso(record.sla_deadline),
        "status": record.status,
        "tags": record.tags or [],
        "auto_escalated": record.auto_escalated,
        "auto_escalation_reason": record.auto_escalation_reason,
        "assigned_to": record.assigned_to,
        "escalation_reason": record.escalation_reason,
        "time_remaining_seconds": timing["time_remaining_seconds"],
        "overdue": timing["overdue"],
        "feedback_positive": record.feedback_positive or 0,
        "feedback_negative": record.feedback_negative or 0,
    }


def serialize_detail(record: DraftModel) -> Dict[str, Any]:
    detail = serialize_list(record)
    detail.update(
        {
            "incoming_text": record.incoming_text,
            "draft_text": record.draft_text,
            "source_snippets": record.source_snippets or [],
            "conversation_summary": record.conversation_summary or [],
            "order_context": record.order_context or {},
            "audit_log": record.audit_log or [],
            "notes": record.notes or [],
            "learning_notes": record.learning_notes or [],
            "metadata": record.extra_metadata or {},
            "model_latency_ms": record.model_latency_ms,
            "sent_at": to_iso(record.sent_at),
            "feedback_events": record.feedback_events or [],
        }
    )
    return detail


def delivery_metadata(record: DraftModel) -> Dict[str, Any]:
    return {
        "draft_id": record.id,
        "channel": record.channel,
        "conversation_id": record.conversation_id,
        "draft_text": record.draft_text,
        "customer_display": record.customer_display,
    }


def filter_records(
    records: List[DraftModel],
    statuses: Optional[set[str]] = None,
    channels: Optional[set[str]] = None,
    sentiments: Optional[set[str]] = None,
    assignment: Optional[Dict[str, Any]] = None,
) -> List[DraftModel]:
    """Apply shared filtering rules used across endpoints."""
    filtered = records
    if statuses:
        filtered = [record for record in filtered if record.status in statuses]
    if channels:
        filtered = [record for record in filtered if record.channel in channels]
    if sentiments is not None:
        filtered = [record for record in filtered if (record.sentiment or "neutral") in sentiments]
    if assignment is not None:
        mode = assignment.get("mode")
        if mode == "unassigned":
            filtered = [record for record in filtered if not (record.assigned_to or "").strip()]
        elif mode == "match":
            values = assignment.get("values", set())
            filtered = [record for record in filtered if record.assigned_to in values]
        # mode == "any" intentionally preserves all records
    return filtered


def compute_confidence_histogram(records: List[DraftModel]) -> Dict[str, int]:
    """Bucket confidences for pending/needs_review drafts."""
    histogram = {bucket: 0 for bucket, _, _ in CONFIDENCE_BUCKETS}
    histogram["unscored"] = 0
    for record in records:
        confidence = record.confidence
        if confidence is None:
            histogram["unscored"] += 1
            continue
        for bucket, lower, upper in CONFIDENCE_BUCKETS:
            if lower <= confidence < upper:
                histogram[bucket] += 1
                break
    return histogram


def compute_metrics_payload(records: List[DraftModel]) -> Dict[str, Any]:
    counts = {status: 0 for status in VALID_STATUSES}
    confidence_total = 0.0
    confidence_count = 0
    overdue = 0
    sent_today = 0
    start_of_day = utc_now().replace(hour=0, minute=0, second=0, microsecond=0)
    pending_like = []

    for record in records:
        counts[record.status] = counts.get(record.status, 0) + 1
        if record.status in {"pending", "needs_review"}:
            pending_like.append(record)
            if record.confidence is not None:
                confidence_total += record.confidence
                confidence_count += 1
            if compute_time_fields(record)["overdue"]:
                overdue += 1
        if record.sent_at:
            sent_at = record.sent_at
            if sent_at.tzinfo is None:
                sent_at = sent_at.replace(tzinfo=timezone.utc)
            if sent_at >= start_of_day:
                sent_today += 1

    avg_confidence = round(confidence_total / confidence_count, 4) if confidence_count else None
    histogram = compute_confidence_histogram(pending_like)
    return {
        "pending": counts.get("pending", 0),
        "needs_review": counts.get("needs_review", 0),
        "escalated": counts.get("escalated", 0),
        "sent": counts.get("sent", 0),
        "sent_today": sent_today,
        "avg_confidence_pending": avg_confidence,
        "overdue": overdue,
        "confidence_histogram": histogram,
        "total": len(records),
        "generated_at": to_iso(utc_now()),
    }


def compute_metrics_snapshot(
    statuses: Optional[set[str]] = None,
    channels: Optional[set[str]] = None,
    sentiments: Optional[set[str]] = None,
    assignment: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    with _session() as session:
        records = session.scalars(select(DraftModel)).all()
    filtered = filter_records(records, statuses, channels, sentiments, assignment)
    return compute_metrics_payload(filtered)


def apply_record_patch(record: DraftModel, patch: Dict[str, Any]) -> None:
    for key, value in patch.items():
        if key in {"created_at", "sla_deadline", "sent_at"} and isinstance(value, str):
            parsed = parse_iso8601(value)
            if parsed is not None:
                setattr(record, key, parsed.replace(tzinfo=None))
            continue
        if key == "metadata":
            record.extra_metadata = value
            continue
        if hasattr(record, key):
            setattr(record, key, value)


def seed_mock_scenario(name: str) -> int:
    """Replace stored drafts with the named mock scenario."""
    scenario = get_mock_scenario(name)
    with _session() as session:
        session.query(DraftModel).delete()
        count = 0
        for entry in scenario:
            draft_payload = entry.get("draft", {})
            body = DraftCreate(**draft_payload)
            record = build_draft_record(body)
            append_audit(record, actor="assistant-service", action="draft.created", payload={"channel": body.channel})
            apply_record_patch(record, entry.get("model", {}))
            session.add(record)
            count += 1
        session.commit()
    return count


manager = InboxWebSocketManager()
registry = DeliveryAdapterRegistry()


def build_heartbeat_message() -> Dict[str, Any]:
    return {
        "type": "inbox.heartbeat",
        "timestamp": to_iso(utc_now()),
    }


def build_handshake_message() -> Dict[str, Any]:
    payload = {
        "type": "inbox.handshake",
        "protocol": "inbox-events-v1",
        "timestamp": to_iso(utc_now()),
        "metrics": compute_metrics_snapshot(statuses=None, channels=None),
        "available_mock_scenarios": list_mock_scenarios(),
        "supported_events": SUPPORTED_EVENT_TYPES,
        "delivery_channels": registry.available_channels(),
        "heartbeat_interval_seconds": DEFAULT_REFRESH_SECONDS,
    }
    if USE_MOCK_DATA:
        payload["active_mock_scenario"] = DEFAULT_MOCK_SCENARIO
    return payload


def build_event_message(event_type: str, record: DraftModel) -> Dict[str, Any]:
    message = {
        "type": event_type,
        "draft_id": record.id,
        "status": record.status,
        "timestamp": to_iso(utc_now()),
        "metrics": compute_metrics_snapshot(statuses=None, channels=None),
        "available_mock_scenarios": list_mock_scenarios(),
        "supported_events": SUPPORTED_EVENT_TYPES,
    }
    if event_type in {"draft.created", "draft.updated", "draft.sent", "draft.escalated"}:
        message["draft"] = serialize_list(record)
    if event_type == "draft.feedback":
        events = list(record.feedback_events or [])
        message["feedback"] = {
            "positive": record.feedback_positive or 0,
            "negative": record.feedback_negative or 0,
            "total_events": len(events),
            "latest": events[-1] if events else None,
        }
    if USE_MOCK_DATA:
        message["active_mock_scenario"] = DEFAULT_MOCK_SCENARIO
    return message


def format_sse(payload: Dict[str, Any], event: Optional[str] = None) -> str:
    data = json.dumps(payload, separators=(",", ":"))
    lines: List[str] = []
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {data}")
    lines.append("")
    return "\n".join(lines)


async def emit_event(event_type: str, record: DraftModel) -> None:
    message = build_event_message(event_type, record)
    await manager.broadcast(message)


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@app.post("/assistants/draft")
async def draft(body: DraftCreate) -> Dict[str, str]:
    record = build_draft_record(body)
    append_audit(record, actor="assistant-service", action="draft.created", payload={"channel": body.channel})
    with _session() as session:
        session.add(record)
        session.commit()
    await emit_event("draft.created", record)
    return {"draft_id": record.id}


@app.get("/dashboard/inbox")
async def inbox(
    status: Optional[str] = None,
    channel: Optional[str] = None,
    sentiment: Optional[str] = None,
    assigned: Optional[str] = None,
    cursor: int = 0,
    limit: int = 25,
) -> JSONResponse:
    statuses = parse_statuses_param(status)
    channels = parse_channels_param(channel)
    sentiments = parse_sentiments_param(sentiment)
    assignment = parse_assignment_param(assigned)
    with _session() as session:
        records = session.scalars(select(DraftModel)).all()
    records = filter_records(records, statuses, channels, sentiments, assignment)

    def sort_key(record: DraftModel):
        deadline = record.sla_deadline or record.created_at
        return (deadline, record.created_at)

    records.sort(key=sort_key)
    start = max(cursor, 0)
    end = start + max(limit, 1)
    page = records[start:end]
    payload = {
        "items": [serialize_list(r) for r in page],
        "next_cursor": str(end) if end < len(records) else None,
        "total": len(records),
    }
    return JSONResponse(content=payload, headers={"X-Refresh-After": str(DEFAULT_REFRESH_SECONDS)})


@app.get("/dashboard/inbox/stats")
async def inbox_stats(channel: Optional[str] = None, status: Optional[str] = None) -> Dict[str, Any]:
    channels = parse_channels_param(channel)
    statuses = parse_statuses_param(status or "all")
    return compute_metrics_snapshot(statuses=statuses, channels=channels)


@app.get("/dashboard/inbox/{draft_id}")
async def inbox_detail(draft_id: str) -> Dict[str, Any]:
    with _session() as session:
        record = session.get(DraftModel, draft_id)
        if not record:
            raise HTTPException(status_code=404, detail="Draft not found")
        return {"draft": serialize_detail(record)}


@app.post("/assistants/approve")
async def approve(body: Approve) -> Dict[str, Any]:
    with _session() as session:
        record = session.get(DraftModel, body.draft_id)
        if not record:
            raise HTTPException(status_code=404, detail="Draft not found")
        if record.status == "sent":
            raise HTTPException(status_code=409, detail="Draft already sent")

        if body.escalate_to_specialist:
            record.status = "escalated"
            if body.assign_to:
                record.assigned_to = body.assign_to
            if body.escalation_reason:
                record.escalation_reason = body.escalation_reason
            append_audit(
                record,
                actor=body.approver_user_id,
                action="draft.escalated_during_approve",
                payload={
                    "escalate_to_specialist": True,
                    "assign_to": body.assign_to,
                    "escalation_reason": body.escalation_reason,
                },
            )
            session.add(record)
            session.commit()
            await emit_event("draft.escalated", record)
            return {"status": "escalated"}

        record.status = "sent"
        record.sent_at = utc_now()
        record.usd_sent_copy = body.send_copy_to_customer
        append_audit(
            record,
            actor=body.approver_user_id,
            action="draft.approved",
            payload={"send_copy_to_customer": body.send_copy_to_customer},
        )
        session.add(record)
        session.commit()

    adapter = registry.adapter_for_channel(record.channel)
    external_id = adapter.send(delivery_metadata(record))
    await emit_event("draft.sent", record)
    return {"sent_msg_id": external_id}


@app.post("/assistants/edit")
async def edit(body: Edit) -> Dict[str, Any]:
    with _session() as session:
        record = session.get(DraftModel, body.draft_id)
        if not record:
            raise HTTPException(status_code=404, detail="Draft not found")
        record.draft_text = body.final_text
        record.draft_excerpt = clean_excerpt(body.final_text)
        record.status = "sent"
        record.sent_at = utc_now()
        if body.learning_notes:
            ln = list(record.learning_notes or [])
            ln.append({"note": body.learning_notes, "author": body.editor_user_id, "timestamp": to_iso(utc_now())})
            record.learning_notes = ln
        append_audit(
            record,
            actor=body.editor_user_id,
            action="draft.edited",
            payload={"send_copy_to_customer": body.send_copy_to_customer},
        )
        session.add(record)
        session.commit()

    adapter = registry.adapter_for_channel(record.channel)
    external_id = adapter.send(delivery_metadata(record))
    await emit_event("draft.sent", record)
    return {"sent_msg_id": external_id}


@app.post("/assistants/escalate")
async def escalate(body: Escalate) -> Dict[str, Any]:
    with _session() as session:
        record = session.get(DraftModel, body.draft_id)
        if not record:
            raise HTTPException(status_code=404, detail="Draft not found")
        record.status = "escalated"
        record.assigned_to = body.assigned_to
        record.escalation_reason = body.reason
        append_audit(
            record,
            actor=body.requester_user_id,
            action="draft.escalated",
            payload={"assigned_to": body.assigned_to, "reason": body.reason},
        )
        session.add(record)
        session.commit()
    await emit_event("draft.escalated", record)
    return {"status": "escalated"}


@app.post("/assistants/notes")
async def add_note(body: NoteCreate) -> Dict[str, Any]:
    with _session() as session:
        record = session.get(DraftModel, body.draft_id)
        if not record:
            raise HTTPException(status_code=404, detail="Draft not found")
        notes = list(record.notes or [])
        note_id = f"n{len(notes) + 1}"
        note = {"note_id": note_id, "author_user_id": body.author_user_id, "text": body.text, "created_at": to_iso(utc_now())}
        notes.append(note)
        record.notes = notes
        append_audit(record, actor=body.author_user_id, action="draft.note_added", payload={"note_id": note_id})
        session.add(record)
        session.commit()
    await emit_event("draft.updated", record)
    return {"note": note}


@app.post("/assistants/feedback")
async def log_feedback(body: FeedbackCreate) -> Dict[str, Any]:
    with _session() as session:
        record = session.get(DraftModel, body.draft_id)
        if not record:
            raise HTTPException(status_code=404, detail="Draft not found")
        events = list(record.feedback_events or [])
        event = {
            "timestamp": to_iso(utc_now()),
            "reviewer_user_id": body.reviewer_user_id,
            "feedback": body.feedback,
            "note": body.note,
            "reason": body.reason,
            "source": body.source,
        }
        events.append(event)
        record.feedback_events = events
        if body.feedback == "up":
            record.feedback_positive = (record.feedback_positive or 0) + 1
        else:
            record.feedback_negative = (record.feedback_negative or 0) + 1
        append_audit(
            record,
            actor=body.reviewer_user_id,
            action="draft.feedback_recorded",
            payload={"feedback": body.feedback},
        )
        session.add(record)
        session.commit()
        response_payload = {
            "draft_id": record.id,
            "feedback_positive": record.feedback_positive or 0,
            "feedback_negative": record.feedback_negative or 0,
            "events": events,
        }
    await emit_event("draft.feedback", record)
    return response_payload


@app.get("/assistants/feedback/summary")
async def feedback_summary(channel: Optional[str] = None, status: Optional[str] = None) -> Dict[str, Any]:
    channels = parse_channels_param(channel)
    statuses = parse_statuses_param(status or "all")
    with _session() as session:
        records = session.scalars(select(DraftModel)).all()
    filtered = filter_records(records, statuses, channels)
    total_positive = sum(r.feedback_positive or 0 for r in filtered)
    total_negative = sum(r.feedback_negative or 0 for r in filtered)
    total_events = sum(len(r.feedback_events or []) for r in filtered)
    return {
        "total_positive": total_positive,
        "total_negative": total_negative,
        "total_events": total_events,
        "generated_at": to_iso(utc_now()),
    }


@app.get("/assistants/feedback/{draft_id}")
async def feedback_history(draft_id: str) -> Dict[str, Any]:
    with _session() as session:
        record = session.get(DraftModel, draft_id)
        if not record:
            raise HTTPException(status_code=404, detail="Draft not found")
        return {
            "draft_id": record.id,
            "feedback_positive": record.feedback_positive or 0,
            "feedback_negative": record.feedback_negative or 0,
            "events": record.feedback_events or [],
        }


@app.get("/events/inbox")
async def inbox_events(request: Request) -> StreamingResponse:
    queue = await manager.register_sse()
    handshake = build_handshake_message()

    async def event_stream():
        try:
            yield format_sse(handshake, event="handshake")
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=DEFAULT_REFRESH_SECONDS)
                except asyncio.TimeoutError:
                    yield format_sse(build_heartbeat_message(), event="heartbeat")
                    continue
                yield format_sse(message, event="message")
                if await request.is_disconnected():
                    break
        finally:
            await manager.unregister_sse(queue)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.websocket("/ws/inbox")
async def websocket_inbox(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        await websocket.send_json(build_handshake_message())
        while True:
            message = await websocket.receive_text()
            try:
                payload = json.loads(message)
            except json.JSONDecodeError:
                payload = {"type": message.strip().lower() if message else ""}
            message_type = str(payload.get("type", "")).lower()
            if message_type in {"ping", "heartbeat"}:
                await websocket.send_json(build_heartbeat_message())
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Test utilities
# ---------------------------------------------------------------------------

def reset_state_for_tests(scenario: Optional[str] = None) -> None:
    Base.metadata.drop_all(ENGINE)
    Base.metadata.create_all(ENGINE)
    scenario_name = scenario or os.getenv(TEST_SCENARIO_ENV)
    if scenario_name:
        seed_mock_scenario(scenario_name)


if USE_MOCK_DATA:
    try:
        seed_mock_scenario(DEFAULT_MOCK_SCENARIO)
    except ValueError as exc:  # pragma: no cover - configuration error
        raise RuntimeError(
            f"Unknown inbox mock scenario '{DEFAULT_MOCK_SCENARIO}' configured via INBOX_MOCK_SCENARIO"
        ) from exc


__all__ = [
    "app",
    "DraftCreate",
    "Approve",
    "Edit",
    "Escalate",
    "NoteCreate",
    "FeedbackCreate",
    "seed_mock_scenario",
    "reset_state_for_tests",
]
