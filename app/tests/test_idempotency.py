from pathlib import Path
import pytest
from app.idempotency.handlers import FileIdempotencyStore, make_idempotent_key

def test_idempotency_store(tmp_path: Path):
    store = FileIdempotencyStore(tmp_path)
    key = "test-op|a=1|b=2"
    assert store.get(key) is None
    store.set(key, {"result": "ok"}, ttl_seconds=60)
    found = store.get(key)
    assert found is not None
    assert found.result == {"result": "ok"}

def test_make_idempotent_key():
    key = make_idempotent_key("create-order", user_id="123", amount=99.99)
    assert "create-order" in key
    assert "user_id=123" in key
    assert "amount=99.99" in key
