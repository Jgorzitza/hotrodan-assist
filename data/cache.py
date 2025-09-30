"""Redis cache helpers."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Optional

import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


@dataclass
class Cache:
    """Thin wrapper around redis-py for structured values."""

    url: str = REDIS_URL

    def __post_init__(self) -> None:
        self._client = redis.Redis.from_url(self.url, decode_responses=True)

    def set_json(self, key: str, value: Any, *, ttl_seconds: Optional[int] = None) -> None:
        payload = json.dumps(value, default=str)
        if ttl_seconds:
            self._client.setex(key, ttl_seconds, payload)
        else:
            self._client.set(key, payload)

    def get_json(self, key: str) -> Any:
        data = self._client.get(key)
        if data is None:
            return None
        return json.loads(data)

    def incr(self, key: str, amount: int = 1) -> int:
        return int(self._client.incr(key, amount))

    def ttl(self, key: str) -> int:
        return int(self._client.ttl(key))
