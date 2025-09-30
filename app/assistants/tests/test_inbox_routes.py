import json
import os
import pathlib
from typing import Dict

os.environ["ASSISTANTS_DB_URL"] = "sqlite:///./test_assistants_routes.db"

import pytest
from fastapi.testclient import TestClient

import app.assistants.main as assistants


@pytest.fixture(autouse=True)
def reset_state():
    assistants.reset_state_for_tests()
    yield
    assistants.reset_state_for_tests()


def make_client() -> TestClient:
    return TestClient(assistants.app)


def base_payload(**overrides: Dict) -> Dict:
    payload = {
        "channel": "email",
        "conversation_id": "conv-1",
        "incoming_text": "Need AN-8 pump sizing guidance",
        "draft_text": "Here is the pump sizing guidance",
        "customer_display": "Alex P.",
        "subject": "AN-8 sizing",
        "confidence": 0.78,
        "llm_model": "gpt-4o-mini",
        "estimated_tokens_in": 620,
        "estimated_tokens_out": 310,
        "usd_cost": 0.012,
        "sla_deadline": "2099-01-01T00:30:00Z",
        "tags": ["inventory"],
    }
    payload.update(overrides)
    return payload


def test_draft_create_generates_expected_fields():
    client = make_client()
    draft_id = client.post("/assistants/draft", json=base_payload()).json()["draft_id"]
    detail = client.get(f"/dashboard/inbox/{draft_id}").json()["draft"]
    assert detail["status"] == "pending"
    assert detail["incoming_excerpt"].startswith("Need AN-8")
    assert detail["confidence"] == 0.78


def test_invalid_status_filter_returns_400():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())
    resp = client.get("/dashboard/inbox", params={"status": "unknown"})
    assert resp.status_code == 400


def test_inbox_stats_counts_and_overdue():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())
    client.post(
        "/assistants/draft",
        json=base_payload(conversation_id="conv-2", confidence=0.51, sla_deadline="1999-01-01T00:00:00Z"),
    )
    stats = client.get("/dashboard/inbox/stats").json()
    assert stats["pending"] == 2
    assert stats["overdue"] == 1
    assert stats["total"] == 2
    assert "confidence_histogram" in stats


def test_approve_flow_sends_and_updates_audit():
    client = make_client()
    draft_id = client.post("/assistants/draft", json=base_payload()).json()["draft_id"]
    resp = client.post(
        "/assistants/approve",
        json={
            "draft_id": draft_id,
            "approver_user_id": "user-123",
            "send_copy_to_customer": True,
        },
    )
    assert resp.status_code == 200
    detail = client.get(f"/dashboard/inbox/{draft_id}").json()["draft"]
    assert detail["status"] == "sent"
    assert detail["audit_log"][-1]["action"] == "draft.approved"


def test_edit_flow_attaches_learning_notes():
    client = make_client()
    draft_id = client.post("/assistants/draft", json=base_payload()).json()["draft_id"]
    resp = client.post(
        "/assistants/edit",
        json={
            "draft_id": draft_id,
            "editor_user_id": "user-321",
            "final_text": "Final answer",
            "learning_notes": "Update pump table",
        },
    )
    assert resp.status_code == 200
    detail = client.get(f"/dashboard/inbox/{draft_id}").json()["draft"]
    assert detail["learning_notes"][0]["note"] == "Update pump table"


def test_escalate_endpoint_sets_assignment():
    client = make_client()
    draft_id = client.post("/assistants/draft", json=base_payload()).json()["draft_id"]
    resp = client.post(
        "/assistants/escalate",
        json={
            "draft_id": draft_id,
            "requester_user_id": "user-77",
            "reason": "Needs dyno data",
            "assigned_to": "specialist-3",
        },
    )
    assert resp.status_code == 200
    detail = client.get(f"/dashboard/inbox/{draft_id}").json()["draft"]
    assert detail["status"] == "escalated"
    assert detail["assigned_to"] == "specialist-3"


def test_notes_endpoint_appends_and_emits():
    client = make_client()
    draft_id = client.post("/assistants/draft", json=base_payload()).json()["draft_id"]
    resp = client.post(
        "/assistants/notes",
        json={"draft_id": draft_id, "author_user_id": "user-7", "text": "Confirm fittings availability"},
    )
    assert resp.status_code == 200
    detail = client.get(f"/dashboard/inbox/{draft_id}").json()["draft"]
    assert detail["notes"][0]["text"] == "Confirm fittings availability"


def test_inbox_detail_contains_sources_and_notes():
    client = make_client()
    draft_id = client.post(
        "/assistants/draft",
        json=base_payload(
            source_snippets=[{"title": "Guide", "url": "https://example.com", "relevance_score": 0.87}],
            conversation_summary=["Customer asked about AN-8"],
        ),
    ).json()["draft_id"]
    detail = client.get(f"/dashboard/inbox/{draft_id}").json()["draft"]
    assert detail["source_snippets"][0]["title"] == "Guide"
    assert detail["conversation_summary"][0] == "Customer asked about AN-8"


def test_status_all_returns_everything():
    client = make_client()
    draft_one = client.post("/assistants/draft", json=base_payload()).json()["draft_id"]
    draft_two = client.post(
        "/assistants/draft",
        json=base_payload(conversation_id="conv-2", channel="chat"),
    ).json()["draft_id"]
    client.post("/assistants/approve", json={"draft_id": draft_one, "approver_user_id": "user"})
    client.post(
        "/assistants/escalate",
        json={"draft_id": draft_two, "requester_user_id": "user", "reason": "Needs follow-up"},
    )

    resp = client.get("/dashboard/inbox", params={"status": "all"})
    statuses = {item["status"] for item in resp.json()["items"]}
    assert statuses == {"sent", "escalated"}


def test_websocket_handshake_and_ping():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())

    with client.websocket_connect("/ws/inbox") as websocket:
        handshake = websocket.receive_json()
        assert handshake["type"] == "inbox.handshake"
        assert handshake["metrics"]["total"] >= 1
        assert "draft.feedback" in handshake["supported_events"]
        assert "email" in handshake["delivery_channels"]

        websocket.send_json({"type": "ping"})
        heartbeat = websocket.receive_json()
        assert heartbeat["type"] == "inbox.heartbeat"


def test_sse_stream_emits_handshake_and_feedback_event():
    client = make_client()
    draft_id = client.post("/assistants/draft", json=base_payload()).json()["draft_id"]

    def next_event(line_iterator):
        event_name = "message"
        data_line = None
        for raw_line in line_iterator:
            line = raw_line.decode() if isinstance(raw_line, bytes) else raw_line
            if line == "":
                if data_line is not None:
                    return event_name, json.loads(data_line)
                continue
            if line.startswith("event:"):
                event_name = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                data_line = line.split(":", 1)[1].strip()
        raise AssertionError("Stream closed before event was received")

    with client.stream("GET", "/events/inbox") as stream:
        iterator = stream.iter_lines()
        event_name, payload = next_event(iterator)
        assert event_name == "handshake"
        assert payload["type"] == "inbox.handshake"
        assert "delivery_channels" in payload

        client.post(
            "/assistants/feedback",
            json={
                "draft_id": draft_id,
                "reviewer_user_id": "reviewer-1",
                "feedback": "up",
                "note": "Great draft",
            },
        )

        event_name, payload = next_event(iterator)
        if event_name == "heartbeat":
            event_name, payload = next_event(iterator)
        assert event_name == "message"
        assert payload["type"] == "draft.feedback"
        assert payload["feedback"]["total_events"] >= 1
        assert payload["feedback"]["latest"]["feedback"] == "up"
