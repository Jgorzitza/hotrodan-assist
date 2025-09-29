from __future__ import annotations

import base64
import hmac
import json
import os
import unittest

try:  # Guarded import for environments without FastAPI
    from fastapi.testclient import TestClient

    os.environ.setdefault("POSTGRES_URL", "sqlite+aiosqlite:///./test_sync.db")
    os.environ.setdefault("SHOPIFY_WEBHOOK_SECRET", "shpss_test")

    import app.sync.main as sync_main  # noqa: E402

    sync_main.SHOPIFY_WEBHOOK_SECRET = os.getenv("SHOPIFY_WEBHOOK_SECRET", "")
    SHOPIFY_WEBHOOK_SECRET = sync_main.SHOPIFY_WEBHOOK_SECRET
    app = sync_main.app
except (
    ModuleNotFoundError
) as exc:  # pragma: no cover - only triggered in constrained envs
    TestClient = None  # type: ignore[assignment]
    SHOPIFY_WEBHOOK_SECRET = ""  # type: ignore[assignment]
    app = None  # type: ignore[assignment]
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None


class ShopifyWebhookSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        if _IMPORT_ERROR is not None:
            self.skipTest(f"FastAPI dependencies not available: {_IMPORT_ERROR}")
        self._client_ctx = TestClient(app)  # type: ignore[arg-type]
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
