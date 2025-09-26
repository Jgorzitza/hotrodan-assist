"""Centralized configuration for RAG settings and storage paths.

When an OpenAI key is unavailable we fall back to local FastEmbed embeddings
and defer generation to the caller (retrieval-only workflow). This keeps the
stack functional for ingest/query smoke tests without external credentials.
"""

import os
from typing import Optional

from llama_index.core import Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.embeddings import MockEmbedding
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.llms.mock import MockLLM
from llama_index.llms.openai import OpenAI

try:  # FastEmbed is lightweight and works without external credentials.
    from llama_index.embeddings.fastembed import FastEmbedEmbedding
except ImportError:  # pragma: no cover - dependency is optional at runtime.
    FastEmbedEmbedding = None  # type: ignore


INDEX_ID = os.getenv("INDEX_ID", "hotrodan")
CHROMA_PATH = os.getenv("CHROMA_PATH", "chroma")     # vector store persistence
PERSIST_DIR = os.getenv("PERSIST_DIR", "storage")    # index/docstore persistence
COLLECTION = os.getenv("COLLECTION", "hotrodan")    # chroma collection name

USING_OPENAI = False


def _openai_key() -> Optional[str]:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key or key.lower() == "sk-xxxxxxxx":
        return None
    return key


def configure_settings() -> None:
    """Configure global LlamaIndex settings with sensible fallbacks."""

    global USING_OPENAI

    Settings.node_parser = SentenceSplitter(chunk_size=1500, chunk_overlap=150)

    if _openai_key():
        USING_OPENAI = True
        Settings.llm = OpenAI(model="gpt-4o-mini", temperature=0.2)
        Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
        os.environ.setdefault("RAG_GENERATION_MODE", "openai")
        return

    USING_OPENAI = False
    Settings.llm = MockLLM()

    force_mock = os.getenv("RAG_FORCE_MOCK_EMBED", "").lower() in {"1", "true", "yes"}
    if force_mock:
        Settings.embed_model = MockEmbedding(embed_dim=384)
        print("[INFO] RAG_FORCE_MOCK_EMBED=1; using MockEmbedding.")
    elif FastEmbedEmbedding is None:
        print("[WARN] fastembed package not installed; using MockEmbedding.")
        Settings.embed_model = MockEmbedding(embed_dim=384)
    else:
        try:
            Settings.embed_model = FastEmbedEmbedding(model_name="BAAI/bge-small-en-v1.5")
        except Exception as err:
            # FastEmbed loads models from HuggingFace; in sandboxed/offline runs we fall back to
            # a deterministic mock embedding so ingest/golden tests remain operable.
            print(f"[WARN] FastEmbed unavailable ({err}); using MockEmbedding.")
            Settings.embed_model = MockEmbedding(embed_dim=384)
    os.environ.setdefault("RAG_GENERATION_MODE", "retrieval-only")


# Configure defaults on import so scripts and services share the same behavior.
configure_settings()
