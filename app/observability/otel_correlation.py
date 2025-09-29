from __future__ import annotations
import uuid
from dataclasses import dataclass
from typing import Dict, Optional

@dataclass
class TraceContext:
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None

class SimpleTracer:
    def __init__(self):
        self._current_context: Optional[TraceContext] = None

    def start_span(self, name: str, parent: Optional[TraceContext] = None) -> TraceContext:
        trace_id = parent.trace_id if parent else str(uuid.uuid4())
        span_id = str(uuid.uuid4())
        context = TraceContext(trace_id=trace_id, span_id=span_id, parent_span_id=parent.span_id if parent else None)
        self._current_context = context
        return context

    def get_current_context(self) -> Optional[TraceContext]:
        return self._current_context

    def inject_headers(self, context: TraceContext) -> Dict[str, str]:
        return {
            "x-trace-id": context.trace_id,
            "x-span-id": context.span_id,
            "x-parent-span-id": context.parent_span_id or "",
        }

    def extract_headers(self, headers: Dict[str, str]) -> Optional[TraceContext]:
        trace_id = headers.get("x-trace-id")
        span_id = headers.get("x-span-id")
        if not trace_id or not span_id:
            return None
        return TraceContext(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=headers.get("x-parent-span-id") or None,
        )
