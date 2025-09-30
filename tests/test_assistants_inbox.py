import os
import pathlib
from typing import Any, Dict

os.environ["ASSISTANTS_DB_URL"] = "sqlite:///./test_assistants_inbox.db"

import pytest
from fastapi.testclient import TestClient

import app.assistants.main as assistants


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def reset_state():
    assistants.reset_state_for_tests()
    yield
    assistants.reset_state_for_tests()


def build_payload(**overrides: Dict) -> Dict:
    base = {
        "channel": "email",
        "conversation_id": "conv-1",
        "incoming_text": "Customer needs AN-8 pump sizing",
        "draft_text": "Here is the guidance you requested.",
        "customer_display": "Alex P.",
        "subject": "Pump sizing",
        "confidence": 0.78,
        "llm_model": "gpt-4o-mini",
        "estimated_tokens_in": 640,
        "estimated_tokens_out": 280,
        "usd_cost": 0.011,
        "sla_deadline": "2099-01-01T00:30:00Z",
        "tags": ["inventory"],
    }
    base.update(overrides)
    return base


def test_seed_mock_scenario_populates_counts():
    assistants.seed_mock_scenario("default")
    client = TestClient(assistants.app)

    listing = client.get("/dashboard/inbox", params={"status": "all"}).json()
    assert listing["total"] == 3
    assert listing["items"][0]["feedback_positive"] >= 0

    stats = client.get("/dashboard/inbox/stats", params={"status": "all"}).json()
    assert stats["total"] == 3
    assert "confidence_histogram" in stats
    assert sum(stats["confidence_histogram"].values()) >= 2
    assert "default" in assistants.list_mock_scenarios()


def test_draft_create_and_list_filters_pending_and_escalated():
    client = TestClient(assistants.app)
    draft_one = client.post("/assistants/draft", json=build_payload(conversation_id="conv-1")).json()["draft_id"]
    draft_two = client.post(
        "/assistants/draft",
        json=build_payload(conversation_id="conv-2", confidence=0.55, sla_deadline="1999-01-01T00:00:00Z"),
    ).json()["draft_id"]

    client.post(
        "/assistants/approve",
        json={
            "draft_id": draft_two,
            "approver_user_id": "approver-1",
            "escalate_to_specialist": True,
            "escalation_reason": "Needs pricing override",
            "assign_to": "specialist-1",
        },
    )

    listing = client.get("/dashboard/inbox", params={"status": "pending,needs_review"})
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] == 1
    assert body["items"][0]["draft_id"] == draft_one
    assert listing.headers["X-Refresh-After"] == "30"


def test_stats_and_detail_include_learning_notes_and_escalation_fields():
    client = TestClient(assistants.app)
    draft_one = client.post("/assistants/draft", json=build_payload()).json()["draft_id"]
    draft_two = client.post(
        "/assistants/draft",
        json=build_payload(conversation_id="conv-2", tags=["returns"]),
    ).json()["draft_id"]

    client.post(
        "/assistants/edit",
        json={
            "draft_id": draft_one,
            "editor_user_id": "editor-1",
            "final_text": "Updated reply with pump table",
            "learning_notes": "Add pump table",
        },
    )
    client.post(
        "/assistants/approve",
        json={
            "draft_id": draft_two,
            "approver_user_id": "approver-2",
            "escalate_to_specialist": True,
            "escalation_reason": "Needs pricing override",
            "assign_to": "specialist-9",
        },
    )

    stats = client.get("/dashboard/inbox/stats").json()
    assert stats["escalated"] == 1
    assert stats["sent"] >= 1
    assert "confidence_histogram" in stats
    assert set(stats["confidence_histogram"].keys()) == {"low", "medium", "high", "unscored"}

    detail_two = client.get(f"/dashboard/inbox/{draft_two}").json()["draft"]
    assert detail_two["escalation_reason"] == "Needs pricing override"
    assert detail_two["assigned_to"] == "specialist-9"

    detail_one = client.get(f"/dashboard/inbox/{draft_one}").json()["draft"]
    assert detail_one["learning_notes"][0]["note"] == "Add pump table"
    assert detail_one["feedback_positive"] == 0
    assert detail_one["feedback_negative"] == 0


@pytest.mark.parametrize("status_param", ["", "pending", "pending,needs_review", "all"])
def test_status_param_validation(status_param):
    client = TestClient(assistants.app)
    client.post("/assistants/draft", json=build_payload())
    resp = client.get("/dashboard/inbox", params={"status": status_param})
    assert resp.status_code == 200


