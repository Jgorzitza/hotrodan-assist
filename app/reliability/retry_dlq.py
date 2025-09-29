from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional


@dataclass
class DlqRecord:
    occurred_at: str
    operation: str
    payload: Any
    error: str
    attempts: int


class JsonlDlq:
    def __init__(self, path: str | Path) -> None:
        self._path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)

    def enqueue(self, record: DlqRecord) -> None:
        line = json.dumps(asdict(record), ensure_ascii=False)
        with self._path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def retry_with_backoff(
    func: Callable[[], Awaitable[Any]],
    *,
    max_attempts: int = 5,
    base_delay_seconds: float = 0.2,
    max_delay_seconds: float = 5.0,
    jitter_seconds: float = 0.1,
    on_give_up: Optional[Callable[[Exception, int], None]] = None,
) -> Any:
    attempt = 0
    delay = base_delay_seconds
    while True:
        attempt += 1
        try:
            return await func()
        except Exception as exc:  # noqa: BLE001
            if attempt >= max_attempts:
                if on_give_up:
                    on_give_up(exc, attempt)
                raise
            # sleep with jitter
            sleep_for = min(delay, max_delay_seconds) + (jitter_seconds * (2 * (time.time() % 1) - 1))
            await asyncio.sleep(max(0.0, sleep_for))
            delay = min(delay * 2.0, max_delay_seconds)


async def retry_with_dlq(
    operation_name: str,
    payload: Any,
    func: Callable[[], Awaitable[Any]],
    dlq: JsonlDlq,
    *,
    max_attempts: int = 5,
    base_delay_seconds: float = 0.2,
    max_delay_seconds: float = 5.0,
    jitter_seconds: float = 0.1,
) -> Any:
    last_error: Optional[Exception] = None

    def give_up(exc: Exception, attempts: int) -> None:
        rec = DlqRecord(
            occurred_at=_now_iso(),
            operation=operation_name,
            payload=payload,
            error=repr(exc),
            attempts=attempts,
        )
        dlq.enqueue(rec)

    try:
        return await retry_with_backoff(
            func,
            max_attempts=max_attempts,
            base_delay_seconds=base_delay_seconds,
            max_delay_seconds=max_delay_seconds,
            jitter_seconds=jitter_seconds,
            on_give_up=give_up,
        )
    except Exception as exc:  # noqa: BLE001
        last_error = exc
        raise
    finally:
        if last_error is None:
            # success path: nothing to do
            pass
