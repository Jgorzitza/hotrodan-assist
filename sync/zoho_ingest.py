"""Normalize Zoho payloads into the data layer."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from data import ConversationRepository


def process_incoming_email(session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Persist an incoming Zoho email into conversations/messages."""

    message = payload.get("message", {})
    thread_id = str(message.get("threadId") or message.get("thread_id") or payload.get("thread_id"))
    if not thread_id:
        raise ValueError("Zoho payload missing thread_id")

    channel = "email"
    convo_repo = ConversationRepository(session)
    conversation = convo_repo.upsert(
        channel=channel,
        external_thread_id=thread_id,
        subject=message.get("subject") or payload.get("subject"),
    )

    sender = _pick_email(message.get("fromAddress") or message.get("from"))
    sent_ts = _parse_ts(message.get("receivedTime") or message.get("dateInLong"))

    convo_repo.add_message(
        conversation,
        direction="inbound",
        body=message.get("content") or message.get("summary") or "",
        customer_email=sender,
        sent_at=sent_ts,
        external_msg_id=str(message.get("messageId") or message.get("id")),
        raw_payload=payload,
    )

    return {"conversation_id": str(conversation.id)}


def enqueue_incoming_email(payload: Dict[str, Any]) -> None:
    try:
        from jobs.tasks import process_incoming_email_task
    except ImportError as exc:  # pragma: no cover - optional dependency during bootstrapping
        raise RuntimeError("Celery tasks module not available") from exc

    process_incoming_email_task.delay(payload)


def _pick_email(value: Any) -> str | None:
    if isinstance(value, dict):
        return value.get("address") or value.get("email")
    if isinstance(value, str):
        return value
    return None


def _parse_ts(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.utcfromtimestamp(int(value) / 1000 if int(value) > 1e12 else int(value))
    if isinstance(value, str):
        for parser in (_parse_iso, _parse_rfc2822):
            try:
                return parser(value)
            except ValueError:
                continue
    return None


def _parse_iso(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


def _parse_rfc2822(value: str) -> datetime:
    from email.utils import parsedate_to_datetime

    return parsedate_to_datetime(value)
