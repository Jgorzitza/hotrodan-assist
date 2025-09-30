import os
import time
from itertools import islice
from typing import List

import requests
from bs4 import BeautifulSoup

from llama_index.core import Document, Settings, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI

from rag_pipeline import DocumentPipeline

INDEX_ID = "hotrodan"


def batched(iterable, n=32):
    it = iter(iterable)
    while True:
        chunk = list(islice(it, n))
        if not chunk:
            return
        yield chunk


def load_urls(path="urls.txt"):
    if not os.path.exists(path):
        raise SystemExit("Missing urls.txt. Run discover_urls.py first.")
    with open(path, "r") as f:
        return [line.strip() for line in f if line.strip()]


def shopify_headers():
    si = os.getenv("SHOPIFY_SIGNATURE_INPUT")
    s = os.getenv("SHOPIFY_SIGNATURE")
    sa = os.getenv("SHOPIFY_SIGNATURE_AGENT")
    headers = {"User-Agent": "HRAN-crawler/1.0"}
    if si and s and sa:
        headers.update({
            "Signature-Input": si,
            "Signature": s,
            "Signature-Agent": sa,
        })
    return headers


def fetch_text(url: str) -> str:
    r = requests.get(url, headers=shopify_headers(), timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.extract()
    return soup.get_text(" ", strip=True)


def fetch_docs(urls: List[str]) -> List[Document]:
    docs = []
    for u in urls:
        txt = fetch_text(u)
        docs.append(Document(text=txt, metadata={"source_url": u}))
    return docs


def main():
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("Missing OPENAI_API_KEY in environment.")

    Settings.llm = OpenAI(model="gpt-4o-mini")
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
    Settings.node_parser = SentenceSplitter(chunk_size=1200, chunk_overlap=120)

    all_urls = load_urls()
    print(f"Ingesting {len(all_urls)} URLs...")

    pipeline = DocumentPipeline()
    all_docs = []
    for chunk in batched(all_urls, n=25):
        docs = fetch_docs(chunk)
        processed = pipeline.run(docs)
        if not processed:
            print(f"Warning: Document pipeline produced no chunks for batch of size {len(docs)}")
            continue
        all_docs.extend(processed)
        time.sleep(0.5)  # polite throttle

    if not all_docs:
        raise SystemExit("Document pipeline produced no chunks. Check source data.")

    print(
        f"Document pipeline: {len(all_urls)} URLs -> {len(all_docs)} processed chunks"
    )

    index = VectorStoreIndex.from_documents(all_docs)
    index.set_index_id(INDEX_ID)
    index.storage_context.persist(persist_dir="storage")
    print(f"Done. Persisted {len(all_docs)} chunks to ./storage with index_id={INDEX_ID}")


if __name__ == "__main__":
    main()
