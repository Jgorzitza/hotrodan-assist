"""Assistants service: inbox API with persistent storage and delivery adapters."""
from __future__ import annotations

import asyncio
import copy
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from uuid import uuid4

from fastapi import HTTPException, Request
from fastapi.applications import FastAPI
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from prometheus_client import generate_latest
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

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
DEFAULT_CHANNELS = {"email", "chat", "sms", "social", "instagram", "tiktok", "shopify"}
MAX_EXCERPT_LEN = 160
DEFAULT_REFRESH_SECONDS = 30
UNASSIGNED_ASSIGNEE = "__unassigned__"
EVENT_PING_SECONDS = 15

CHANNEL_MAP = {
    "email": "email",
    "chat": "chat",
    "sms": "sms",
    "social": "social",
    "instagram": "instagram",
    "tiktok": "tiktok",
    "shopify": "shopify",
}

STATUS_MAP = {
    "pending": "open",
    "needs_review": "snoozed",
    "escalated": "escalated",
    "sent": "resolved",
}

CUSTOMER_DISPLAY_PATTERN = re.compile(r"^(.*?)(?:\s*<([^>]+)>)?$")


class EventBroker:
    """Minimal async pub/sub used to fan out approval events over SSE.

    Bounded queue to prevent unbounded memory growth under backpressure.
    Size can be tuned via EVENT_QUEUE_MAXSIZE env var (default: 1000).
    """

    def __init__(self) -> None:
        self._listeners: Set[asyncio.Queue[str]] = set()
        self._lock = asyncio.Lock()
        self._maxsize: int = int(os.getenv("EVENT_QUEUE_MAXSIZE", "1000"))

    async def subscribe(self) -> asyncio.Queue[str]:
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=self._maxsize)
        async with self._lock:
            self._listeners.add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue[str]) -> None:
        async with self._lock:
            self._listeners.discard(queue)

    async def publish(self, payload: Dict[str, Any]) -> None:
        data = json.dumps(payload)
        async with self._lock:
            listeners = list(self._listeners)
        for listener in listeners:
            try:
                listener.put_nowait(data)
            except asyncio.QueueFull:  # pragma: no cover - unbounded queue by default
                continue


events = EventBroker()
FALLBACK_CUSTOMER_NAME = "Customer"
FALLBACK_ASSISTANT_ACTOR = "Assistant"


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class SourceSnippet(BaseModel):
    title: str
    url: str
    relevance_score: Optional[float] = None


class DraftCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

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
    assigned_to: Optional[str] = None
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


