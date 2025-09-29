from pathlib import Path
import pytest
from app.replay.backfill_tool import BackfillTool, ReplayEvent

def test_backfill_tool(tmp_path: Path):
    tool = BackfillTool(tmp_path)
    
    event = ReplayEvent(
        event_id="test-123",
        event_type="test-event",
        payload={"data": "test"},
        occurred_at="2025-01-01T00:00:00Z"
    )
    
    tool.save_event(event)
    events = tool.load_events()
    assert len(events) == 1
    assert events[0].event_id == "test-123"
    
    results = tool.replay_events(dry_run=True)
    assert results["total"] == 1
    assert results["processed"] == 1
