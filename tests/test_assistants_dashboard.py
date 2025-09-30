import unittest

try:
    from fastapi.testclient import TestClient
    from app.assistants.main import app
except ModuleNotFoundError:  # pragma: no cover - skip when deps missing
    TestClient = None
    app = None


class AssistantsDashboardEndpointTests(unittest.TestCase):
    def setUp(self):
        if TestClient is None or app is None:
            self.skipTest("fastapi not installed in environment")
        self.client = TestClient(app)

    def test_home_endpoint(self):
        payload = {
            "inbox": {"awaiting_review": 1, "threads": []},
            "system_health": {"error_rate_pct": 10},
            "learning": {"goldens_regressions": [{"id": "g1"}]},
        }
        resp = self.client.post("/assistants/dashboard/home", json={"payload": payload})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["escalate"])  # golden regression triggers
        self.assertIn("Flag for deep dive", data["markdown"])

    def test_sales_endpoint(self):
        payload = {
            "revenue": {"net": 5000, "previous_period_delta_pct": -30},
            "assistant_pipeline": {
                "open_opportunities": [
                    {"conversation_id": "c1", "stage": "waiting_payment", "estimated_value": 1000, "last_message": "2024-07-01T00:00:00Z"}
                ]
            },
            "inventory_watch": [],
        }
        resp = self.client.post("/assistants/dashboard/sales", json={"payload": payload})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["escalate"])
        self.assertIn("Escalate for deeper analysis", data["markdown"])


if __name__ == "__main__":
    unittest.main()