def parse_assigned_param(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    token = value.strip()
    if not token:
        return None
    lowered = token.lower()
    if lowered == "all":
        return None
    if lowered in {"unassigned", "none"}:
        return UNASSIGNED_ASSIGNEE
    return token


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


def load_drafts(
    statuses: Optional[set[str]] = None,
    channels: Optional[set[str]] = None,
    assigned: Optional[str] = None,
    *,
    sort: bool = False,
    cursor: int = 0,
    limit: int = 25,
) -> Tuple[List[DraftModel], Optional[str], int]:
    offset = max(cursor, 0)
    page_size = max(limit, 1)

    with _session() as session:
        stmt = select(DraftModel)

        if statuses:
            stmt = stmt.where(DraftModel.status.in_(tuple(statuses)))
        if channels:
            stmt = stmt.where(DraftModel.channel.in_(tuple(channels)))
        if assigned:
            if assigned == UNASSIGNED_ASSIGNEE:
                stmt = stmt.where(DraftModel.assigned_to.is_(None))
            else:
                stmt = stmt.where(DraftModel.assigned_to == assigned)

        total_stmt = select(func.count()).select_from(stmt.subquery())
        total = session.scalar(total_stmt) or 0

        if sort:
            order_column = func.coalesce(DraftModel.sla_deadline, DraftModel.created_at)
            stmt = stmt.order_by(order_column.asc(), DraftModel.created_at.asc())

        page_stmt = stmt.offset(offset).limit(page_size)
        records = session.scalars(page_stmt).all()

    consumed = offset + len(records)
    next_cursor = str(consumed) if consumed < total else None
    return records, next_cursor, total


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


def map_channel(channel: Optional[str]) -> str:
    if not channel:
        return "email"
    normalized = str(channel).strip().lower()
    return CHANNEL_MAP.get(normalized, "email")


def map_status(status: Optional[str]) -> str:
    if not status:
        return "open"
    normalized = str(status).strip().lower()
    return STATUS_MAP.get(normalized, "open")


def determine_priority(detail: Dict[str, Any]) -> str:
    if detail.get("overdue"):
        return "urgent"
    if detail.get("auto_escalated"):
        return "urgent"

    tags = detail.get("tags") or []
    normalized = [str(tag).strip().lower() for tag in tags if isinstance(tag, str)]

    if any(tag == "vip" for tag in normalized):
        return "high"
    if any("priority" in tag for tag in normalized):
        return "high"
    return "medium"


def determine_sentiment(detail: Dict[str, Any]) -> str:
    if detail.get("overdue"):
        return "negative"
    if detail.get("auto_escalated"):
        return "negative"
    status = str(detail.get("status") or "").strip().lower()
    if status == "sent":
        return "positive"
    return "neutral"


def safe_iso(value: Optional[Any]) -> str:
    if isinstance(value, datetime):
        return to_iso(value)
    if isinstance(value, str) and value:
        parsed = parse_iso8601(value)
        if parsed:
            return to_iso(parsed)
        try:
            manual = datetime.fromisoformat(value)
        except ValueError:
            return to_iso(utc_now())
        return to_iso(manual)
    return to_iso(utc_now())


def parse_customer_display(display: Optional[str], fallback_id: Optional[str]) -> Dict[str, str]:
    if not display or not display.strip():
        return {
            "id": fallback_id or "customer",
            "name": FALLBACK_CUSTOMER_NAME,
            "email": "customer@example.com",
        }

    match = CUSTOMER_DISPLAY_PATTERN.match(display.strip())
    if not match:
        trimmed = display.strip()
        return {
            "id": fallback_id or trimmed,
            "name": trimmed,
            "email": "customer@example.com",
        }

    name = (match.group(1) or "").strip() or FALLBACK_CUSTOMER_NAME
    email = (match.group(2) or "").strip() or "customer@example.com"

    return {
        "id": fallback_id or email or name,
        "name": name,
        "email": email,
    }


def extract_attachments(snippets: Optional[List[Any]]) -> Optional[List[Dict[str, str]]]:
    if not snippets:
        return None

    attachments: List[Dict[str, str]] = []
    for index, snippet in enumerate(snippets):
        if not isinstance(snippet, dict):
            continue
        url = snippet.get("url")
        if not url:
            continue
        title = snippet.get("title")
        attachments.append(
            {
                "id": str(url),
                "name": str(title) if title else f"Reference {index + 1}",
                "url": str(url),
            }
        )
    return attachments or None


def describe_audit_action(entry: Dict[str, Any]) -> str:
    action = str(entry.get("action") or "event")
    normalized = action.replace("draft.", "").replace("_", " ")
    return normalized.title()


def build_timeline(
    detail: Dict[str, Any],
    customer_name: str,
    attachments: Optional[List[Dict[str, str]]],
) -> List[Dict[str, Any]]:
    timeline: List[Dict[str, Any]] = []
    draft_id = detail.get("draft_id") or detail.get("id") or "draft"
    created_at = safe_iso(detail.get("created_at"))
    incoming_body = (
        detail.get("incoming_text")
        or detail.get("incoming_excerpt")
        or "Customer message unavailable."
    )

    first_entry: Dict[str, Any] = {
        "id": f"{draft_id}-incoming",
        "type": "customer_message",
        "actor": customer_name,
        "timestamp": created_at,
        "body": incoming_body,
    }
    if attachments:
        first_entry["attachments"] = copy.deepcopy(attachments)
    timeline.append(first_entry)

    draft_text = (
        detail.get("draft_text")
        or detail.get("final_text")
        or detail.get("suggested_text")
        or detail.get("draft_excerpt")
    )
    if draft_text:
        timeline.append(
            {
                "id": f"{draft_id}-draft",
                "type": "agent_reply",
                "actor": detail.get("assigned_to") or FALLBACK_ASSISTANT_ACTOR,
                "timestamp": safe_iso(detail.get("sent_at") or detail.get("created_at")),
                "body": draft_text,
            }
        )

    for index, entry in enumerate(detail.get("audit_log") or []):
        timeline.append(
            {
                "id": f"{draft_id}-audit-{index}",
                "type": "system",
                "actor": entry.get("actor") or "System",
                "timestamp": safe_iso(entry.get("timestamp")),
                "body": describe_audit_action(entry),
            }
        )

    for index, note in enumerate(detail.get("notes") or []):
        if parse_feedback_note(note):
            continue
        timeline.append(
            {
                "id": f"{draft_id}-note-{index}",
                "type": "note",
                "actor": note.get("author_user_id") or FALLBACK_ASSISTANT_ACTOR,
                "timestamp": safe_iso(note.get("created_at")),
                "body": note.get("text") or "",
            }
        )

    for index, note in enumerate(detail.get("learning_notes") or []):
        timeline.append(
            {
                "id": f"{draft_id}-learning-{index}",
                "type": "note",
                "actor": note.get("author") or FALLBACK_ASSISTANT_ACTOR,
                "timestamp": safe_iso(note.get("timestamp")),
                "body": note.get("note") or "",
            }
        )

    return sorted(timeline, key=lambda entry: entry["timestamp"])


def parse_feedback_text(text: str) -> Optional[Dict[str, Any]]:
    try:
        parsed = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(parsed, dict):
        return None
    if parsed.get("type") != "feedback":
        return None
    vote = parsed.get("vote")
    if vote not in {"up", "down"}:
        return None
    comment = parsed.get("comment")
    return {
        "vote": vote,
        "comment": comment if isinstance(comment, str) and comment else None,
    }


def parse_feedback_note(note: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    text = note.get("text")
    if not isinstance(text, str):
        return None
    return parse_feedback_text(text)


def extract_feedback(detail: Dict[str, Any]) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    draft_id = detail.get("draft_id") or detail.get("id") or "draft"

    for note in detail.get("notes") or []:
        parsed = parse_feedback_note(note)
        if not parsed:
            continue
        entries.append(
            {
                "id": note.get("note_id") or f"{draft_id}-feedback",
                "draftId": draft_id,
                "ticketId": draft_id,
                "vote": parsed["vote"],
                "comment": parsed.get("comment"),
                "submittedAt": safe_iso(note.get("created_at")),
                "submittedBy": note.get("author_user_id") or FALLBACK_ASSISTANT_ACTOR,
            }
        )

    for index, note in enumerate(detail.get("learning_notes") or []):
        entries.append(
            {
                "id": f"{draft_id}-learning-{index}",
                "draftId": draft_id,
                "ticketId": draft_id,
                "vote": "up",
                "comment": note.get("note"),
                "submittedAt": safe_iso(note.get("timestamp")),
                "submittedBy": note.get("author") or FALLBACK_ASSISTANT_ACTOR,
            }
        )

    return sorted(entries, key=lambda entry: entry["submittedAt"])


def compute_revision(detail: Dict[str, Any]) -> int:
    audit_length = len(detail.get("audit_log") or [])
    return max(1, audit_length + 1)


def to_inbox_draft(detail: Dict[str, Any]) -> Dict[str, Any]:
    draft_id = detail.get("draft_id") or detail.get("id") or f"draft-{uuid4().hex}"
    updated_source = detail.get("sent_at") or detail.get("created_at")
    audit_log = detail.get("audit_log") or []
    last_actor = audit_log[-1]["actor"] if audit_log and audit_log[-1].get("actor") else None

    content = (
        detail.get("draft_text")
        or detail.get("final_text")
        or detail.get("suggested_text")
        or detail.get("draft_excerpt")
        or ""
    )

    return {
        "id": draft_id,
        "ticketId": draft_id,
        "content": content,
        "approved": map_status(detail.get("status")) == "resolved",
        "updatedAt": safe_iso(updated_source),
        "updatedBy": detail.get("assigned_to") or last_actor or FALLBACK_ASSISTANT_ACTOR,
        "revision": compute_revision(detail),
        "feedback": extract_feedback(detail),
    }


def to_inbox_ticket(detail: Dict[str, Any]) -> Dict[str, Any]:
    draft_id = detail.get("draft_id") or detail.get("id") or f"draft-{uuid4().hex}"
    channel = map_channel(detail.get("channel"))
    status = map_status(detail.get("status"))
    priority = determine_priority(detail)
    sentiment = determine_sentiment(detail)
    customer = parse_customer_display(detail.get("customer_display"), detail.get("conversation_id"))
    attachments = extract_attachments(detail.get("source_snippets"))
    timeline = build_timeline(detail, customer["name"], attachments)
    ai_draft = to_inbox_draft(detail)

    last_message_preview = (
        detail.get("incoming_excerpt")
        or detail.get("incoming_text")
        or (detail.get("conversation_summary") or [""])[0]
        or ""
    )

    order_context = detail.get("order_context")
    order_id: Optional[str] = None
    if isinstance(order_context, dict):
        raw_order_id = order_context.get("order_id")
        if isinstance(raw_order_id, str) and raw_order_id.strip():
            order_id = raw_order_id.strip()

    ticket: Dict[str, Any] = {
        "id": draft_id,
        "subject": detail.get("subject") or "Customer inquiry",
        "status": status,
        "priority": priority,
        "sentiment": sentiment,
        "updatedAt": safe_iso(detail.get("sent_at") or detail.get("created_at")),
        "createdAt": safe_iso(detail.get("created_at")),
        "channel": channel,
        "customer": customer,
        "assignedTo": detail.get("assigned_to"),
        "lastMessagePreview": last_message_preview,
        "slaBreached": bool(detail.get("overdue")),
        "aiDraft": ai_draft,
        "timeline": timeline,
    }

    if order_id:
        ticket["orderId"] = order_id
    if attachments:
        ticket["attachments"] = attachments

    return ticket


def note_to_feedback(detail: Dict[str, Any], note: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    parsed = parse_feedback_note(note)
    if not parsed:
        return None

    draft_id = detail.get("draft_id") or detail.get("id") or f"draft-{uuid4().hex}"

    return {
        "id": note.get("note_id") or f"{draft_id}-feedback",
        "draftId": draft_id,
        "ticketId": draft_id,
        "vote": parsed["vote"],
        "comment": parsed.get("comment"),
        "submittedAt": safe_iso(note.get("created_at")),
        "submittedBy": note.get("author_user_id") or FALLBACK_ASSISTANT_ACTOR,
    }


def build_event_envelope(
    detail: Dict[str, Any],
    *,
    message: str,
    event_type: str,
    event_payload: Dict[str, Any],
    feedback: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    ticket = to_inbox_ticket(detail)
    draft = copy.deepcopy(ticket["aiDraft"])
    timestamp = to_iso(utc_now())

    envelope: Dict[str, Any] = {
        "type": "event",
        "id": f"assistants-event-{uuid4().hex}",
        "timestamp": timestamp,
        "message": message,
        "ticket": ticket,
        "draft": draft,
        "event": {
            "type": event_type,
            "timestamp": timestamp,
            "payload": event_payload,
        },
    }

    if feedback:
        envelope["feedback"] = feedback

    return envelope


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------


app = FastAPI(title="Assistants Service", version="0.3.0")
registry = DeliveryAdapterRegistry()


def _maybe_setup_tracing(service_name: str) -> None:
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if not endpoint:
        return
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)
    processor = BatchSpanProcessor(OTLPSpanExporter())
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)


_maybe_setup_tracing("assistants")


@app.get("/health")
def health() -> Dict[str, Any]:
    """Lightweight health check for readiness/liveness probes.

    Verifies database connectivity with a trivial SELECT 1 and returns
    service metadata. Keeps it fast and side-effect free.
    """
    try:
        with ENGINE.connect() as conn:
            conn.execute(select(1))
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "db": db_ok,
        "timestamp": to_iso(utc_now()),
        "service": "assistants",
    }


@app.get("/prometheus")
def prometheus_metrics() -> PlainTextResponse:
    return PlainTextResponse(generate_latest().decode("utf-8"))


@app.get("/assistants/events")
async def events_stream(request: Request) -> StreamingResponse:
    queue = await events.subscribe()

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=EVENT_PING_SECONDS)
                except asyncio.TimeoutError:
                    yield "event: ping\ndata: {}\n\n"
                    continue
                yield f"data: {message}\n\n"
        finally:
            await events.unsubscribe(queue)

    headers = {"Cache-Control": "no-cache", "Connection": "keep-alive"}
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)


