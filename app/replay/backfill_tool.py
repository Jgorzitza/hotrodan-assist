from __future__ import annotations
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

@dataclass
class ReplayEvent:
    event_id: str
    event_type: str
    payload: Any
    occurred_at: str
    processed: bool = False

class BackfillTool:
    def __init__(self, events_dir: str | Path):
        self.events_dir = Path(events_dir)
        self.events_dir.mkdir(parents=True, exist_ok=True)

    def save_event(self, event: ReplayEvent) -> None:
        event_file = self.events_dir / f"{event.event_id}.json"
        event_file.write_text(json.dumps(event.__dict__, default=str, indent=2), encoding="utf-8")

    def load_events(self, event_type: Optional[str] = None) -> List[ReplayEvent]:
        events = []
        for event_file in self.events_dir.glob("*.json"):
            try:
                data = json.loads(event_file.read_text(encoding="utf-8"))
                event = ReplayEvent(**data)
                if event_type is None or event.event_type == event_type:
                    events.append(event)
            except Exception:
                continue
        return sorted(events, key=lambda e: e.occurred_at)

    def replay_events(self, event_type: Optional[str] = None, dry_run: bool = True) -> Dict[str, Any]:
        events = self.load_events(event_type)
        results = {"total": len(events), "processed": 0, "errors": 0}
        
        for event in events:
            if not event.processed:
                try:
                    if not dry_run:
                        # In real implementation, would call actual event handler
                        pass
                    event.processed = True
                    self.save_event(event)
                    results["processed"] += 1
                except Exception:
                    results["errors"] += 1
        
        return results
