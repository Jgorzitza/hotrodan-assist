import os, time
from typing import List
from itertools import islice
import requests
from bs4 import BeautifulSoup
import chromadb
from chromadb.config import Settings as ChromaSettings

from llama_index.core import VectorStoreIndex, Document, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
from rag_config import INDEX_ID, CHROMA_PATH, PERSIST_DIR, COLLECTION  # sets Settings globally

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
    for tag in soup(["script","style","noscript"]): tag.extract()
    return soup.get_text(" ", strip=True)

def load_urls(path="urls.txt") -> List[str]:
    with open(path, "r") as f:
        return [x.strip() for x in f if x.strip()]

def main():
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("Missing OPENAI_API_KEY in environment.")
    if not os.path.exists("urls.txt"):
        raise SystemExit("Missing urls.txt. Run discover_urls.py first.")

    urls = load_urls()
    print(f"Ingesting {len(urls)} URLs...")

    # Chroma persistent client + collection
    client = chromadb.PersistentClient(path=CHROMA_PATH, settings=ChromaSettings())
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    docs = []
    for chunk in batched(urls, n=25):
        for u in chunk:
            text = fetch_text(u)
            docs.append(Document(text=text, metadata={"source_url": u}, doc_id=u))
        time.sleep(0.5)

    index = VectorStoreIndex.from_documents(docs, storage_context=storage_context)
    index.set_index_id(INDEX_ID)
    index.storage_context.persist(persist_dir=PERSIST_DIR)
    print(f"Bootstrap complete. Docs: {len(docs)} | index_id={INDEX_ID}")

if __name__ == "__main__":
    main()