@app.post("/assistants/draft")
async def draft(body: DraftCreate) -> Dict[str, str]:
    extra_fields = dict(getattr(body, "model_extra", {}) or {})
    combined_metadata: Dict[str, Any] = {**extra_fields}
    if body.metadata:
        combined_metadata.update(body.metadata)

    resolved_customer_display = body.customer_display
    if not resolved_customer_display:
        candidate = combined_metadata.get("customer_display")
        if isinstance(candidate, str) and candidate.strip():
            resolved_customer_display = candidate.strip()
        else:
            email = combined_metadata.get("customer_email")
            if isinstance(email, str) and email.strip():
                resolved_customer_display = email.strip()

    record = DraftModel(
        channel=body.channel,
        conversation_id=body.conversation_id,
        customer_display=resolved_customer_display,
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
        assigned_to=body.assigned_to,
        extra_metadata=combined_metadata,
    )
    append_audit(record, actor="assistant-service", action="draft.created", payload={"channel": body.channel})
    with _session() as session:
        session.add(record)
        session.commit()
        detail = serialize_detail(record)
        revision = compute_revision(detail)
        envelope = build_event_envelope(
            detail,
            message="Draft ready for review.",
            event_type="draft:updated",
            event_payload={"ticketId": detail.get("draft_id") or record.id, "revision": revision},
        )
        draft_id = record.id

    await events.publish(envelope)
    return {"draft_id": draft_id}


