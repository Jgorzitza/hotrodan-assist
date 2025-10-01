import os
from fastapi.testclient import TestClient

# Ensure Assistants base points to local test service if present
os.environ.setdefault("ASSISTANTS_BASE", "http://127.0.0.1:8005")

import sys, pathlib
# Ensure app dir is importable
APP_DIR = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP_DIR))
from main import app, mask_pii  # type: ignore

client = TestClient(app)


def test_health_and_ready_endpoints():
    r = client.get("/health")
    assert r.status_code == 200
    assert "status" in r.json()

    r2 = client.get("/ready")
    assert r2.status_code == 200
    assert "ready" in r2.json()


def test_security_headers_present():
    # Use /health to avoid hitting Assistants drafts during unit test
    r = client.get("/health")
    assert r.status_code == 200
    # Middleware should attach security headers to responses
    assert r.headers.get("x-frame-options") == "DENY"
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("referrer-policy") == "no-referrer"
    assert "content-security-policy" in {k.lower(): v for k, v in r.headers.items()}


def test_mask_pii():
    sample = "email=john@example.com&authorization=Bearer abc123&phone=+1-415-555-1212"
    masked = mask_pii(sample)
    # Domain preserved and local part masked with some asterisks
    assert "@example.com" in masked
    assert "***" in masked
    # Token masked and phone redacted
    assert "=***" in masked
    assert "<redacted>" in masked
    # Original local-part should not appear fully
    assert "john@example.com" not in masked
