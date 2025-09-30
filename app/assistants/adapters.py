"""Delivery adapters for inbox service."""
from __future__ import annotations

from typing import Dict, List


class DeliveryAdapter:
    def send(self, payload: Dict) -> str:
        raise NotImplementedError


class EmailAdapter(DeliveryAdapter):
    def send(self, payload: Dict) -> str:
        # Placeholder implementation; integrate with Zoho/SMTP etc.
        return f"email-{payload['draft_id']}"


class ChatAdapter(DeliveryAdapter):
    def send(self, payload: Dict) -> str:
        return f"chat-{payload['draft_id']}"


class NullAdapter(DeliveryAdapter):
    def send(self, payload: Dict) -> str:
        return f"sent-{payload['draft_id']}"


class DeliveryAdapterRegistry:
    def __init__(self) -> None:
        self._registry = {
            "email": EmailAdapter(),
            "chat": ChatAdapter(),
        }

    def adapter_for_channel(self, channel: str) -> DeliveryAdapter:
        return self._registry.get(channel, NullAdapter())

    def available_channels(self) -> List[str]:
        """Return a sorted list of channels with registered delivery adapters."""
        return sorted(self._registry.keys())
