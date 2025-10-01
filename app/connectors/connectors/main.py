from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from datetime import datetime, timezone
from prometheus_client import generate_latest
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI(title="Connectors Service", version="0.1.0")


def _maybe_setup_tracing(service_name: str) -> None:
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if not endpoint:
        return
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)
    processor = BatchSpanProcessor(OTLPSpanExporter())
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)


_maybe_setup_tracing("connectors")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "connectors",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/ready")
def ready():
    return {"ready": True}

@app.get("/prometheus")
def prometheus_metrics() -> PlainTextResponse:
    return PlainTextResponse(generate_latest().decode("utf-8"))
