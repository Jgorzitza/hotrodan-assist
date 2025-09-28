from __future__ import annotations

import asyncio
import json
import unittest
from datetime import datetime
from typing import Any, Dict
import os

os.environ.setdefault("POSTGRES_URL", "sqlite+aiosqlite:///./test_sync.db")
os.environ.setdefault("SHOPIFY_WEBHOOK_SECRET", "shpss_test")

try:  # Guard test import so suite can skip gracefully when FastAPI is unavailable
    from fastapi.testclient import TestClient
    from sqlalchemy import delete

    from app.sync.main import SESSION, ShopifyOrder, app
except ModuleNotFoundError as exc:  # pragma: no cover - only triggered in constrained envs
    TestClient = None  # type: ignore[assignment]
    SESSION = None  # type: ignore[assignment]
    ShopifyOrder = None  # type: ignore[assignment]
    app = None  # type: ignore[assignment]
    delete = None  # type: ignore[assignment]
    _IMPORT_ERROR = exc
else:
    from sqlalchemy import delete

    _IMPORT_ERROR = None


def _utcnow() -> datetime:
    return datetime.utcnow()


async def _seed_order(order_id: str, raw: Dict[str, Any] | None = None) -> None:
    if SESSION is None or ShopifyOrder is None:
        return
    async with SESSION() as session:  # type: ignore[misc]
        order = ShopifyOrder(  # type: ignore[call-arg]
            id=order_id,
            name=f"#{order_id}",
            raw=raw or {},
            order_created_at=_utcnow(),
        )
        session.add(order)
        await session.commit()


async def _load_order(order_id: str) -> ShopifyOrder | None:
    if SESSION is None or ShopifyOrder is None:
        return None
    async with SESSION() as session:  # type: ignore[misc]
        return await session.get(ShopifyOrder, order_id)


async def _reset_orders() -> None:
    if SESSION is None or ShopifyOrder is None:
        return
    async with SESSION() as session:  # type: ignore[misc]
        await session.execute(delete(ShopifyOrder))
        await session.commit()


class OrdersEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        if _IMPORT_ERROR is not None:
            self.skipTest(f"FastAPI dependencies not available: {_IMPORT_ERROR}")
        self._client_ctx = TestClient(app)  # type: ignore[arg-type]
        self.client = self._client_ctx.__enter__()

    def tearDown(self) -> None:
        self._client_ctx.__exit__(None, None, None)
        if _IMPORT_ERROR is None:
            asyncio.run(_reset_orders())

    def test_orders_response_contains_contract_fields(self) -> None:
        response = self.client.get("/sync/orders", params={"pageSize": 5})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertIn("period", payload)
        self.assertIn("metrics", payload)
        self.assertIn("orders", payload)
        self.assertIn("shipments", payload)
        self.assertIn("returns", payload)
        self.assertIn("inventory_blocks", payload)

        page_info = payload["orders"]["page_info"]
        self.assertIn("nextCursor", page_info)
        self.assertIn("shopifyCursor", page_info)

    def test_orders_alerts_json(self) -> None:
        response = self.client.get("/sync/orders/alerts")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("alerts", payload)
        self.assertGreaterEqual(len(payload["alerts"]), 1)

    def test_orders_alerts_sse(self) -> None:
        with self.client.stream(
            "GET",
            "/sync/orders/alerts",
            headers={"accept": "text/event-stream"},
        ) as response:
            self.assertEqual(response.status_code, 200)
            chunks = list(response.iter_text())

        collected = "".join(chunks)
        self.assertIn("data:", collected)
        self.assertIn("\n\n", collected)

    def test_assign_endpoint_updates_assignee(self) -> None:
        asyncio.run(_seed_order("1001"))

        response = self.client.post(
            "/sync/orders/assign",
            json={"orderIds": ["gid://shopify/Order/1001"], "assignee": "ops"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertIn("updatedOrders", payload)
        self.assertEqual(
            payload["updatedOrders"],
            [{"id": "gid://shopify/Order/1001", "assignedTo": "ops"}],
        )

        stored = asyncio.run(_load_order("1001"))
        self.assertIsNotNone(stored)
        raw = stored.raw or {}
        self.assertEqual(raw.get("assigned_to"), "ops")
        note_attrs = raw.get("note_attributes") or []
        self.assertTrue(
            any(
                (attr.get("name") or attr.get("key")) == "orders_control_tower.assignee"
                and attr.get("value") == "ops"
                for attr in note_attrs
            )
        )

    def test_fulfill_endpoint_marks_orders(self) -> None:
        asyncio.run(_seed_order("2002"))

        response = self.client.post(
            "/sync/orders/fulfill",
            json={
                "orderIds": ["gid://shopify/Order/2002"],
                "tracking": {"number": "1Z999", "carrier": "UPS"},
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["updatedOrders"],
            [
                {
                    "id": "gid://shopify/Order/2002",
                    "fulfillmentStatus": "fulfilled",
                    "tracking": {"number": "1Z999", "carrier": "UPS"},
                }
            ],
        )

        stored = asyncio.run(_load_order("2002"))
        self.assertIsNotNone(stored)
        self.assertEqual(stored.fulfillment_status, "fulfilled")
        raw = stored.raw or {}
        self.assertEqual(raw.get("fulfillment_status"), "fulfilled")
        self.assertEqual(raw.get("latest_tracking"), {"number": "1Z999", "carrier": "UPS"})

    def test_support_endpoint_records_thread(self) -> None:
        asyncio.run(_seed_order("3003"))

        response = self.client.post(
            "/sync/orders/support",
            json={
                "orderId": "gid://shopify/Order/3003",
                "conversationId": "conv-1",
                "note": "escalate",
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["updatedOrders"],
            [{"id": "gid://shopify/Order/3003", "supportThread": "conv-1"}],
        )

        stored = asyncio.run(_load_order("3003"))
        self.assertIsNotNone(stored)
        raw = stored.raw or {}
        self.assertEqual(raw.get("support_thread"), "conv-1")
        notes = raw.get("support_notes") or []
        self.assertTrue(any(note.get("note") == "escalate" for note in notes))

    def test_returns_endpoint_logs_action(self) -> None:
        asyncio.run(_seed_order("4004"))

        response = self.client.post(
            "/sync/orders/returns",
            json={
                "orderId": "gid://shopify/Order/4004",
                "action": "approve_refund",
                "note": "issue credit",
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["message"], "Return updated (approve_refund) for gid://shopify/Order/4004.")
        self.assertEqual(payload["updatedOrders"], [])

        stored = asyncio.run(_load_order("4004"))
        self.assertIsNotNone(stored)
        raw = stored.raw or {}
        returns_log = raw.get("returns") or []
        self.assertTrue(any(entry.get("action") == "approve_refund" for entry in returns_log))


if __name__ == "__main__":
    unittest.main()
