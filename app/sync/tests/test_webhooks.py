from __future__ import annotations

import base64
import hmac
import json
import os
import unittest

from fastapi.testclient import TestClient

os.environ.setdefault("POSTGRES_URL", "sqlite+aiosqlite:///./test_sync.db")
os.environ.setdefault("SHOPIFY_WEBHOOK_SECRET", "shpss_test")

from app.sync.main import SHOPIFY_WEBHOOK_SECRET, app  # noqa: E402


class ShopifyWebhookSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        self._client_ctx = TestClient(app)
        self.client = self._client_ctx.__enter__()

    def tearDown(self) -> None:
        self._client_ctx.__exit__(None, None, None)

    def test_missing_hmac_header_returns_401(self) -> None:
        response = self.client.post("/shopify/webhook", json={"id": 1})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Missing Shopify HMAC header")

    def test_invalid_hmac_header_returns_401(self) -> None:
        response = self.client.post(
            "/shopify/webhook",
            json={"id": 1},
            headers={"X-Shopify-Hmac-Sha256": "bad-signature"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid Shopify HMAC signature")

    def test_valid_hmac_accepts_payload(self) -> None:
        payload = {"id": 99, "topic": "orders/create"}
        body = json.dumps(payload).encode()
        digest = hmac.new(SHOPIFY_WEBHOOK_SECRET.encode(), body, "sha256").digest()
        signature = base64.b64encode(digest).decode()

        response = self.client.post(
            "/shopify/webhook",
            data=body,
            headers={
                "X-Shopify-Hmac-Sha256": signature,
                "Content-Type": "application/json",
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["topic"], "orders/create")


if __name__ == "__main__":
    unittest.main()
