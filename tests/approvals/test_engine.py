"""Unit tests for the approvals workflow engine."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from app.approval_app.engine import WorkflowEngine


class WorkflowEngineTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test-approvals.db"
        self.rules_path = Path(self.temp_dir.name) / "auto-rules.json"
        self._write_rules()
        self.engine = WorkflowEngine(db_path=self.db_path, auto_rules_path=self.rules_path)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def _write_rules(self) -> None:
        rules = {
            "auto_approval_rules": {
                "by_agent_trust_level": {
                    "high": {
                        "enabled": True,
                        "agents": ["program_manager"],
                    }
                },
                "by_action_type": {
                    "query": {"enabled": True}
                },
                "by_risk_score": {
                    "auto_approve_below": 0.3
                },
            }
        }
        self.rules_path.write_text(json.dumps(rules), encoding="utf-8")

    def _sample_workflow(self) -> dict:
        return {
            "id": "wf-support",
            "name": "Support Escalation",
            "version": "1.0",
            "description": "Test workflow",
            "created_by": "qa_bot",
            "stages": [
                {
                    "id": "stage-intake",
                    "name": "Intake",
                    "type": "sequential",
                    "position": 0,
                    "auto_rules": {"action_type": "query"},
                    "sla": {"duration": "1h"},
                }
            ],
        }

    def test_create_and_fetch_workflow(self) -> None:
        workflow_definition = self._sample_workflow()
        create_result = self.engine.create_workflow(workflow_definition)
        self.assertEqual(create_result["workflow_id"], workflow_definition["id"])

        workflows = self.engine.list_workflows()
        self.assertEqual(len(workflows), 1)
        self.assertEqual(workflows[0]["id"], workflow_definition["id"])

        fetched = self.engine.get_workflow(workflow_definition["id"])
        self.assertEqual(fetched["workflow"]["name"], "Support Escalation")

    def test_submit_auto_approved_approval(self) -> None:
        self.engine.create_workflow(self._sample_workflow())

        submission = self.engine.submit_approval(
            workflow_id="wf-support",
            target_entity="ticket-123",
            requester_id="agent-alice",
            payload={
                "agent": "program_manager",
                "action_type": "query",
                "risk_score": 0.1,
            },
        )
        self.assertEqual(submission["status"], "pending")

        approvals = self.engine.list_approvals(status="approved")
        self.assertEqual(len(approvals), 1)
        self.assertEqual(approvals[0]["workflow_id"], "wf-support")

    def test_manual_approval_path(self) -> None:
        workflow = self._sample_workflow()
        # Disable auto approval for this test
        workflow["stages"][0].pop("auto_rules")
        self.engine.create_workflow(workflow)

        submission = self.engine.submit_approval(
            workflow_id="wf-support",
            target_entity="ticket-234",
            requester_id="agent-bob",
            payload={
                "agent": "program_manager",
                "action_type": "query",
                "risk_score": 0.5,
            },
        )
        approval_id = submission["approval_id"]

        result = self.engine.act_on_approval(
            approval_id=approval_id,
            actor_id="manager-1",
            action="approve",
            metadata={"notes": "Reviewed"},
        )
        self.assertEqual(result["status"], "approved")

        approvals = self.engine.list_approvals(status="approved")
        ids = {item["id"] for item in approvals}
        self.assertIn(approval_id, ids)


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
