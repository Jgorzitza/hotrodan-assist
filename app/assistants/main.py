"""Assistants service: drafts inbox API, approve/edit/escalate flows, websocket stubs."""
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

app = FastAPI()

# In-memory storage; replace with persistent store when wiring real adapters.
DRAFTS: Dict[str, Dict[str, Any]] = {}
COUNTER = 0
VALID_STATUSES = {"pending", "needs_review", "escalated", "sent"}
DEFAULT_CHANNELS = {"email", "chat", "sms", "social"}
MAX_EXCERPT_LEN = 160
DEFAULT_REFRESH_SECONDS = 30


def parse_statuses_param(value: Optional[str]) -> set:
    if value:
        tokens = [tok.strip().lower() for tok in value.split(",") if tok.strip()]
        if "all" in tokens:
            statuses = VALID_STATUSES.copy()
        else:
            statuses = set(tokens)
    else:
        statuses = {"pending"}

    unknown = statuses - VALID_STATUSES
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unsupported status filter: {sorted(unknown)}")
    return statuses


def parse_channels_param(value: Optional[str]) -> Optional[set]:
    if not value:
        return None
    channels = {token.strip().lower() for token in value.split(",") if token.strip()}
    unknown = channels - DEFAULT_CHANNELS
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unsupported channel filter: {sorted(unknown)}")
    return channels


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso8601(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def clean_excerpt(text: str) -> str:
    snippet = " ".join(text.split()) if text else ""
    return snippet[:MAX_EXCERPT_LEN]


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
        return [item.strip() for item in value if item and item.strip()]


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


class InboxWebSocketManager:
    def __init__(self) -> None:
        self.connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.connections.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.connections:
                self.connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self.connections)
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(ws)


manager = InboxWebSocketManager()


