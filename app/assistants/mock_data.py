"""Deterministic inbox mock scenarios used for demos and tests."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

ISO_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
NOW = datetime(2024, 6, 4, 23, 45, tzinfo=timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).strftime(ISO_FORMAT)


def _deadline(minutes: int) -> str:
    return _iso(NOW + timedelta(minutes=minutes))


def _created(minutes: int) -> str:
    return _iso(NOW - timedelta(minutes=minutes))


def _baseline_draft(overrides: Dict[str, Any]) -> Dict[str, Any]:
    base: Dict[str, Any] = {
        "channel": "email",
        "conversation_id": "conv-default",
        "incoming_text": "Customer asked about AN-8 pump sizing and fittings compatibility.",
        "draft_text": "Thanks for reaching out! Here is the AN-8 sizing guidance you requested.",
        "customer_display": "Alex P.",
        "subject": "AN-8 pump sizing",
        "confidence": 0.78,
        "llm_model": "gpt-4o-mini",
        "estimated_tokens_in": 640,
        "estimated_tokens_out": 280,
        "usd_cost": 0.011,
        "sla_deadline": _deadline(30),
        "sentiment": "neutral",
        "tags": ["inventory"],
        "conversation_summary": ["Customer wants sizing guidance"],
        "source_snippets": [
            {
                "title": "AN-8 sizing guide",
                "url": "https://docs.example.com/an-8-sizing",
                "relevance_score": 0.91,
            }
        ],
        "order_context": {
            "orders_count": 5,
            "lifetime_value": 1267.40,
            "last_order_at": _iso(NOW - timedelta(days=12)),
        },
    }
    base.update(overrides)
    return base


def _audit(actor: str, action: str, offset_minutes: int, payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    return {
        "timestamp": _iso(NOW - timedelta(minutes=offset_minutes)),
        "actor": actor,
        "action": action,
        "payload": payload or {},
    }


SCENARIOS: Dict[str, List[Dict[str, Any]]] = {
    "default": [
        {
            "draft": _baseline_draft(
                {
                    "conversation_id": "conv-default-1",
                    "confidence": 0.88,
                    "tags": ["inventory", "vip"],
                    "sla_deadline": _deadline(18),
                    "sentiment": "positive",
                }
            ),
            "model": {
                "status": "pending",
                "created_at": _created(10),
                "assigned_to": None,
                "auto_escalated": False,
                "feedback_positive": 2,
                "feedback_negative": 0,
                "feedback_events": [
                    {
                        "timestamp": _iso(NOW - timedelta(minutes=6)),
                        "reviewer_user_id": "ops-21",
                        "feedback": "up",
                        "note": "Ready to send",
                        "source": "mock-scenario",
                    }
                ],
                "notes": [
                    {
                        "note_id": "n1",
                        "author_user_id": "ops-7",
                        "text": "Verify shipping address before approve.",
                        "created_at": _iso(NOW - timedelta(minutes=8)),
                    }
                ],
                "audit_log": [
                    _audit("assistant-service", "draft.created", 10, {"channel": "email"}),
                ],
            },
        },
        {
            "draft": _baseline_draft(
                {
                    "channel": "chat",
                    "conversation_id": "conv-default-2",
                    "chat_topic": "Shipping delay follow-up",
                    "incoming_text": "Package still in transit—need ETA before customer escalates.",
                    "draft_text": "Sharing latest tracking plus goodwill credit offer.",
                    "confidence": 0.42,
                    "sentiment": "negative",
                    "sla_deadline": _deadline(-5),
                    "tags": ["shipping", "priority"],
                }
            ),
            "model": {
                "status": "needs_review",
                "created_at": _created(35),
                "auto_escalated": True,
                "auto_escalation_reason": "Low confidence",
                "assigned_to": "ops-escalations",
                "feedback_positive": 0,
                "feedback_negative": 1,
                "feedback_events": [
                    {
                        "timestamp": _iso(NOW - timedelta(minutes=14)),
                        "reviewer_user_id": "ops-9",
                        "feedback": "down",
                        "reason": "Tone needs empathy",
                    }
                ],
                "notes": [],
                "audit_log": [
                    _audit("assistant-service", "draft.created", 35, {"channel": "chat"}),
                    _audit("ops-9", "draft.flagged_low_confidence", 14, {}),
                ],
            },
        },
        {
            "draft": _baseline_draft(
                {
                    "conversation_id": "conv-default-3",
                    "subject": "Invoice copy",
                    "incoming_text": "Please resend the paid invoice for order #1042.",
                    "draft_text": "Attached the PDF and summarized warranty info.",
                    "confidence": 0.94,
                    "sla_deadline": _deadline(240),
                    "tags": ["billing"],
                }
            ),
            "model": {
                "status": "sent",
                "created_at": _created(90),
                "sent_at": _iso(NOW - timedelta(minutes=60)),
                "usd_sent_copy": True,
                "feedback_positive": 1,
                "feedback_negative": 0,
                "feedback_events": [],
                "notes": [],
                "audit_log": [
                    _audit("assistant-service", "draft.created", 90, {"channel": "email"}),
                    _audit("ops-5", "draft.approved", 60, {"send_copy_to_customer": True}),
                ],
            },
        },
    ],
    "heavy": [
        {
            "draft": _baseline_draft(
                {
                    "conversation_id": "conv-heavy-1",
                    "incoming_text": "Need expedited handling on #1204.",
                    "draft_text": "Outlined upgraded shipping options and apologies.",
                    "confidence": 0.67,
                    "sentiment": "neutral",
                    "sla_deadline": _deadline(5),
                    "tags": ["shipping", "vip"],
                }
            ),
            "model": {
                "status": "pending",
                "created_at": _created(12),
                "assigned_to": "ops-queue-a",
                "feedback_positive": 0,
                "feedback_negative": 0,
                "feedback_events": [],
                "notes": [],
                "audit_log": [
                    _audit("assistant-service", "draft.created", 12, {"channel": "email"}),
                ],
            },
        },
        {
            "draft": _baseline_draft(
                {
                    "conversation_id": "conv-heavy-2",
                    "channel": "chat",
                    "chat_topic": "Inventory check: turbo kit",
                    "confidence": 0.51,
                    "sla_deadline": _deadline(45),
                }
            ),
            "model": {
                "status": "pending",
                "created_at": _created(20),
                "assigned_to": None,
                "feedback_positive": 0,
                "feedback_negative": 0,
                "feedback_events": [],
                "notes": [],
                "audit_log": [
                    _audit("assistant-service", "draft.created", 20, {"channel": "chat"}),
                ],
            },
        },
        {
            "draft": _baseline_draft(
                {
                    "conversation_id": "conv-heavy-3",
                    "incoming_text": "Want to upgrade subscription tier.",
                    "draft_text": "Shared pricing breakdown and next steps.",
                    "confidence": 0.83,
                    "sentiment": "positive",
                    "sla_deadline": _deadline(90),
                    "tags": ["sales"],
                }
            ),
            "model": {
                "status": "needs_review",
                "created_at": _created(28),
                "assigned_to": "ops-onboarding",
                "feedback_positive": 1,
                "feedback_negative": 0,
                "feedback_events": [
                    {
                        "timestamp": _iso(NOW - timedelta(minutes=9)),
                        "reviewer_user_id": "ops-13",
                        "feedback": "up",
                        "note": "Ready pending approval",
                    }
                ],
                "audit_log": [
                    _audit("assistant-service", "draft.created", 28, {"channel": "email"}),
                ],
            },
        },
        {
            "draft": _baseline_draft(
                {
                    "conversation_id": "conv-heavy-4",
                    "incoming_text": "Return request for kit #204.",
                    "draft_text": "Provided label and refund policy summary.",
                    "confidence": 0.59,
                    "sentiment": "neutral",
                    "sla_deadline": _deadline(-25),
                    "tags": ["returns"],
                }
            ),
            "model": {
                "status": "escalated",
                "created_at": _created(55),
                "assigned_to": "ops-refunds",
                "escalation_reason": "High order value",
                "feedback_positive": 0,
                "feedback_negative": 1,
                "feedback_events": [],
                "audit_log": [
                    _audit("assistant-service", "draft.created", 55, {"channel": "email"}),
                    _audit("ops-queue-a", "draft.escalated", 25, {"reason": "High order value"}),
                ],
            },
        },
    ],
    "empty": [],
    "outage": [],
}


def list_mock_scenarios() -> List[str]:
    """Return the sorted list of available mock scenario names."""
    return sorted(SCENARIOS.keys())


def get_mock_scenario(name: str) -> List[Dict[str, Any]]:
    """Return a deep copy of the requested scenario definition."""
    try:
        scenario = SCENARIOS[name]
    except KeyError as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"Unknown inbox mock scenario '{name}'") from exc
    return deepcopy(scenario)


__all__ = ["list_mock_scenarios", "get_mock_scenario"]