@app.get("/assistants/drafts")
async def list_drafts(
    status: Optional[str] = None,
    channel: Optional[str] = None,
    assigned: Optional[str] = None,
    cursor: int = 0,
    limit: int = 25,
) -> JSONResponse:
    statuses = parse_statuses_param(status)
    channels = parse_channels_param(channel)
    assigned_filter = parse_assigned_param(assigned)
    page, next_cursor, total = load_drafts(
        statuses=statuses,
        channels=channels,
        assigned=assigned_filter,
        sort=True,
        cursor=cursor,
        limit=limit,
    )
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
    adapter_payload: Optional[Tuple[str, Dict[str, Any]]] = None
    envelope: Optional[Dict[str, Any]] = None
    response: Dict[str, Any]
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
            detail = serialize_detail(record)
            revision = compute_revision(detail)
            envelope = build_event_envelope(
                detail,
                message="Draft escalated to specialist.",
                event_type="draft:updated",
                event_payload={
                    "ticketId": detail.get("draft_id") or record.id,
                    "revision": revision,
                    "status": map_status(record.status),
                },
            )
            response = {"status": "escalated"}
        else:
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
            detail = serialize_detail(record)
            revision = compute_revision(detail)
            envelope = build_event_envelope(
                detail,
                message="Draft approved.",
                event_type="draft:approved",
                event_payload={
                    "ticketId": detail.get("draft_id") or record.id,
                    "revision": revision,
                },
            )
            adapter_payload = (record.channel, delivery_metadata(record))
            response = {}

    if adapter_payload:
        channel, metadata = adapter_payload
        external_id = await registry.send(channel, metadata)
        response["sent_msg_id"] = external_id

    if envelope:
        await events.publish(envelope)

    return response


