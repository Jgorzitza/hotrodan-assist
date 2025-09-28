"""Delivery adapter registry stub.

Provide a lightweight extension point so the Assistants service can
register channel-specific delivery handlers without breaking import time.
"""
from __future__ import annotations

from dataclasses import dataclass
from inspect import isawaitable
from typing import Any, Awaitable, Callable, Dict, Optional

AdapterResult = Optional[str]
AdapterFn = Callable[[Dict[str, Any]], Awaitable[AdapterResult] | AdapterResult]


@dataclass(slots=True)
class _NoOpAdapter:
    """Fallback adapter used when no channel-specific handler is registered."""

    async def send(self, payload: Dict[str, Any]) -> Optional[str]:  # pragma: no cover - trivial
        return None


@dataclass(slots=True)
class _CallableAdapter:
    handler: AdapterFn

    async def send(self, payload: Dict[str, Any]) -> Optional[str]:  # pragma: no cover - trivial
        result = self.handler(payload)
        if isawaitable(result):
            return await result
        return result


class DeliveryAdapterRegistry:
    """Minimal adapter registry used by the Assistants service."""

    def __init__(self) -> None:
        self._adapters: Dict[str, AdapterFn] = {}
        self._noop = _NoOpAdapter()

    def register(self, channel: str, handler: AdapterFn) -> None:
        self._adapters[channel.lower()] = handler

    def adapter_for_channel(self, channel: str) -> _CallableAdapter | _NoOpAdapter:
        handler = self._adapters.get(channel.lower())
        if not handler:
            return self._noop
        return _CallableAdapter(handler)

    async def send(self, channel: str, payload: Dict[str, Any]) -> Optional[str]:
        return await self.adapter_for_channel(channel).send(payload)

    def clear(self) -> None:
        self._adapters.clear()


__all__ = ["DeliveryAdapterRegistry", "AdapterFn"]