def ensure_draft_exists(draft_id: str) -> Dict[str, Any]:
    draft = DRAFTS.get(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


def append_audit(draft: Dict[str, Any], actor: str, action: str, payload: Optional[Dict[str, Any]] = None) -> None:
    entry = {
        "timestamp": to_iso(utc_now()),
        "actor": actor,
        "action": action,
        "payload": payload or {},
    }
    draft.setdefault("audit_log", []).append(entry)


async def emit(event_type: str, draft: Dict[str, Any]) -> None:
    message = {
        "type": event_type,
        "draft_id": draft["draft_id"],
        "status": draft["status"],
        "timestamp": to_iso(utc_now()),
    }
    await manager.broadcast(message)


def compute_time_fields(draft: Dict[str, Any]) -> Dict[str, Any]:
    deadline_iso = draft.get("sla_deadline")
    deadline_dt = parse_iso8601(deadline_iso) if deadline_iso else None
    if not deadline_dt:
        return {"time_remaining_seconds": None, "overdue": False}
    delta = deadline_dt - utc_now()
    seconds = int(delta.total_seconds())
    return {"time_remaining_seconds": seconds, "overdue": seconds < 0}


def build_list_payload(draft: Dict[str, Any]) -> Dict[str, Any]:
    timing = compute_time_fields(draft)
    return {
        "draft_id": draft["draft_id"],
        "channel": draft["channel"],
        "conversation_id": draft["conversation_id"],
        "customer_display": draft.get("customer_display"),
        "subject": draft.get("subject"),
        "chat_topic": draft.get("chat_topic"),
        "incoming_excerpt": draft.get("incoming_excerpt"),
        "draft_excerpt": draft.get("draft_excerpt"),
        "confidence": draft.get("confidence"),
        "llm_model": draft.get("llm_model"),
        "estimated_tokens_in": draft.get("estimated_tokens_in"),
        "estimated_tokens_out": draft.get("estimated_tokens_out"),
        "usd_cost": draft.get("usd_cost"),
        "created_at": draft.get("created_at"),
        "sla_deadline": draft.get("sla_deadline"),
        "status": draft.get("status"),
        "tags": draft.get("tags", []),
        "auto_escalated": draft.get("auto_escalated", False),
        "auto_escalation_reason": draft.get("auto_escalation_reason"),
        "assigned_to": draft.get("assigned_to"),
        "escalation_reason": draft.get("escalation_reason"),
        "time_remaining_seconds": timing["time_remaining_seconds"],
        "overdue": timing["overdue"],
    }


def build_detail_payload(draft: Dict[str, Any]) -> Dict[str, Any]:
    detail = build_list_payload(draft)
    detail.update(
        {
            "incoming_text": draft.get("incoming_text"),
            "draft_text": draft.get("draft_text"),
            "source_snippets": draft.get("source_snippets", []),
            "conversation_summary": draft.get("conversation_summary", []),
            "order_context": draft.get("order_context", {}),
            "audit_log": draft.get("audit_log", []),
            "notes": draft.get("notes", []),
            "metadata": draft.get("metadata", {}),
            "model_latency_ms": draft.get("model_latency_ms"),
            "sent_at": draft.get("sent_at"),
            "learning_notes": draft.get("learning_notes", []),
        }
    )
    return detail


def filtered_drafts(statuses: set, channels: Optional[set]) -> List[Dict[str, Any]]:
    matches: List[Dict[str, Any]] = []
    for draft in DRAFTS.values():
        if draft.get("status") not in statuses:
            continue
        if channels and draft.get("channel") not in channels:
            continue
        matches.append(draft)
    return matches


@app.post("/assistants/draft")
async def draft(body: DraftCreate) -> Dict[str, str]:
    global COUNTER
    COUNTER += 1
    draft_id = f"d{COUNTER}"
    created_at = to_iso(utc_now())
    sla_dt = parse_iso8601(body.sla_deadline) if body.sla_deadline else None
    draft_entry = {
        "draft_id": draft_id,
        "channel": body.channel,
        "conversation_id": body.conversation_id,
        "customer_display": body.customer_display,
        "subject": body.subject,
        "chat_topic": body.chat_topic,
        "incoming_text": body.incoming_text,
        "incoming_excerpt": clean_excerpt(body.incoming_text),
        "draft_text": body.draft_text,
        "draft_excerpt": clean_excerpt(body.draft_text or ""),
        "confidence": body.confidence if body.confidence is not None else 0.75,
        "llm_model": body.llm_model or "gpt-4o-mini",
        "estimated_tokens_in": body.estimated_tokens_in,
        "estimated_tokens_out": body.estimated_tokens_out,
        "usd_cost": body.usd_cost,
        "created_at": created_at,
        "sla_deadline": to_iso(sla_dt) if sla_dt else None,
        "status": "pending",
        "tags": [tag for tag in body.tags if tag],
        "source_snippets": [snippet.dict() for snippet in body.source_snippets],
        "conversation_summary": body.conversation_summary,
        "order_context": body.order_context,
        "model_latency_ms": body.model_latency_ms,
        "auto_escalated": body.auto_escalated,
        "auto_escalation_reason": body.auto_escalation_reason,
        "metadata": body.metadata,
        "notes": [],
        "learning_notes": [],
        "assigned_to": None,
        "escalation_reason": None,
    }
    DRAFTS[draft_id] = draft_entry
    append_audit(draft_entry, actor="assistant-service", action="draft.created", payload={"channel": body.channel})
    await emit("draft.created", draft_entry)
    return {"draft_id": draft_id}


@app.get("/dashboard/inbox")
async def inbox(status: Optional[str] = None, channel: Optional[str] = None, cursor: int = 0, limit: int = 25) -> JSONResponse:
    statuses = parse_statuses_param(status)
    channels = parse_channels_param(channel)

    filtered = filtered_drafts(statuses, channels)

    # Sort by SLA deadline then created_at as requested.
    def sort_key(d: Dict[str, Any]):
        deadline = parse_iso8601(d.get("sla_deadline"))
        created = parse_iso8601(d.get("created_at")) or utc_now()
        return (deadline or created, created)

    filtered.sort(key=sort_key)

    start = max(cursor, 0)
    end = start + max(limit, 1)
    page_items = filtered[start:end]
    next_cursor = str(end) if end < len(filtered) else None

    payload = {
        "items": [build_list_payload(item) for item in page_items],
        "next_cursor": next_cursor,
        "total": len(filtered),
    }
    return JSONResponse(content=payload, headers={"X-Refresh-After": str(DEFAULT_REFRESH_SECONDS)})


@app.get("/dashboard/inbox/stats")
async def inbox_stats(channel: Optional[str] = None) -> Dict[str, Any]:
    channels = parse_channels_param(channel)
    now = utc_now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    counts = {status: 0 for status in VALID_STATUSES}
    confidence_total = 0.0
    confidence_count = 0
    overdue = 0
    sent_today = 0

    for draft in DRAFTS.values():
        if channels and draft.get("channel") not in channels:
            continue
        status = draft.get("status", "pending")
        if status in counts:
            counts[status] += 1
        confidence = draft.get("confidence")
        if status in {"pending", "needs_review"} and confidence is not None:
            confidence_total += confidence
            confidence_count += 1
        sent_at = parse_iso8601(draft.get("sent_at"))
        if sent_at and sent_at >= start_of_day:
            sent_today += 1
        if status in {"pending", "needs_review"} and compute_time_fields(draft)["overdue"]:
            overdue += 1

    avg_confidence = (
        round(confidence_total / confidence_count, 4) if confidence_count else None
    )

    return {
        "pending": counts.get("pending", 0),
        "needs_review": counts.get("needs_review", 0),
        "escalated": counts.get("escalated", 0),
        "sent": counts.get("sent", 0),
        "sent_today": sent_today,
        "avg_confidence_pending": avg_confidence,
        "overdue": overdue,
        "generated_at": to_iso(now),
    }


@app.get("/dashboard/inbox/{draft_id}")
async def inbox_detail(draft_id: str) -> Dict[str, Any]:
    draft = ensure_draft_exists(draft_id)
    return {"draft": build_detail_payload(draft)}


@app.post("/assistants/approve")
async def approve(body: Approve) -> Dict[str, Any]:
    draft = ensure_draft_exists(body.draft_id)
    if draft.get("status") == "sent":
        raise HTTPException(status_code=409, detail="Draft already sent")

    if body.escalate_to_specialist:
        draft["status"] = "escalated"
        if body.assign_to:
            draft["assigned_to"] = body.assign_to
        if body.escalation_reason:
            draft["escalation_reason"] = body.escalation_reason
        append_audit(
            draft,
            actor=body.approver_user_id,
            action="draft.escalated_during_approve",
            payload={
                "escalate_to_specialist": True,
                "assign_to": body.assign_to,
                "escalation_reason": body.escalation_reason,
            },
        )
        await emit("draft.escalated", draft)
        return {"status": "escalated"}

    draft["status"] = "sent"
    draft["sent_at"] = to_iso(utc_now())
    append_audit(
        draft,
        actor=body.approver_user_id,
        action="draft.approved",
        payload={"send_copy_to_customer": body.send_copy_to_customer},
    )
    await emit("draft.sent", draft)
    return {"sent_msg_id": "ext-approve-stub"}


@app.post("/assistants/edit")
async def edit(body: Edit) -> Dict[str, Any]:
    draft = ensure_draft_exists(body.draft_id)
    draft["draft_text"] = body.final_text
    draft["draft_excerpt"] = clean_excerpt(body.final_text)
    draft["status"] = "sent"
    draft["sent_at"] = to_iso(utc_now())
    if body.learning_notes:
        draft.setdefault("learning_notes", []).append(
            {
                "note": body.learning_notes,
                "author": body.editor_user_id,
                "timestamp": to_iso(utc_now()),
            }
        )
    append_audit(
        draft,
        actor=body.editor_user_id,
        action="draft.edited",
        payload={"send_copy_to_customer": body.send_copy_to_customer},
    )
    await emit("draft.sent", draft)
    return {"sent_msg_id": "ext-edit-stub"}


@app.post("/assistants/escalate")
async def escalate(body: Escalate) -> Dict[str, Any]:
    draft = ensure_draft_exists(body.draft_id)
    draft["status"] = "escalated"
    draft["assigned_to"] = body.assigned_to
    draft["escalation_reason"] = body.reason
    append_audit(
        draft,
        actor=body.requester_user_id,
        action="draft.escalated",
        payload={"assigned_to": body.assigned_to, "reason": body.reason},
    )
    await emit("draft.escalated", draft)
    return {"status": "escalated"}


@app.post("/assistants/notes")
async def add_note(body: NoteCreate) -> Dict[str, Any]:
    draft = ensure_draft_exists(body.draft_id)
    note = {
        "note_id": f"n{len(draft.setdefault('notes', [])) + 1}",
        "author_user_id": body.author_user_id,
        "text": body.text,
        "created_at": to_iso(utc_now()),
    }
    draft["notes"].append(note)
    append_audit(draft, actor=body.author_user_id, action="draft.note_added", payload={"note_id": note["note_id"]})
    await emit("draft.updated", draft)
    return {"note": note}


@app.websocket("/ws/inbox")
async def websocket_inbox(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)
