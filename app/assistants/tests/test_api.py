from __future__ import annotations

import asyncio
import json
from typing import Dict, List

import httpx
import pytest

from app.assistants.main import (
    DEFAULT_REFRESH_SECONDS,
    events,
    registry,
    reset_state_for_tests,
    app,
)


pytestmark = pytest.mark.anyio("asyncio")


@pytest.fixture()
async def client() -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        registry.clear()
        reset_state_for_tests()
        yield http_client
        reset_state_for_tests()
        registry.clear()


@pytest.fixture()
def anyio_backend() -> str:
    return "asyncio"


def _draft_payload(**overrides: Dict[str, object]) -> Dict[str, object]:
    payload: Dict[str, object] = {
        "channel": "email",
        "conversation_id": "conv-1",
        "incoming_text": "Hello, do you have this in stock?",
        "draft_text": "Thanks for reaching out!",
        "customer_display": "Casey Customer",
        "tags": ["vip"],
        "source_snippets": [
            {"title": "FAQ", "url": "https://example.com/faq", "relevance_score": 0.9}
        ],
    }
    payload.update(overrides)
    return payload


async def test_list_drafts_returns_expected_shape(client: httpx.AsyncClient) -> None:
    first = await client.post("/assistants/draft", json=_draft_payload())
    assert first.status_code == 200
    first_id = first.json()["draft_id"]

    second = await client.post(
        "/assistants/draft",
        json=_draft_payload(
            conversation_id="conv-2",
            incoming_text="Need help with exchange",
            draft_text="Happy to help with your exchange.",
            channel="chat",
        ),
    )
    assert second.status_code == 200

    response = await client.get("/assistants/drafts")
    assert response.status_code == 200
    payload = response.json()

    assert payload["refresh_after_seconds"] == DEFAULT_REFRESH_SECONDS
    assert payload["next_cursor"] is None
    assert payload["total"] == 2

    drafts: List[Dict[str, object]] = payload["drafts"]
    assert {draft["id"] for draft in drafts} == {first_id, second.json()["draft_id"]}
    email_draft = next(d for d in drafts if d["channel"] == "email")
    assert email_draft["status"] == "pending"
    assert email_draft["incoming_excerpt"] == "Hello, do you have this in stock?"


async def test_list_drafts_supports_pagination(client: httpx.AsyncClient) -> None:
    for index in range(3):
        response = await client.post(
            "/assistants/draft",
            json=_draft_payload(
                conversation_id=f"conv-{index}",
                incoming_text=f"Customer message {index}",
                draft_text=f"Draft reply {index}",
            ),
        )
        assert response.status_code == 200

    first_page = await client.get("/assistants/drafts", params={"limit": 2})
    assert first_page.status_code == 200
    payload = first_page.json()
    assert payload["total"] == 3
    assert payload["next_cursor"] == "2"
    assert len(payload["drafts"]) == 2

    second_page = await client.get("/assistants/drafts", params={"limit": 2, "cursor": 2})
    assert second_page.status_code == 200
    payload2 = second_page.json()
    assert payload2["total"] == 3
    assert payload2["next_cursor"] is None
    assert len(payload2["drafts"]) == 1


async def test_get_draft_detail_includes_sources(client: httpx.AsyncClient) -> None:
    create = await client.post(
        "/assistants/draft",
        json=_draft_payload(
            draft_text="We have it available in blue and green.",
            source_snippets=[
                {"title": "Inventory", "url": "https://example.com/inventory", "relevance_score": 0.95}
            ],
        ),
    )
    assert create.status_code == 200
    draft_id = create.json()["draft_id"]

    response = await client.get(f"/assistants/drafts/{draft_id}")
    assert response.status_code == 200
    draft = response.json()

    assert draft["draft_id"] == draft_id
    assert draft["suggested_text"] == "We have it available in blue and green."
    assert draft["sources"] == ["https://example.com/inventory"]
    assert draft["source_snippets"][0]["title"] == "Inventory"


async def test_get_draft_detail_404(client: httpx.AsyncClient) -> None:
    response = await client.get("/assistants/drafts/not-real")
    assert response.status_code == 404
    assert response.json()["detail"] == "Draft not found"