def test_invalid_channel_rejected_on_create():
    client = TestClient(assistants.app)
    resp = client.post("/assistants/draft", json=build_payload(channel="fax"))
    assert resp.status_code == 422


def test_notes_endpoint_appends_note():
    client = TestClient(assistants.app)
    draft_id = client.post("/assistants/draft", json=build_payload()).json()["draft_id"]
    resp = client.post(
        "/assistants/notes",
        json={"draft_id": draft_id, "author_user_id": "author", "text": "Verify fittings"},
    )
    assert resp.status_code == 200
    detail = client.get(f"/dashboard/inbox/{draft_id}").json()["draft"]
    assert detail["notes"][0]["text"] == "Verify fittings"


def test_inbox_filters_by_sentiment_and_assignment():
    client = TestClient(assistants.app)
    draft_pending = client.post(
        "/assistants/draft",
        json=build_payload(conversation_id="conv-1", sentiment="positive"),
    ).json()["draft_id"]
    draft_negative = client.post(
        "/assistants/draft",
        json=build_payload(conversation_id="conv-2", sentiment="negative"),
    ).json()["draft_id"]

    client.post(
        "/assistants/escalate",
        json={
            "draft_id": draft_negative,
            "requester_user_id": "user-1",
            "reason": "Needs follow-up",
            "assigned_to": "specialist-9",
        },
    )

    sentiment_resp = client.get(
        "/dashboard/inbox",
        params={"status": "all", "sentiment": "positive"},
    )
    assert sentiment_resp.status_code == 200
    sentiment_ids = {item["draft_id"] for item in sentiment_resp.json()["items"]}
    assert sentiment_ids == {draft_pending}

    assignment_resp = client.get(
        "/dashboard/inbox",
        params={"status": "all", "assigned": "specialist-9"},
    )
    assert assignment_resp.status_code == 200
    assignment_ids = {item["draft_id"] for item in assignment_resp.json()["items"]}
    assert assignment_ids == {draft_negative}

    unassigned_resp = client.get(
        "/dashboard/inbox",
        params={"status": "all", "assigned": "unassigned"},
    )
    assert unassigned_resp.status_code == 200
    unassigned_ids = {item["draft_id"] for item in unassigned_resp.json()["items"]}
    assert draft_pending in unassigned_ids
    assert draft_negative not in unassigned_ids


def test_feedback_endpoints_log_and_summarize_events():
    client = TestClient(assistants.app)
    draft_id = client.post(
        "/assistants/draft",
        json=build_payload(conversation_id="conv-feedback", sentiment="neutral"),
    ).json()["draft_id"]

    first = client.post(
        "/assistants/feedback",
        json={
            "draft_id": draft_id,
            "reviewer_user_id": "reviewer-1",
            "feedback": "up",
            "note": "Great draft",
            "source": "inbox-ui",
        },
    )
    assert first.status_code == 200
    assert first.json()["feedback_positive"] == 1

    second = client.post(
        "/assistants/feedback",
        json={
            "draft_id": draft_id,
            "reviewer_user_id": "reviewer-2",
            "feedback": "down",
            "reason": "Tone mismatch",
        },
    )
    assert second.status_code == 200
    payload = second.json()
    assert payload["feedback_positive"] == 1
    assert payload["feedback_negative"] == 1
    assert len(payload["events"]) == 2

    history = client.get(f"/assistants/feedback/{draft_id}").json()
    assert history["feedback_positive"] == 1
    assert history["feedback_negative"] == 1
    assert history["events"][0]["feedback"] == "up"

    summary = client.get("/assistants/feedback/summary", params={"status": "all"}).json()
    assert summary["total_positive"] >= 1
    assert summary["total_negative"] >= 1


@pytest.mark.anyio("asyncio")
async def test_emit_event_includes_metrics(monkeypatch):
    result = await assistants.draft(assistants.DraftCreate(**build_payload()))
    draft_id = result["draft_id"]
    with assistants._session() as session:
        record = session.get(assistants.DraftModel, draft_id)

    captured: Dict[str, Any] = {}

    async def fake_broadcast(message: Dict[str, Any]) -> None:
        captured["message"] = message

    monkeypatch.setattr(assistants.manager, "broadcast", fake_broadcast)
    await assistants.emit_event("draft.updated", record)

    message = captured["message"]
    assert "metrics" in message
    assert "confidence_histogram" in message["metrics"]
    assert message["metrics"]["total"] >= 1
    assert message["type"] == "draft.updated"
    assert "draft" in message and message["draft"]["draft_id"] == draft_id
    assert "supported_events" in message and "draft.feedback" in message["supported_events"]
    assert isinstance(message.get("available_mock_scenarios"), list)
