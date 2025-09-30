"""Tests for the /customer_summary endpoint."""
from __future__ import annotations

from dataclasses import asdict
import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

from app.assistants.main import app, CustomerSummary, _get_customer_summary, get_db


@pytest.fixture(autouse=True)
def override_dependencies(monkeypatch):
    monkeypatch.setattr("app.assistants.main._get_customer_summary", _get_customer_summary)

    class _DummySession:
        pass

    def _dummy_get_db():
        return _DummySession()

    app.dependency_overrides[get_db] = _dummy_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


def test_customer_summary_requires_identifier(monkeypatch):
    client = TestClient(app)
    response = client.get("/customer_summary")
    assert response.status_code == 400
    assert "email or customer_id" in response.json()["detail"]


def test_customer_summary_by_email(monkeypatch):
    expected = CustomerSummary(
        customer_id="uuid",
        name="Jane Doe",
        email="jane@example.com",
        segment="vip",
        lifetime_value_cents=12345,
        shipping_addresses=[{"city": "Boise"}],
        recent_order={"order_id": "order-1"},
    )

    def fake_get_customer_summary(session, *, email=None, customer_id=None):
        assert email == "jane@example.com"
        assert customer_id is None
        return expected

    monkeypatch.setattr("app.assistants.main._get_customer_summary", fake_get_customer_summary)

    client = TestClient(app)
    response = client.get("/customer_summary", params={"email": "jane@example.com"})
    assert response.status_code == 200
    assert response.json()["customer"] == asdict(expected)


def test_customer_summary_not_found(monkeypatch):
    def fake_get_customer_summary(session, *, email=None, customer_id=None):
        raise LookupError("Customer not found")

    monkeypatch.setattr("app.assistants.main._get_customer_summary", fake_get_customer_summary)

    client = TestClient(app)
    response = client.get("/customer_summary", params={"email": "missing@example.com"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Customer not found"
