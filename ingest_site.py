import os, time
from typing import List
from itertools import islice
import requests
from bs4 import BeautifulSoup

from llama_index.core import Settings, VectorStoreIndex, Document
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

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

    all_docs = []
    for chunk in batched(all_urls, n=25):
        all_docs.extend(fetch_docs(chunk))
        time.sleep(0.5)  # polite throttle

    index = VectorStoreIndex.from_documents(all_docs)
    index.set_index_id(INDEX_ID)
    index.storage_context.persist(persist_dir="storage")
    print(f"Done. Persisted {len(all_docs)} docs to ./storage with index_id={INDEX_ID}")

if __name__ == "__main__":
    main()
