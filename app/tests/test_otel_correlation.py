import pytest
from app.observability.otel_correlation import SimpleTracer, TraceContext

def test_trace_context_creation():
    tracer = SimpleTracer()
    context = tracer.start_span("test-operation")
    assert context.trace_id is not None
    assert context.span_id is not None
    assert context.parent_span_id is None

def test_header_injection_extraction():
    tracer = SimpleTracer()
    context = tracer.start_span("test-operation")
    headers = tracer.inject_headers(context)
    assert "x-trace-id" in headers
    assert "x-span-id" in headers
    
    extracted = tracer.extract_headers(headers)
    assert extracted is not None
    assert extracted.trace_id == context.trace_id
    assert extracted.span_id == context.span_id
