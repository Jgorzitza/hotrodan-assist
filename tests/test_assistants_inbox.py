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


def build_payload(**overrides):
    base = {
        "channel": "email",
        "conversation_id": "conv-1",
        "incoming_text": "Customer needs AN-8 pump sizing",
        "draft_text": "Thanks for reaching out!",
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


def test_draft_create_and_list_filters_pending_and_needs_review():
    client = TestClient(assistants.app)

    r1 = client.post("/assistants/draft", json=build_payload(conversation_id="conv-1"))
    assert r1.status_code == 200
    r2 = client.post("/assistants/draft", json=build_payload(conversation_id="conv-2", confidence=0.55))
    assert r2.status_code == 200

    assistants.DRAFTS["d2"]["status"] = "needs_review"
    assistants.DRAFTS["d2"]["sla_deadline"] = "1999-01-01T00:00:00Z"

    listing = client.get("/dashboard/inbox", params={"status": "pending,needs_review"})
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] == 2
    statuses = {item["status"] for item in body["items"]}
    assert statuses == {"pending", "needs_review"}
    assert listing.headers["X-Refresh-After"] == "30"


def test_stats_and_detail_include_learning_notes_and_escalation_fields():
    client = TestClient(assistants.app)
    client.post("/assistants/draft", json=build_payload(conversation_id="conv-1"))
    client.post("/assistants/draft", json=build_payload(conversation_id="conv-2", tags=["returns"]))

    client.post(
        "/assistants/edit",
        json={
            "draft_id": "d1",
            "editor_user_id": "user-1",
            "final_text": "Updated reply",
            "learning_notes": "Add pump table",
        },
    )
    client.post(
        "/assistants/approve",
        json={
            "draft_id": "d2",
            "approver_user_id": "user-2",
            "escalate_to_specialist": True,
            "escalation_reason": "Needs pricing override",
            "assign_to": "specialist-9",
        },
    )

    stats = client.get("/dashboard/inbox/stats").json()
    assert stats["sent"] == 1
    assert stats["escalated"] == 1
    assert stats["avg_confidence_pending"] is None

    detail = client.get("/dashboard/inbox/d2").json()["draft"]
    assert detail["escalation_reason"] == "Needs pricing override"
    assert detail["assigned_to"] == "specialist-9"
    assert detail["learning_notes"] == []

    detail_d1 = client.get("/dashboard/inbox/d1").json()["draft"]
    assert detail_d1["learning_notes"][0]["note"] == "Add pump table"


@pytest.mark.parametrize("status_param", ["", "pending", "pending,needs_review", "all"])
def test_status_param_validation(status_param):
    client = TestClient(assistants.app)
    client.post("/assistants/draft", json=build_payload())
    resp = client.get("/dashboard/inbox", params={"status": status_param})
    assert resp.status_code == 200


def test_invalid_channel_rejected_on_create():
    client = TestClient(assistants.app)
    payload = build_payload(channel="fax")
    resp = client.post("/assistants/draft", json=payload)
    assert resp.status_code == 422