@app.post("/assistants/edit")
async def edit(body: Edit) -> Dict[str, Any]:
    metadata: Dict[str, Any]
    channel: str
    envelope: Dict[str, Any]
    with _session() as session:
        record = session.get(DraftModel, body.draft_id)
        if not record:
            raise HTTPException(status_code=404, detail="Draft not found")
        record.draft_text = body.final_text
        record.draft_excerpt = clean_excerpt(body.final_text)
        record.status = "sent"
        record.sent_at = utc_now()
        record.usd_sent_copy = body.send_copy_to_customer
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
        metadata = delivery_metadata(record)
        channel = record.channel
        detail = serialize_detail(record)
        revision = compute_revision(detail)
        envelope = build_event_envelope(
            detail,
            message="Draft sent with edits.",
            event_type="draft:updated",
            event_payload={
                "ticketId": detail.get("draft_id") or record.id,
                "revision": revision,
            },
        )

    external_id = await registry.send(channel, metadata)
    await events.publish(envelope)
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
        detail = serialize_detail(record)
        revision = compute_revision(detail)
        envelope = build_event_envelope(
            detail,
            message="Draft escalated.",
            event_type="draft:updated",
            event_payload={
                "ticketId": detail.get("draft_id") or record.id,
                "revision": revision,
                "status": map_status(record.status),
            },
        )

    await events.publish(envelope)
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
        detail = serialize_detail(record)
        revision = compute_revision(detail)
        ticket_id = detail.get("draft_id") or record.id
        feedback_entry = note_to_feedback(detail, note)
        if feedback_entry:
            envelope = build_event_envelope(
                detail,
                message="Feedback recorded.",
                event_type="draft:feedback",
                event_payload={
                    "ticketId": ticket_id,
                    "draftId": ticket_id,
                    "vote": feedback_entry["vote"],
                    "revision": revision,
                },
                feedback=feedback_entry,
            )
        else:
            envelope = build_event_envelope(
                detail,
                message="Note added to draft.",
                event_type="draft:updated",
                event_payload={
                    "ticketId": ticket_id,
                    "revision": revision,
                },
            )

    await events.publish(envelope)
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
