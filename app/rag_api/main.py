"""FastAPI shim over the shared RAG index.

Supports two modes:
- ``openai`` (default): uses OpenAI for embeddings + generation.
- ``retrieval-only``: FastEmbed embeddings paired with a simple
  retrieval response when no OpenAI key is present.
"""

import os
from textwrap import shorten

import chromadb
from fastapi import FastAPI
from pydantic import BaseModel

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore

from rag_config import (
    COLLECTION,
    INDEX_ID,
    PERSIST_DIR,
    CHROMA_PATH,
    configure_settings,
)

configure_settings()

GENERATION_MODE = os.getenv("RAG_GENERATION_MODE", "openai")
_SYSTEM_HINT = (
    "Retail EFI specialist. Cover pump sizing (LPH vs hp & fuel), "
    "return vs returnless, regulator placement, ≤10 μm pressure-side filtration, "
    "AN line sizes, PTFE-lined hose for gasoline/diesel/E85/methanol. Be concise."
)

app = FastAPI()

class QueryIn(BaseModel):
    question: str
    top_k: int = 10

@app.post("/query")
def query(q: QueryIn):
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage = StorageContext.from_defaults(vector_store=vector_store, persist_dir=PERSIST_DIR)
    index = load_index_from_storage(storage, index_id=INDEX_ID)

    retriever = index.as_retriever(similarity_top_k=q.top_k)
    nodes = retriever.retrieve(q.question)

    if GENERATION_MODE == "openai":
        qe = index.as_query_engine(response_mode="compact", similarity_top_k=q.top_k)
        resp = qe.query(_SYSTEM_HINT + "\n\nQuestion: " + q.question)
        sources = [n.metadata.get("source_url", "unknown") for n in getattr(resp, "source_nodes", [])]
        return {"answer": str(resp), "sources": sources}

    summaries = []
    source_urls = []
    for node_with_score in nodes:
        node = getattr(node_with_score, "node", None) or node_with_score
        text = getattr(node, "text", None)
        if text is None and hasattr(node, "get_content"):
            text = node.get_content()
        if not text:
            continue
        summaries.append(shorten(text.replace("\n", " "), width=400, placeholder="…"))
        source = node.metadata.get("source_url", "unknown")
        if source not in source_urls:
            source_urls.append(source)

    if not summaries:
        return {
            "answer": "No relevant documents retrieved. Configure OPENAI_API_KEY for full responses.",
            "sources": [],
        }

    answer = "\n\n".join(f"• {snippet}" for snippet in summaries[:3])
    return {
        "answer": answer + "\n\n[LLM disabled: configure OPENAI_API_KEY for full narratives]",
        "sources": source_urls[:10],
    }
