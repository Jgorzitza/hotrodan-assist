"""Assistants service: inbox API with persistent storage and delivery adapters."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from fastapi import HTTPException
from fastapi.applications import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from .adapters import DeliveryAdapterRegistry


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


Base.metadata.create_all(ENGINE)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


VALID_STATUSES = {"pending", "needs_review", "escalated", "sent"}
DEFAULT_CHANNELS = {"email", "chat", "sms", "social"}
MAX_EXCERPT_LEN = 160
DEFAULT_REFRESH_SECONDS = 30


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


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
        return parsed
    return parsed.astimezone(timezone.utc).replace(tzinfo=None)


def clean_excerpt(value: str) -> Optional[str]:
    if not value:
        return None
    normalized = " ".join(value.strip().split())
    if not normalized:
        return None
    if len(normalized) <= MAX_EXCERPT_LEN:
        return normalized
    return normalized[:MAX_EXCERPT_LEN]


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


def _session() -> Session:
    return SessionLocal()


def append_audit(record: DraftModel, actor: str, action: str, payload: Optional[Dict[str, Any]] = None) -> None:
    payload = payload or {}
    log = list(record.audit_log or [])
    log.append({"timestamp": to_iso(utc_now()), "actor": actor, "action": action, "payload": payload})
    record.audit_log = log


def compute_time_fields(record: DraftModel) -> Dict[str, Any]:
    if not record.sla_deadline:
        return {"time_remaining_seconds": None, "overdue": False}
    delta = record.sla_deadline - utc_now()
    seconds = int(delta.total_seconds())
    return {"time_remaining_seconds": seconds, "overdue": seconds < 0}


def _source_urls(snippets: Optional[List[Any]]) -> List[str]:
    urls: List[str] = []
    for snippet in snippets or []:
        if isinstance(snippet, dict):
            url = snippet.get("url") or snippet.get("href")
            if url:
                urls.append(str(url))
        elif isinstance(snippet, str):
            urls.append(snippet)
    return urls


def _draft_sort_key(record: DraftModel) -> Tuple[datetime, datetime]:
    deadline = record.sla_deadline or record.created_at
    return (deadline, record.created_at)


def _paginate_records(records: List[DraftModel], cursor: int, limit: int) -> Tuple[List[DraftModel], Optional[str], int]:
    start = max(cursor, 0)
    page_size = max(limit, 1)
    end = start + page_size
    page = records[start:end]
    next_cursor = str(end) if end < len(records) else None
    return page, next_cursor, len(records)


def load_drafts(
    statuses: Optional[set[str]] = None,
    channels: Optional[set[str]] = None,
    *,
    sort: bool = False,
) -> List[DraftModel]:
    with _session() as session:
        records = session.scalars(select(DraftModel)).all()
    if statuses:
        records = [r for r in records if r.status in statuses]
    if channels:
        records = [r for r in records if r.channel in channels]
    if sort:
        records.sort(key=_draft_sort_key)
    return records


def serialize_list(record: DraftModel) -> Dict[str, Any]:
    timing = compute_time_fields(record)
    return {
        "id": record.id,
        "draft_id": record.id,
        "channel": record.channel,
        "conversation_id": record.conversation_id,
        "customer_display": record.customer_display,
        "subject": record.subject,
        "chat_topic": record.chat_topic,
        "incoming_excerpt": record.incoming_excerpt,
        "draft_excerpt": record.draft_excerpt,
        "confidence": record.confidence,
        "llm_model": record.llm_model,
        "estimated_tokens_in": record.estimated_tokens_in,
        "estimated_tokens_out": record.estimated_tokens_out,
        "usd_cost": record.usd_cost,
        "created_at": to_iso(record.created_at),
        "sla_deadline": to_iso(record.sla_deadline) if record.sla_deadline else None,
        "status": record.status,
        "tags": record.tags or [],
        "auto_escalated": record.auto_escalated,
        "auto_escalation_reason": record.auto_escalation_reason,
        "assigned_to": record.assigned_to,
        "escalation_reason": record.escalation_reason,
        "time_remaining_seconds": timing["time_remaining_seconds"],
        "overdue": timing["overdue"],
    }


def serialize_detail(record: DraftModel) -> Dict[str, Any]:
    detail = serialize_list(record)
    detail.update(
        {
            "incoming_text": record.incoming_text,
            "draft_text": record.draft_text,
            "suggested_text": record.draft_text,
            "final_text": record.draft_text if record.status == "sent" else None,
            "sources": _source_urls(record.source_snippets),
            "source_snippets": record.source_snippets or [],
            "conversation_summary": record.conversation_summary or [],
            "order_context": record.order_context or {},
            "audit_log": record.audit_log or [],
            "notes": record.notes or [],
            "learning_notes": record.learning_notes or [],
            "metadata": record.extra_metadata or {},
            "model_latency_ms": record.model_latency_ms,
            "sent_at": to_iso(record.sent_at) if record.sent_at else None,
            "usd_sent_copy": record.usd_sent_copy,
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


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------


app = FastAPI(title="Assistants Service", version="0.3.0")
registry = DeliveryAdapterRegistry()


@app.post("/assistants/draft")
async def draft(body: DraftCreate) -> Dict[str, str]:
    record = DraftModel(
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
    append_audit(record, actor="assistant-service", action="draft.created", payload={"channel": body.channel})
    with _session() as session:
        session.add(record)
        session.commit()
    return {"draft_id": record.id}


@app.get("/assistants/drafts")
async def list_drafts(
    status: Optional[str] = None,
    channel: Optional[str] = None,
    cursor: int = 0,
    limit: int = 25,
) -> JSONResponse:
    statuses = parse_statuses_param(status)
    channels = parse_channels_param(channel)
    records = load_drafts(statuses=statuses, channels=channels, sort=True)
    page, next_cursor, total = _paginate_records(records, cursor, limit)
    content = {
        "drafts": [serialize_list(r) for r in page],
        "next_cursor": next_cursor,
        "total": total,
        "refresh_after_seconds": DEFAULT_REFRESH_SECONDS,
    }
    return JSONResponse(content=content, headers={"X-Refresh-After": str(DEFAULT_REFRESH_SECONDS)})


@app.get("/assistants/drafts/{draft_id}")
async def get_draft(draft_id: str) -> Dict[str, Any]:
    with _session() as session:
        record = session.get(DraftModel, draft_id)
        if not record:
            raise HTTPException(status_code=404, detail="Draft not found")
        return serialize_detail(record)


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
            notes = list(record.learning_notes or [])
            notes.append({"note": body.learning_notes, "author": body.editor_user_id, "timestamp": to_iso(utc_now())})
            record.learning_notes = notes
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
    return {"note": note}


# ---------------------------------------------------------------------------
# Test utilities
# ---------------------------------------------------------------------------


def reset_state_for_tests() -> None:
    with _session() as session:
        session.query(DraftModel).delete()
        session.commit()


__all__ = [
    "app",
    "DraftCreate",
    "Approve",
    "Edit",
    "Escalate",
    "NoteCreate",
    "reset_state_for_tests",
    "registry",
]
