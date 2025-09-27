from __future__ import annotations

import json
import unittest

from fastapi.testclient import TestClient

from app.sync.main import app


class OrdersEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self._client_ctx = TestClient(app)
        self.client = self._client_ctx.__enter__()

    def tearDown(self) -> None:
        self._client_ctx.__exit__(None, None, None)

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


if __name__ == "__main__":
    unittest.main()
