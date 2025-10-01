from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from datetime import datetime, timezone
from prometheus_client import generate_latest

app = FastAPI(title="Connectors Service", version="0.1.0")

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
