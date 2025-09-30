"""Model selector for multi-provider LLM support."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional

try:
    from llama_index.llms.anthropic import Anthropic
except ImportError:  # optional dependency
    Anthropic = None  # type: ignore[assignment]

from llama_index.core.llms.mock import MockLLM
from llama_index.llms.openai import OpenAI


@dataclass
class ProviderInfo:
    name: str
    llm: Optional[object]
    available: bool = True
    reason: Optional[str] = None
    metadata: Dict[str, str] = field(default_factory=dict)


class ModelSelector:
    """Central registry that manages multi-model provider selection."""

    def __init__(self) -> None:
        self.priority: List[str] = []
        self.available: Dict[str, ProviderInfo] = {}
        self.unavailable: Dict[str, ProviderInfo] = {}
        self.refresh()

    def refresh(self) -> None:
        priority_raw = os.getenv("RAG_MODEL_PRIORITY", "openai,anthropic,local,retrieval-only")
        self.priority = [p.strip().lower() for p in priority_raw.split(",") if p.strip()]

        self.available = {}
        self.unavailable = {}

        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        openai_model = os.getenv("RAG_LLM_MODEL", "gpt-4o-mini")
        if openai_key:
            self.available["openai"] = ProviderInfo(
                name="openai",
                llm=OpenAI(model=openai_model),
                metadata={"model": openai_model},
            )
        else:
            self.unavailable["openai"] = ProviderInfo(
                name="openai",
                llm=None,
                available=False,
                reason="OPENAI_API_KEY not configured",
            )

        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        anthropic_model = os.getenv("RAG_ANTHROPIC_MODEL", "claude-3-haiku-20240307")
        if anthropic_key and Anthropic is not None:
            self.available["anthropic"] = ProviderInfo(
                name="anthropic",
                llm=Anthropic(model=anthropic_model),
                metadata={"model": anthropic_model},
            )
        else:
            missing_reason = "ANTHROPIC_API_KEY not configured"
            if Anthropic is None:
                missing_reason = "llama-index Anthropic integration not installed"
            self.unavailable["anthropic"] = ProviderInfo(
                name="anthropic",
                llm=None,
                available=False,
                reason=missing_reason,
            )

        self.available["local"] = ProviderInfo(
            name="local",
            llm=MockLLM(max_tokens=512),
            metadata={"model": "MockLLM"},
        )

        self.available["retrieval-only"] = ProviderInfo(
            name="retrieval-only",
            llm=None,
            metadata={"mode": "retrieval"},
        )

    def choose(self, requested: Optional[str] = None) -> ProviderInfo:
        ordered_names: List[str] = []
        if requested:
            ordered_names.append(requested.strip().lower())
        ordered_names.extend(self.priority or [])
        ordered_names.append("retrieval-only")

        for name in ordered_names:
            provider = self.available.get(name)
            if provider:
                return provider

        return ProviderInfo(name="retrieval-only", llm=None, metadata={"mode": "retrieval"})

    def provider_summary(self) -> Dict[str, Dict[str, Optional[str]]]:
        summary: Dict[str, Dict[str, Optional[str]]] = {}
        for name, info in {**self.unavailable, **self.available}.items():
            summary[name] = {
                "available": info.available,
                "reason": info.reason,
                **info.metadata,
            }
        return summary


MODEL_SELECTOR = ModelSelector()
