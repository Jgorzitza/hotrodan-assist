from __future__ import annotations

from typing import Dict, List

import httpx
import pytest

from app.assistants.main import (
    DEFAULT_REFRESH_SECONDS,
    registry,
    reset_state_for_tests,
    app,
)


pytestmark = pytest.mark.anyio("asyncio")


@pytest.fixture()
async def client() -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        reset_state_for_tests()
        yield http_client
        reset_state_for_tests()


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