async def test_events_stream_emits_handshake_first(client: httpx.AsyncClient) -> None:
    async with client.stream("GET", "/assistants/events") as response:
        assert response.status_code == 200
        data_line: str | None = None

        async for line in response.aiter_lines():
            if not line:
                continue
            if line.startswith("data:" ):
                data_line = line
                break

        assert data_line is not None, "SSE stream did not emit any data lines"

        payload = json.loads(data_line.partition("data: ")[2])
        assert payload["type"] == "handshake"
        assert payload["service"] == "assistants"
        assert payload["capabilities"], "Handshake should advertise capabilities"


async def test_approve_dispatches_via_adapter(client: httpx.AsyncClient) -> None:
    sent_payloads: List[Dict[str, object]] = []

    def _capture(payload: Dict[str, object]) -> str:
        sent_payloads.append(payload)
        return "external-123"

    registry.register("email", _capture)

    create = await client.post("/assistants/draft", json=_draft_payload())
    draft_id = create.json()["draft_id"]

    approve = await client.post(
        "/assistants/approve",
        json={"draft_id": draft_id, "approver_user_id": "operator-1"},
    )
    assert approve.status_code == 200
    assert approve.json()["sent_msg_id"] == "external-123"

    assert sent_payloads and sent_payloads[0]["draft_id"] == draft_id

    detail = await client.get(f"/assistants/drafts/{draft_id}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "sent"


async def test_edit_supports_async_adapter(client: httpx.AsyncClient) -> None:
    sent_payloads: List[Dict[str, object]] = []

    async def _capture(payload: Dict[str, object]) -> str:
        sent_payloads.append(payload)
        return "external-async-456"

    registry.register("chat", _capture)

    create = await client.post(
        "/assistants/draft",
        json=_draft_payload(
            channel="chat",
            conversation_id="conv-async",
            incoming_text="Need to change size",
            draft_text="We can help with that!",
        ),
    )
    draft_id = create.json()["draft_id"]

    edit = await client.post(
        "/assistants/edit",
        json={
            "draft_id": draft_id,
            "editor_user_id": "operator-async",
            "final_text": "Updated draft text for async adapter.",
        },
    )
    assert edit.status_code == 200
    assert edit.json()["sent_msg_id"] == "external-async-456"

    assert sent_payloads and sent_payloads[0]["draft_id"] == draft_id

    detail = await client.get(f"/assistants/drafts/{draft_id}")
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["status"] == "sent"
    assert payload["draft_text"] == "Updated draft text for async adapter."


async def test_approve_records_send_copy_flag(client: httpx.AsyncClient) -> None:
    registry.register("email", lambda payload: None)

    create = await client.post("/assistants/draft", json=_draft_payload())
    draft_id = create.json()["draft_id"]

    response = await client.post(
        "/assistants/approve",
        json={
            "draft_id": draft_id,
            "approver_user_id": "approver-1",
            "send_copy_to_customer": True,
        },
    )
    assert response.status_code == 200

    detail = await client.get(f"/assistants/drafts/{draft_id}")
    assert detail.status_code == 200
    payload = detail.json()

    assert payload["status"] == "sent"
    assert payload["usd_sent_copy"] is True


async def test_edit_records_learning_notes_and_send_copy(client: httpx.AsyncClient) -> None:
    registry.register("email", lambda payload: None)

    create = await client.post("/assistants/draft", json=_draft_payload())
    draft_id = create.json()["draft_id"]

    edit = await client.post(
        "/assistants/edit",
        json={
            "draft_id": draft_id,
            "editor_user_id": "editor-1",
            "final_text": "Edited response",
            "learning_notes": "Customer prefers SMS",
            "send_copy_to_customer": True,
        },
    )
    assert edit.status_code == 200

    detail = await client.get(f"/assistants/drafts/{draft_id}")
    assert detail.status_code == 200
    payload = detail.json()

    assert payload["status"] == "sent"
    assert payload["draft_text"] == "Edited response"
    assert payload["usd_sent_copy"] is True
    assert payload["learning_notes"]
    assert payload["learning_notes"][0]["note"] == "Customer prefers SMS"


async def test_draft_persists_extra_metadata_and_customer_fallback(
    client: httpx.AsyncClient,
) -> None:
    payload = _draft_payload()
    payload.pop("customer_display", None)
    payload["metadata"] = {"source": "zoho"}
    payload["context"] = {"handoff": "sync"}
    payload["customer_email"] = "casey@example.com"
    payload["assigned_to"] = "Operator B"

    create = await client.post("/assistants/draft", json=payload)
    assert create.status_code == 200
    draft_id = create.json()["draft_id"]

    detail = await client.get(f"/assistants/drafts/{draft_id}")
    assert detail.status_code == 200
    body = detail.json()

    assert body["metadata"]["source"] == "zoho"
    assert body["metadata"]["context"] == {"handoff": "sync"}
    assert body["metadata"]["customer_email"] == "casey@example.com"
    assert body["customer_display"] == "casey@example.com"
    assert body["assigned_to"] == "Operator B"



async def test_list_drafts_filters_by_assigned(client: httpx.AsyncClient) -> None:
    await client.post(
        "/assistants/draft",
        json=_draft_payload(
            conversation_id="conv-unassigned",
            draft_text="Unassigned draft",
        ),
    )
    await client.post(
        "/assistants/draft",
        json=_draft_payload(
            conversation_id="conv-operator-a",
            draft_text="Assigned to Operator A",
            assigned_to="Operator A",
        ),
    )
    await client.post(
        "/assistants/draft",
        json=_draft_payload(
            conversation_id="conv-operator-b",
            draft_text="Assigned to Operator B",
            assigned_to="Operator B",
        ),
    )

    by_operator = await client.get(
        "/assistants/drafts",
        params={"assigned": "Operator A"},
    )
    assert by_operator.status_code == 200
    payload = by_operator.json()
    assert payload["total"] == 1
    drafts = payload["drafts"]
    assert len(drafts) == 1
    assert drafts[0]["conversation_id"] == "conv-operator-a"
    assert drafts[0]["assigned_to"] == "Operator A"

    unassigned = await client.get(
        "/assistants/drafts",
        params={"assigned": "unassigned"},
    )
    assert unassigned.status_code == 200
    unassigned_payload = unassigned.json()
    unassigned_drafts = unassigned_payload["drafts"]
    assert len(unassigned_drafts) == 1
    assert unassigned_drafts[0]["conversation_id"] == "conv-unassigned"
    assert unassigned_drafts[0]["assigned_to"] is None


async def test_draft_creation_emits_event_payload(client: httpx.AsyncClient) -> None:
    queue = await events.subscribe()
    try:
        create = await client.post("/assistants/draft", json=_draft_payload())
        assert create.status_code == 200
        raw = await asyncio.wait_for(queue.get(), timeout=2)
    finally:
        await events.unsubscribe(queue)

    payload = json.loads(raw)
    assert payload["event"]["type"] == "draft:updated"
    assert payload["ticket"]["aiDraft"]["content"].startswith("Thanks for reaching out")


async def test_approve_emits_event_with_adapter_payload(client: httpx.AsyncClient) -> None:
    create = await client.post("/assistants/draft", json=_draft_payload())
    draft_id = create.json()["draft_id"]

    registry.register("email", lambda payload: "external-evt-123")

    queue = await events.subscribe()
    try:
        approve = await client.post(
            "/assistants/approve",
            json={"draft_id": draft_id, "approver_user_id": "approver"},
        )
        assert approve.status_code == 200
        raw = await asyncio.wait_for(queue.get(), timeout=2)
    finally:
        await events.unsubscribe(queue)

    payload = json.loads(raw)
    assert payload["event"]["type"] == "draft:approved"
    assert payload["ticket"]["status"] == "resolved"
    assert payload["draft"]["approved"] is True


async def test_feedback_note_emits_feedback_event(client: httpx.AsyncClient) -> None:
    create = await client.post("/assistants/draft", json=_draft_payload())
    draft_id = create.json()["draft_id"]

    feedback_body = json.dumps({"type": "feedback", "vote": "up", "comment": "Great draft"})

    queue = await events.subscribe()
    try:
        response = await client.post(
            "/assistants/notes",
            json={"draft_id": draft_id, "author_user_id": "agent", "text": feedback_body},
        )
        assert response.status_code == 200
        raw = await asyncio.wait_for(queue.get(), timeout=2)
    finally:
        await events.unsubscribe(queue)

    payload = json.loads(raw)
    assert payload["event"]["type"] == "draft:feedback"
    assert payload["feedback"]["vote"] == "up"
    assert payload["feedback"]["comment"] == "Great draft"
