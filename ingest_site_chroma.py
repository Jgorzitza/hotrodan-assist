import os
import time
from itertools import islice
from typing import List

import chromadb
import requests
from bs4 import BeautifulSoup
from chromadb.config import Settings as ChromaSettings

from llama_index.core import Document, StorageContext, VectorStoreIndex
from llama_index.vector_stores.chroma import ChromaVectorStore

from rag_pipeline import DocumentPipeline
from rag_config import (
    CHROMA_PATH,
    COLLECTION,
    INDEX_ID,
    PERSIST_DIR,
    configure_settings,
)


def batched(iterable, n=32):
    it = iter(iterable)
    while True:
        chunk = list(islice(it, n))
        if not chunk:
            return
        yield chunk


def shopify_headers():
    si = os.getenv("SHOPIFY_SIGNATURE_INPUT")
    s = os.getenv("SHOPIFY_SIGNATURE")
    sa = os.getenv("SHOPIFY_SIGNATURE_AGENT")
    headers = {"User-Agent": "HRAN-crawler/1.0"}
    if si and s and sa:
        headers.update({"Signature-Input": si, "Signature": s, "Signature-Agent": sa})
    return headers


def fetch_text(url: str) -> str:
    r = requests.get(url, headers=shopify_headers(), timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.extract()
    return soup.get_text(" ", strip=True)


def load_urls(path="urls.txt") -> List[str]:
    with open(path, "r") as f:
        return [x.strip() for x in f if x.strip()]


def main():
    mode = configure_settings()
    if mode != "openai":
        print("OPENAI_API_KEY missing; using FastEmbed fallback (retrieval-only mode).")
    if not os.path.exists("urls.txt"):
        raise SystemExit("Missing urls.txt. Run discover_urls.py first.")

    urls = load_urls()
    print(f"Ingesting {len(urls)} URLs...")

    client = chromadb.PersistentClient(path=CHROMA_PATH, settings=ChromaSettings())
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    pipeline = DocumentPipeline()
    processed_docs = []
    for chunk in batched(urls, n=25):
        batch_documents = []
        for u in chunk:
            text = fetch_text(u)
            batch_documents.append(Document(text=text, metadata={"source_url": u}, doc_id=u))
        chunked = pipeline.run(batch_documents)
        if not chunked:
            print(f"Warning: Document pipeline produced no chunks for batch with {len(batch_documents)} docs")
            continue
        processed_docs.extend(chunked)
        time.sleep(0.5)

    if not processed_docs:
        raise SystemExit("Document pipeline produced no chunks. Check source data.")

    print(
        f"Document pipeline: {len(urls)} URLs -> {len(processed_docs)} processed chunks"
    )

    index = VectorStoreIndex.from_documents(processed_docs, storage_context=storage_context)
    index.set_index_id(INDEX_ID)
    index.storage_context.persist(persist_dir=PERSIST_DIR)
    print(f"Bootstrap complete. Chunks: {len(processed_docs)} | index_id={INDEX_ID}")


if __name__ == "__main__":
    main()
