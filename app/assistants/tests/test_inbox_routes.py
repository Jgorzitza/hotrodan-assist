import pytest
from fastapi.testclient import TestClient

import app.assistants.main as assistants


@pytest.fixture(autouse=True)
def reset_state():
    assistants.DRAFTS.clear()
    assistants.COUNTER = 0
    yield
    assistants.DRAFTS.clear()
    assistants.COUNTER = 0


def make_client():
    return TestClient(assistants.app)


def base_payload(**overrides):
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
    resp = client.post("/assistants/draft", json=base_payload())
    assert resp.status_code == 200
    did = resp.json()["draft_id"]
    assert did == "d1"
    draft = assistants.DRAFTS[did]
    assert draft["status"] == "pending"
    assert draft["incoming_excerpt"].startswith("Need AN-8")
    assert draft["confidence"] == 0.78


def test_invalid_status_filter_returns_400():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())
    resp = client.get("/dashboard/inbox", params={"status": "unknown"})
    assert resp.status_code == 400
    assert "Unsupported status" in resp.json()["detail"]


def test_inbox_stats_counts_and_overdue():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())
    client.post(
        "/assistants/draft",
        json=base_payload(conversation_id="conv-2", confidence=0.51, sla_deadline="1999-01-01T00:00:00Z"),
    )
    assistants.DRAFTS["d2"]["status"] = "needs_review"

    stats = client.get("/dashboard/inbox/stats").json()
    assert stats["pending"] == 1
    assert stats["needs_review"] == 1
    assert stats["overdue"] == 1


def test_approve_flow_sends_and_updates_audit():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())
    resp = client.post(
        "/assistants/approve",
        json={
            "draft_id": "d1",
            "approver_user_id": "user-123",
            "send_copy_to_customer": True,
        },
    )
    assert resp.status_code == 200
    record = assistants.DRAFTS["d1"]
    assert record["status"] == "sent"
    assert record["audit_log"][-1]["action"] == "draft.approved"


def test_edit_flow_attaches_learning_notes():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())
    resp = client.post(
        "/assistants/edit",
        json={
            "draft_id": "d1",
            "editor_user_id": "user-321",
            "final_text": "Final answer",
            "learning_notes": "Update pump table",
        },
    )
    assert resp.status_code == 200
    draft = assistants.DRAFTS["d1"]
    assert draft["status"] == "sent"
    note = draft["learning_notes"][0]
    assert note["note"] == "Update pump table"


def test_escalate_endpoint_sets_assignment():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())
    resp = client.post(
        "/assistants/escalate",
        json={
            "draft_id": "d1",
            "requester_user_id": "user-77",
            "reason": "Needs dyno data",
            "assigned_to": "specialist-3",
        },
    )
    assert resp.status_code == 200
    draft = assistants.DRAFTS["d1"]
    assert draft["status"] == "escalated"
    assert draft["assigned_to"] == "specialist-3"
    assert draft["audit_log"][-1]["action"] == "draft.escalated"


def test_notes_endpoint_appends_and_emits():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())
    resp = client.post(
        "/assistants/notes",
        json={
            "draft_id": "d1",
            "author_user_id": "user-7",
            "text": "Confirm fittings availability",
        },
    )
    assert resp.status_code == 200
    draft = assistants.DRAFTS["d1"]
    assert draft["notes"][0]["text"] == "Confirm fittings availability"


def test_inbox_detail_contains_sources_and_notes():
    client = make_client()
    client.post(
        "/assistants/draft",
        json=base_payload(
            source_snippets=[{"title": "Guide", "url": "https://example.com", "relevance_score": 0.87}],
            conversation_summary=["Customer asked about AN-8"],
        ),
    )
    detail = client.get("/dashboard/inbox/d1").json()["draft"]
    assert detail["source_snippets"][0]["title"] == "Guide"
    assert detail["conversation_summary"][0] == "Customer asked about AN-8"


def test_status_all_returns_everything():
    client = make_client()
    client.post("/assistants/draft", json=base_payload())
    client.post(
        "/assistants/draft",
        json=base_payload(conversation_id="conv-2", channel="chat"),
    )
    assistants.DRAFTS["d1"]["status"] = "sent"
    assistants.DRAFTS["d2"]["status"] = "escalated"

    resp = client.get("/dashboard/inbox", params={"status": "all"})
    assert resp.status_code == 200
    statuses = {item["status"] for item in resp.json()["items"]}
    assert statuses == {"sent", "escalated"}
