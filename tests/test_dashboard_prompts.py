import unittest

from app.dashboard.prompt_renderer import render_dashboard_home, render_dashboard_sales


class DashboardPromptTests(unittest.TestCase):
    def test_home_renderer_basic(self):
        payload = {
            "inbox": {
                "awaiting_review": 2,
                "awaiting_review_sla_minutes": 30,
                "threads": [
                    {"conversation_id": "c1", "channel": "email", "subject": "Help", "sla_breach": True, "draft_status": "proposed", "next_action_owner": "human"}
                ],
            },
            "learning": {},
            "system_health": {},
        }
        result = render_dashboard_home(payload)
        self.assertIn("markdown", result)
        self.assertIn("Next best action", result["markdown"])
        self.assertFalse(result["escalate"])

    def test_sales_renderer_escalation(self):
        payload = {
            "revenue": {"gross": 10000, "previous_period_delta_pct": -30},
            "assistant_pipeline": {
                "open_opportunities": [
                    {"conversation_id": "p1", "stage": "waiting_payment", "estimated_value": 1000, "last_message": "2024-07-01T00:00:00Z"}
                ]
            },
            "inventory_watch": [
                {"sku": "s1", "name": "Widget", "status": "critical", "days_of_cover": 1},
                {"sku": "s2", "name": "Widget2", "status": "critical", "days_of_cover": 2},
                {"sku": "s3", "name": "Widget3", "status": "critical", "days_of_cover": 3},
            ],
        }
        result = render_dashboard_sales(payload)
        self.assertTrue(result["escalate"])
        self.assertIn("Escalate for deeper analysis", result["markdown"])

    def test_home_renderer_missing_sections(self):
        result = render_dashboard_home({})
        md = result["markdown"]
        self.assertIn("Inbox volume data unavailable.", md)
        self.assertIn("System health data unavailable.", md)
        self.assertIn("Action queue data unavailable.", md)
        self.assertIn("Edit telemetry unavailable.", md)


if __name__ == "__main__":
    unittest.main()
