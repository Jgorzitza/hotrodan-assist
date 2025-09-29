import asyncio
from pathlib import Path
import json
import pytest

from app.reliability.retry_dlq import retry_with_backoff, retry_with_dlq, JsonlDlq

@pytest.mark.asyncio
async def test_retry_with_backoff_eventually_succeeds():
    calls = {"n": 0}
    async def op():
        calls["n"] += 1
        if calls["n"] < 3:
            raise RuntimeError("transient")
        return "ok"
    result = await retry_with_backoff(op, max_attempts=5, base_delay_seconds=0.01, max_delay_seconds=0.05, jitter_seconds=0.0)
    assert result == "ok"
    assert calls["n"] == 3

@pytest.mark.asyncio
async def test_retry_with_dlq_on_give_up(tmp_path: Path):
    dlq_path = tmp_path / "dlq.jsonl"
    dlq = JsonlDlq(dlq_path)
    calls = {"n": 0}
    async def op():
        calls["n"] += 1
        raise RuntimeError("permanent failure")
    with pytest.raises(RuntimeError):
        await retry_with_dlq(
            operation_name="unit-test-op",
            payload={"x": 1},
            func=op,
            dlq=dlq,
            max_attempts=3,
            base_delay_seconds=0.01,
            max_delay_seconds=0.05,
            jitter_seconds=0.0,
        )
    lines = dlq_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1
    rec = json.loads(lines[0])
    assert rec["operation"] == "unit-test-op"
    assert rec["attempts"] == 3
