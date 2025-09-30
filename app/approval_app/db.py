"""SQLite persistence layer for approvals workflows."""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

APP_ROOT = Path(__file__).resolve().parent
DEFAULT_DB_PATH = Path(
    os.getenv("APPROVAL_DB_PATH", APP_ROOT.parent / "data" / "approval_workflows.db")
)


@dataclass
class WorkflowRecord:
    id: str
    name: str
    version: str
    description: Optional[str]
    definition: Dict[str, Any]
    status: str
    created_at: str
    updated_at: str


@dataclass
class WorkflowStageRecord:
    id: str
    workflow_id: str
    name: str
    stage_type: str
    position: int
    config: Dict[str, Any]
    created_at: str


@dataclass
class ApprovalRecord:
    id: str
    workflow_id: str
    workflow_version: str
    target_entity: str
    current_stage_id: Optional[str]
    status: str
    payload: Dict[str, Any]
    requester_id: str
    created_at: str
    updated_at: str
    sla_due_at: Optional[str]


@contextmanager
def get_connection(db_path: Optional[Path] = None) -> Iterator[sqlite3.Connection]:
    path = Path(db_path or DEFAULT_DB_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
    finally:
        conn.close()


def init_db(db_path: Optional[Path] = None) -> None:
    with get_connection(db_path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                version TEXT NOT NULL,
                description TEXT,
                definition TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS workflow_stages (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                name TEXT NOT NULL,
                stage_type TEXT NOT NULL,
                position INTEGER NOT NULL,
                config TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                workflow_version TEXT NOT NULL,
                target_entity TEXT NOT NULL,
                current_stage_id TEXT,
                status TEXT NOT NULL,
                payload TEXT NOT NULL,
                requester_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                sla_due_at TEXT,
                FOREIGN KEY(workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
                FOREIGN KEY(current_stage_id) REFERENCES workflow_stages(id)
            );

            CREATE TABLE IF NOT EXISTS approval_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                approval_id TEXT NOT NULL,
                stage_id TEXT,
                actor_id TEXT,
                action TEXT NOT NULL,
                data TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(approval_id) REFERENCES approvals(id) ON DELETE CASCADE,
                FOREIGN KEY(stage_id) REFERENCES workflow_stages(id)
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor_id TEXT,
                payload TEXT,
                created_at TEXT NOT NULL
            );
            """
        )
        conn.commit()


def _dump(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"))


def _load(value: Optional[str]) -> Any:
    if value is None:
        return None
    return json.loads(value)


def upsert_workflow(workflow: WorkflowRecord, stages: List[WorkflowStageRecord], db_path: Optional[Path] = None) -> None:
    with get_connection(db_path) as conn:
        conn.execute(
            """
            INSERT INTO workflows (id, name, version, description, definition, status, created_at, updated_at)
            VALUES (:id, :name, :version, :description, :definition, :status, :created_at, :updated_at)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                version=excluded.version,
                description=excluded.description,
                definition=excluded.definition,
                status=excluded.status,
                updated_at=excluded.updated_at
            """,
            {
                "id": workflow.id,
                "name": workflow.name,
                "version": workflow.version,
                "description": workflow.description,
                "definition": _dump(workflow.definition),
                "status": workflow.status,
                "created_at": workflow.created_at,
                "updated_at": workflow.updated_at,
            },
        )

        conn.execute("DELETE FROM workflow_stages WHERE workflow_id = ?", (workflow.id,))

        for stage in stages:
            conn.execute(
                """
                INSERT INTO workflow_stages (id, workflow_id, name, stage_type, position, config, created_at)
                VALUES (:id, :workflow_id, :name, :stage_type, :position, :config, :created_at)
                """,
                {
                    "id": stage.id,
                    "workflow_id": stage.workflow_id,
                    "name": stage.name,
                    "stage_type": stage.stage_type,
                    "position": stage.position,
                    "config": _dump(stage.config),
                    "created_at": stage.created_at,
                },
            )

        conn.commit()


def list_workflows(db_path: Optional[Path] = None) -> List[WorkflowRecord]:
    with get_connection(db_path) as conn:
        rows = conn.execute(
            "SELECT id, name, version, description, definition, status, created_at, updated_at FROM workflows"
        ).fetchall()

    return [
        WorkflowRecord(
            id=row["id"],
            name=row["name"],
            version=row["version"],
            description=row["description"],
            definition=_load(row["definition"]),
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


def get_workflow(workflow_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        workflow_row = conn.execute(
            "SELECT id, name, version, description, definition, status, created_at, updated_at FROM workflows WHERE id = ?",
            (workflow_id,),
        ).fetchone()

        if workflow_row is None:
            return None

        stage_rows = conn.execute(
            "SELECT id, name, stage_type, position, config, created_at FROM workflow_stages WHERE workflow_id = ? ORDER BY position",
            (workflow_id,),
        ).fetchall()

    return {
        "workflow": WorkflowRecord(
            id=workflow_row["id"],
            name=workflow_row["name"],
            version=workflow_row["version"],
            description=workflow_row["description"],
            definition=_load(workflow_row["definition"]),
            status=workflow_row["status"],
            created_at=workflow_row["created_at"],
            updated_at=workflow_row["updated_at"],
        ),
        "stages": [
            WorkflowStageRecord(
                id=row["id"],
                workflow_id=workflow_id,
                name=row["name"],
                stage_type=row["stage_type"],
                position=row["position"],
                config=_load(row["config"]),
                created_at=row["created_at"],
            )
            for row in stage_rows
        ],
    }


def create_approval(approval: ApprovalRecord, db_path: Optional[Path] = None) -> None:
    with get_connection(db_path) as conn:
        conn.execute(
            """
            INSERT INTO approvals (
                id, workflow_id, workflow_version, target_entity, current_stage_id, status, payload, requester_id,
                created_at, updated_at, sla_due_at
            ) VALUES (:id, :workflow_id, :workflow_version, :target_entity, :current_stage_id, :status, :payload,
                      :requester_id, :created_at, :updated_at, :sla_due_at)
            """,
            {
                "id": approval.id,
                "workflow_id": approval.workflow_id,
                "workflow_version": approval.workflow_version,
                "target_entity": approval.target_entity,
                "current_stage_id": approval.current_stage_id,
                "status": approval.status,
                "payload": _dump(approval.payload),
                "requester_id": approval.requester_id,
                "created_at": approval.created_at,
                "updated_at": approval.updated_at,
                "sla_due_at": approval.sla_due_at,
            },
        )
        conn.commit()


def update_approval_state(
    approval_id: str,
    *,
    status: Optional[str] = None,
    current_stage_id: Optional[str] = None,
    sla_due_at: Optional[str] = None,
    updated_at: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> None:
    fields: Dict[str, Any] = {}
    if status is not None:
        fields["status"] = status
    if current_stage_id is not None:
        fields["current_stage_id"] = current_stage_id
    if sla_due_at is not None:
        fields["sla_due_at"] = sla_due_at
    fields["updated_at"] = updated_at or datetime.now(timezone.utc).isoformat()

    assignments = ", ".join(f"{col} = :{col}" for col in fields)
    params = {**fields, "approval_id": approval_id}

    with get_connection(db_path) as conn:
        conn.execute(
            f"UPDATE approvals SET {assignments} WHERE id = :approval_id",
            params,
        )
        conn.commit()


def record_approval_event(
    approval_id: str,
    *,
    stage_id: Optional[str],
    actor_id: Optional[str],
    action: str,
    data: Optional[Dict[str, Any]] = None,
    occurred_at: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> None:
    with get_connection(db_path) as conn:
        conn.execute(
            """
            INSERT INTO approval_events (approval_id, stage_id, actor_id, action, data, created_at)
            VALUES (:approval_id, :stage_id, :actor_id, :action, :data, :created_at)
            """,
            {
                "approval_id": approval_id,
                "stage_id": stage_id,
                "actor_id": actor_id,
                "action": action,
                "data": _dump(data) if data is not None else None,
                "created_at": occurred_at or datetime.now(timezone.utc).isoformat(),
            },
        )
        conn.commit()


def append_audit_log(
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: Optional[str],
    payload: Optional[Dict[str, Any]] = None,
    occurred_at: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> None:
    with get_connection(db_path) as conn:
        conn.execute(
            """
            INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, payload, created_at)
            VALUES (:entity_type, :entity_id, :action, :actor_id, :payload, :created_at)
            """,
            {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "action": action,
                "actor_id": actor_id,
                "payload": _dump(payload) if payload is not None else None,
                "created_at": occurred_at or datetime.now(timezone.utc).isoformat(),
            },
        )
        conn.commit()


def list_approvals(*, status: Optional[str] = None, limit: int = 50, db_path: Optional[Path] = None) -> List[ApprovalRecord]:
    query = (
        "SELECT id, workflow_id, workflow_version, target_entity, current_stage_id, status, payload, requester_id, created_at, updated_at, sla_due_at "
        "FROM approvals"
    )
    params: List[Any] = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    with get_connection(db_path) as conn:
        rows = conn.execute(query, params).fetchall()

    return [
        ApprovalRecord(
            id=row["id"],
            workflow_id=row["workflow_id"],
            workflow_version=row["workflow_version"],
            target_entity=row["target_entity"],
            current_stage_id=row["current_stage_id"],
            status=row["status"],
            payload=_load(row["payload"]),
            requester_id=row["requester_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            sla_due_at=row["sla_due_at"],
        )
        for row in rows
    ]


def get_approval(approval_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    with get_connection(db_path) as conn:
        approval_row = conn.execute(
            "SELECT id, workflow_id, workflow_version, target_entity, current_stage_id, status, payload, requester_id, created_at, updated_at, sla_due_at FROM approvals WHERE id = ?",
            (approval_id,),
        ).fetchone()
        if approval_row is None:
            return None

        event_rows = conn.execute(
            "SELECT id, stage_id, actor_id, action, data, created_at FROM approval_events WHERE approval_id = ? ORDER BY created_at",
            (approval_id,),
        ).fetchall()

    approval = ApprovalRecord(
        id=approval_row["id"],
        workflow_id=approval_row["workflow_id"],
        workflow_version=approval_row["workflow_version"],
        target_entity=approval_row["target_entity"],
        current_stage_id=approval_row["current_stage_id"],
        status=approval_row["status"],
        payload=_load(approval_row["payload"]),
        requester_id=approval_row["requester_id"],
        created_at=approval_row["created_at"],
        updated_at=approval_row["updated_at"],
        sla_due_at=approval_row["sla_due_at"],
    )

    events = [
        {
            "id": row["id"],
            "stage_id": row["stage_id"],
            "actor_id": row["actor_id"],
            "action": row["action"],
            "data": _load(row["data"]),
            "created_at": row["created_at"],
        }
        for row in event_rows
    ]

    return {"approval": approval, "events": events}


def list_audit_logs(
    *,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = 100,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    query = "SELECT id, entity_type, entity_id, action, actor_id, payload, created_at FROM audit_logs"
    params: List[Any] = []
    clauses: List[str] = []

    if entity_type:
        clauses.append("entity_type = ?")
        params.append(entity_type)
    if entity_id:
        clauses.append("entity_id = ?")
        params.append(entity_id)

    if clauses:
        query += " WHERE " + " AND ".join(clauses)

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    with get_connection(db_path) as conn:
        rows = conn.execute(query, params).fetchall()

    return [
        {
            "id": row["id"],
            "entity_type": row["entity_type"],
            "entity_id": row["entity_id"],
            "action": row["action"],
            "actor_id": row["actor_id"],
            "payload": _load(row["payload"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


__all__ = [
    "ApprovalRecord",
    "WorkflowRecord",
    "WorkflowStageRecord",
    "append_audit_log",
    "create_approval",
    "get_approval",
    "get_connection",
    "get_workflow",
    "init_db",
    "list_approvals",
    "list_audit_logs",
    "list_workflows",
    "record_approval_event",
    "update_approval_state",
    "upsert_workflow",
]
