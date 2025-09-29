from __future__ import annotations
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
from pathlib import Path

@dataclass
class IdempotencyKey:
    key: str
    created_at: str
    expires_at: str
    result: Any

class FileIdempotencyStore:
    def __init__(self, base_path: str | Path) -> None:
        self._base = Path(base_path)
        self._base.mkdir(parents=True, exist_ok=True)

    def _key_path(self, key: str) -> Path:
        safe = hashlib.sha256(key.encode()).hexdigest()[:16]
        return self._base / f"{safe}.json"

    def get(self, key: str) -> Optional[IdempotencyKey]:
        path = self._key_path(key)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return IdempotencyKey(**data)
        except Exception:
            return None

    def set(self, key: str, result: Any, ttl_seconds: int = 3600) -> None:
        now = datetime.now(timezone.utc)
        expires = now + timedelta(seconds=ttl_seconds)
        record = IdempotencyKey(
            key=key,
            created_at=now.isoformat(),
            expires_at=expires.isoformat(),
            result=result,
        )
        path = self._key_path(key)
        path.write_text(json.dumps(record.__dict__, default=str), encoding="utf-8")

def make_idempotent_key(operation: str, **kwargs) -> str:
    parts = [operation] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
    return "|".join(parts)
