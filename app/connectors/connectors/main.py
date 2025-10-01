from fastapi import FastAPI
from datetime import datetime, timezone

app = FastAPI(title="Connectors Service", version="0.1.0")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "connectors",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
