import os
import tempfile
from pathlib import Path
from typing import Literal, Tuple

from llama_index.core import Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.fastembed import FastEmbedEmbedding
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.llms.mock import MockLLM
from llama_index.llms.openai import OpenAI

INDEX_ID = "hotrodan"
CHROMA_PATH = "chroma"
PERSIST_DIR = "storage"
COLLECTION = "hotrodan"

_SENTINEL_KEYS = {
    "placeholder",
    "changeme",
    "dummy",
    "sk-your-key",
    "sk-xxxxx",
    "test",
}


def is_openai_configured() -> bool:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        return False
    return key.lower() not in _SENTINEL_KEYS


def _fastembed_repo_name(model_name: str) -> str:
    try:
        from fastembed.text.text_embedding import TextEmbedding

        for desc in TextEmbedding._list_supported_models():
            if desc.model.lower() == model_name.lower():
                source = desc.sources.hf or desc.sources.url or desc.model
                if isinstance(source, str):
                    return source
    except Exception:
        pass
    return model_name


def _resolve_fastembed_cache(model_name: str) -> Tuple[str, bool]:
    base_env = os.getenv("FASTEMBED_CACHE_PATH")
    cache_dir = Path(base_env) if base_env else Path(tempfile.gettempdir()) / "fastembed_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    repo_name = _fastembed_repo_name(model_name)
    model_dir = cache_dir / f"models--{repo_name.replace('/', '--')}"
    local_only_env = os.getenv("FASTEMBED_LOCAL_ONLY")
    if local_only_env is not None:
        local_only = local_only_env.lower() in {"1", "true", "yes"}
    else:
        local_only = model_dir.exists()
    return str(cache_dir), local_only


def configure_settings() -> Literal["openai", "retrieval-only"]:
    Settings.node_parser = SentenceSplitter(chunk_size=1500, chunk_overlap=150)

    if is_openai_configured():
        llm_model = os.getenv("RAG_LLM_MODEL", "gpt-4o-mini")
        embed_model = os.getenv("RAG_EMBED_MODEL", "text-embedding-3-small")
        Settings.llm = OpenAI(model=llm_model)
        Settings.embed_model = OpenAIEmbedding(model=embed_model)
        os.environ.setdefault("RAG_GENERATION_MODE", "openai")
        return "openai"

    fastembed_model = os.getenv("FASTEMBED_MODEL", "BAAI/bge-small-en-v1.5")
    cache_dir, local_only = _resolve_fastembed_cache(fastembed_model)
    Settings.llm = MockLLM(max_tokens=512)
    Settings.embed_model = FastEmbedEmbedding(
        model_name=fastembed_model,
        cache_dir=cache_dir,
        local_files_only=local_only,
    )
    os.environ.setdefault("RAG_GENERATION_MODE", "retrieval-only")
    return "retrieval-only"


MODE = configure_settings()
