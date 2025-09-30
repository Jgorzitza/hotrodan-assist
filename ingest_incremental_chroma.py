import json
import os
import time
from typing import Dict, List, Tuple

import chromadb
import requests
from bs4 import BeautifulSoup
from chromadb.config import Settings as ChromaSettings

from llama_index.core import Document, StorageContext, VectorStoreIndex, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore

from rag_pipeline import DocumentPipeline
from rag_config import (
    CHROMA_PATH,
    COLLECTION,
    INDEX_ID,
    PERSIST_DIR,
    configure_settings,
)

STATE_FILE = "ingest_state.json"


def read_urls_with_lastmod(path="urls_with_lastmod.tsv") -> List[Tuple[str, str]]:
    pairs = []
    with open(path, "r") as f:
        for line in f:
            if "	" in line:
                u, m = line.strip().split("	", 1)
                pairs.append((u, m))
    return pairs


def load_state() -> Dict[str, str]:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {}


def save_state(data: Dict[str, str]):
    with open(STATE_FILE, "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)


def shopify_headers():
    si = os.getenv("SHOPIFY_SIGNATURE_INPUT")
    s = os.getenv("SHOPIFY_SIGNATURE")
    sa = os.getenv("SHOPIFY_SIGNATURE_AGENT")
    headers = {"User-Agent": "HRAN-crawler/1.0"}
    if si and s and sa:
        headers.update({"Signature-Input": si, "Signature": s, "Signature-Agent": sa})
    return headers


def fetch_text(url: str) -> str:
    response = requests.get(url, headers=shopify_headers(), timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.extract()
    return soup.get_text(" ", strip=True)


def main():
    mode = configure_settings()
    if mode != "openai":
        print("OPENAI_API_KEY missing; using FastEmbed fallback (retrieval-only mode).")
    if not os.path.exists("urls_with_lastmod.tsv"):
        raise SystemExit("Run discover_urls.py first to build urls_with_lastmod.tsv")

    pairs = read_urls_with_lastmod()
    current_urls = {u for (u, _m) in pairs}
    state = load_state()

    client = chromadb.PersistentClient(path=CHROMA_PATH, settings=ChromaSettings())
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage = StorageContext.from_defaults(vector_store=vector_store)

    try:
        index = load_index_from_storage(storage, index_id=INDEX_ID)
    except Exception:
        index = VectorStoreIndex.from_documents([], storage_context=storage)
        index.set_index_id(INDEX_ID)

    to_update = [(u, m) for (u, m) in pairs if state.get(u) != m]
    to_delete = [u for u in state.keys() if u not in current_urls]

    print(f"Changed: {len(to_update)} | Deleted: {len(to_delete)}")

    if to_delete:
        for i in range(0, len(to_delete), 100):
            batch = to_delete[i : i + 100]
            collection.delete(where={"source_url": {"$in": batch}})

    pipeline = DocumentPipeline()
    processed_count = 0

    for url, lastmod in to_update:
        collection.delete(where={"source_url": url})
        text = fetch_text(url)
        raw_doc = Document(text=text, metadata={"source_url": url}, doc_id=url)
        chunks = pipeline.run([raw_doc])
        if not chunks:
            print(f"Warning: Document pipeline produced no chunks for {url}")
            continue
        for chunk in chunks:
            index.insert(chunk)
            processed_count += 1
        state[url] = lastmod
        time.sleep(0.1)

    for url in to_delete:
        state.pop(url, None)

    storage.persist(persist_dir=PERSIST_DIR)
    save_state(state)
    print(f"Incremental upsert complete. Processed chunks: {processed_count}")


if __name__ == "__main__":
    main()
