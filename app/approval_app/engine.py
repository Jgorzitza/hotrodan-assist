"""Workflow engine with routing, auto-approval, and SLA handling."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from .db import (
    ApprovalRecord,
    WorkflowRecord,
    WorkflowStageRecord,
    append_audit_log,
    create_approval,
    get_approval,
    get_workflow,
    init_db,
    list_approvals,
    list_workflows,
    record_approval_event,
    update_approval_state,
    upsert_workflow,
)


class AutoApprovalRules:
    def __init__(self, rules_path: Path) -> None:
        self.rules_path = rules_path
        self.rules = self._load_rules()

    def _load_rules(self) -> Dict[str, Any]:
        if not self.rules_path.exists():
            return {}
        with self.rules_path.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def should_auto_approve(self, *, action_type: str, agent: str, risk_score: float) -> bool:
        rules = self.rules.get("auto_approval_rules", {})

        action_cfg = rules.get("by_action_type", {}).get(action_type)
        if action_cfg and action_cfg.get("enabled") and action_type in {"read", "query"}:
            return True

        for trust_level, cfg in rules.get("by_agent_trust_level", {}).items():
            if not cfg.get("enabled"):
                continue
            if agent not in cfg.get("agents", []):
                continue
            if trust_level == "high":
                return True
            if action_type in cfg.get("auto_approve_actions", []):
                return True

        risk_cfg = rules.get("by_risk_score", {})
        threshold = risk_cfg.get("auto_approve_below")
        if threshold is not None and risk_score < float(threshold):
            return True

        return False


class WorkflowEngine:
    def __init__(
        self,
        *,
        db_path: Optional[Path] = None,
        auto_rules_path: Optional[Path] = None,
    ) -> None:
        self.db_path = db_path
        init_db(db_path)
        if auto_rules_path is None:
            auto_rules_path = Path(
                "/home/justin/llama_rag/plans/agents/approvals/auto-approval-rules.json"
            )
        self.auto_rules = AutoApprovalRules(auto_rules_path)

    # ------------------------------------------------------------------
    # Workflow management
    # ------------------------------------------------------------------
    def create_workflow(self, definition: Dict[str, Any]) -> Dict[str, Any]:
        workflow_id = definition.get("id") or f"workflow-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()

        workflow_record = WorkflowRecord(
            id=workflow_id,
            name=definition.get("name", workflow_id),
            version=definition.get("version", "1.0"),
            description=definition.get("description"),
            definition=definition,
            status="active",
            created_at=now,
            updated_at=now,
        )

        stages: List[WorkflowStageRecord] = []
        for idx, stage in enumerate(definition.get("stages", [])):
            stage_id = stage.get("id") or f"{workflow_id}-stage-{idx+1}"
            stages.append(
                WorkflowStageRecord(
                    id=stage_id,
                    workflow_id=workflow_id,
                    name=stage.get("name", stage_id),
                    stage_type=stage.get("type", "sequential"),
                    position=stage.get("position", idx),
                    config=stage,
                    created_at=now,
                )
            )

        upsert_workflow(workflow_record, stages, db_path=self.db_path)

        append_audit_log(
            entity_type="workflow",
            entity_id=workflow_id,
            action="workflow.created",
            actor_id=definition.get("created_by"),
            payload={"definition": definition},
            db_path=self.db_path,
        )

        return {"workflow_id": workflow_id}

    def list_workflows(self) -> List[Dict[str, Any]]:
        workflows = list_workflows(db_path=self.db_path)
        return [
            {
                "id": wf.id,
                "name": wf.name,
                "version": wf.version,
                "status": wf.status,
                "created_at": wf.created_at,
                "updated_at": wf.updated_at,
            }
            for wf in workflows
        ]

    def get_workflow(self, workflow_id: str) -> Dict[str, Any]:
        data = get_workflow(workflow_id, db_path=self.db_path)
        if data is None:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return {
            "workflow": data["workflow"].definition,
            "stages": [stage.config for stage in data["stages"]],
        }

    # ------------------------------------------------------------------
    # Approvals
    # ------------------------------------------------------------------
    def submit_approval(
        self,
        *,
        workflow_id: str,
        target_entity: str,
        payload: Dict[str, Any],
        requester_id: str,
    ) -> Dict[str, Any]:
        workflow_data = get_workflow(workflow_id, db_path=self.db_path)
        if workflow_data is None:
            raise HTTPException(status_code=404, detail="Workflow not found")

        stages = sorted(workflow_data["stages"], key=lambda s: s.position)
        if not stages:
            raise HTTPException(status_code=400, detail="Workflow has no stages")

        first_stage = stages[0]
        approval_id = f"appr-{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc)
        sla_due_at = self._calculate_sla_due(first_stage.config, now)

        approval_record = ApprovalRecord(
            id=approval_id,
            workflow_id=workflow_data["workflow"].id,
            workflow_version=workflow_data["workflow"].version,
            target_entity=target_entity,
            current_stage_id=first_stage.id,
            status="pending",
            payload=payload,
            requester_id=requester_id,
            created_at=now.isoformat(),
            updated_at=now.isoformat(),
            sla_due_at=sla_due_at.isoformat() if sla_due_at else None,
        )

        create_approval(approval_record, db_path=self.db_path)

        record_approval_event(
            approval_id=approval_id,
            stage_id=first_stage.id,
            actor_id=requester_id,
            action="submitted",
            data={"payload": payload},
            db_path=self.db_path,
        )

        append_audit_log(
            entity_type="approval",
            entity_id=approval_id,
            action="approval.submitted",
            actor_id=requester_id,
            payload={"workflow_id": workflow_id, "target": target_entity},
            db_path=self.db_path,
        )

        if self._should_auto_approve(stage_config=first_stage.config, payload=payload):
            self.act_on_approval(
                approval_id=approval_id,
                actor_id="system",
                action="approve",
                metadata={"auto": True},
            )

        return {"approval_id": approval_id, "status": "pending"}

    def list_approvals(self, *, status: Optional[str] = None) -> List[Dict[str, Any]]:
        approvals = list_approvals(status=status, db_path=self.db_path)
        return [
            {
                "id": appr.id,
                "workflow_id": appr.workflow_id,
                "status": appr.status,
                "current_stage_id": appr.current_stage_id,
                "created_at": appr.created_at,
                "updated_at": appr.updated_at,
                "sla_due_at": appr.sla_due_at,
            }
            for appr in approvals
        ]

    def act_on_approval(
        self,
        *,
        approval_id: str,
        actor_id: str,
        action: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        approval_data = get_approval(approval_id, db_path=self.db_path)
        if approval_data is None:
            raise HTTPException(status_code=404, detail="Approval not found")

        approval = approval_data["approval"]
        workflow_data = get_workflow(approval.workflow_id, db_path=self.db_path)
        if workflow_data is None:
            raise HTTPException(status_code=404, detail="Workflow not found")

        current_stage = None
        for stage in workflow_data["stages"]:
            if stage.id == approval.current_stage_id:
                current_stage = stage
                break

        if current_stage is None:
            raise HTTPException(status_code=400, detail="Approval missing current stage")

        record_approval_event(
            approval_id=approval.id,
            stage_id=current_stage.id,
            actor_id=actor_id,
            action=action,
            data=metadata or {},
            db_path=self.db_path,
        )

        append_audit_log(
            entity_type="approval",
            entity_id=approval.id,
            action=f"approval.{action}",
            actor_id=actor_id,
            payload=metadata,
            db_path=self.db_path,
        )

        now = datetime.now(timezone.utc).isoformat()

        if action == "reject":
            update_approval_state(
                approval.id,
                status="rejected",
                current_stage_id=current_stage.id,
                updated_at=now,
                db_path=self.db_path,
            )
            return {"approval_id": approval.id, "status": "rejected"}

        if action in {"delegate", "reassign"}:
            assignee = (metadata or {}).get("assignee")
            if assignee is None:
                raise HTTPException(status_code=400, detail="Assignee required for delegation")
            update_approval_state(
                approval.id,
                status="pending",
                current_stage_id=current_stage.id,
                updated_at=now,
                db_path=self.db_path,
            )
            return {"approval_id": approval.id, "status": "pending", "delegated_to": assignee}

        if action == "withdraw":
            update_approval_state(
                approval.id,
                status="withdrawn",
                current_stage_id=current_stage.id,
                updated_at=now,
                db_path=self.db_path,
            )
            return {"approval_id": approval.id, "status": "withdrawn"}

        next_stage = self._determine_next_stage(
            current_stage=current_stage,
            workflow_stages=workflow_data["stages"],
            approval_id=approval.id,
        )

        if next_stage is None:
            update_approval_state(
                approval.id,
                status="approved",
                current_stage_id=current_stage.id,
                updated_at=now,
                db_path=self.db_path,
            )
            return {"approval_id": approval.id, "status": "approved"}

        sla_due_at = self._calculate_sla_due(next_stage.config, datetime.now(timezone.utc))
        update_approval_state(
            approval.id,
            status="pending",
            current_stage_id=next_stage.id,
            sla_due_at=sla_due_at.isoformat() if sla_due_at else None,
            updated_at=now,
            db_path=self.db_path,
        )

        if self._should_auto_approve(stage_config=next_stage.config, payload=approval.payload):
            return self.act_on_approval(
                approval_id=approval.id,
                actor_id="system",
                action="approve",
                metadata={"auto": True, "previous_stage": current_stage.id},
            )

        return {
            "approval_id": approval.id,
            "status": "pending",
            "current_stage_id": next_stage.id,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _calculate_sla_due(
        self, stage_config: Dict[str, Any], start_time: datetime
    ) -> Optional[datetime]:
        sla_cfg = stage_config.get("sla")
        if not sla_cfg:
            return None
        duration = sla_cfg.get("duration")
        if not duration:
            return None
        try:
            if duration.endswith("h"):
                return start_time + timedelta(hours=float(duration[:-1]))
            if duration.endswith("m"):
                return start_time + timedelta(minutes=float(duration[:-1]))
            if duration.endswith("d"):
                return start_time + timedelta(days=float(duration[:-1]))
        except ValueError:
            return None
        return None

    def _determine_next_stage(
        self,
        *,
        current_stage: WorkflowStageRecord,
        workflow_stages: List[WorkflowStageRecord],
        approval_id: str,
    ) -> Optional[WorkflowStageRecord]:
        config = current_stage.config
        if config.get("type") == "parallel":
            quorum = config.get("quorum")
            if quorum is None:
                return self._next_stage_after(current_stage, workflow_stages)
            approval_data = get_approval(approval_id, db_path=self.db_path)
            events = approval_data["events"] if approval_data else []
            approvals_in_stage = [
                ev for ev in events if ev["stage_id"] == current_stage.id and ev["action"] == "approve"
            ]
            if len(approvals_in_stage) < quorum:
                return current_stage
        return self._next_stage_after(current_stage, workflow_stages)

    def _next_stage_after(
        self,
        current_stage: WorkflowStageRecord,
        workflow_stages: List[WorkflowStageRecord],
    ) -> Optional[WorkflowStageRecord]:
        ordered = sorted(workflow_stages, key=lambda s: s.position)
        for idx, stage in enumerate(ordered):
            if stage.id == current_stage.id:
                if idx + 1 < len(ordered):
                    return ordered[idx + 1]
                return None
        return None

    def _should_auto_approve(self, *, stage_config: Dict[str, Any], payload: Dict[str, Any]) -> bool:
        auto_cfg = stage_config.get("auto_rules")
        if not auto_cfg:
            return False
        action_type = auto_cfg.get("action_type", payload.get("action_type", "query"))
        agent = payload.get("agent", "unknown")
        risk_score = float(payload.get("risk_score", 1))
        return self.auto_rules.should_auto_approve(
            action_type=action_type,
            agent=agent,
            risk_score=risk_score,
        )


__all__ = ["WorkflowEngine"]
