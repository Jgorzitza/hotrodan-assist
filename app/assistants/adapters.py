"""Delivery adapter registry stub.

Provide a lightweight extension point so the Assistants service can
register channel-specific delivery handlers without breaking import time.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

AdapterFn = Callable[[Dict[str, Any]], Optional[str]]


@dataclass(slots=True)
class _NoOpAdapter:
    """Fallback adapter used when no channel-specific handler is registered."""

    def send(self, payload: Dict[str, Any]) -> Optional[str]:  # pragma: no cover - trivial
        return None


@dataclass(slots=True)
class _CallableAdapter:
    handler: AdapterFn

    def send(self, payload: Dict[str, Any]) -> Optional[str]:  # pragma: no cover - trivial
        return self.handler(payload)


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

    def send(self, channel: str, payload: Dict[str, Any]) -> Optional[str]:
        return self.adapter_for_channel(channel).send(payload)


__all__ = ["DeliveryAdapterRegistry", "AdapterFn"]
