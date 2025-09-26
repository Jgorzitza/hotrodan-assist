import json, os, time
from typing import Dict, List, Optional
from itertools import islice
import requests
from bs4 import BeautifulSoup
import chromadb
from chromadb.api import ClientAPI
from chromadb.config import Settings as ChromaSettings
from chromadb.errors import ChromaError

from llama_index.core import VectorStoreIndex, Document, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
from rag_config import INDEX_ID, CHROMA_PATH, PERSIST_DIR, COLLECTION, USING_OPENAI  # sets Settings globally

STATE_FILE = "ingest_state.json"
LASTMOD_PATH = "urls_with_lastmod.tsv"


def load_lastmods(path: str = LASTMOD_PATH) -> Dict[str, str]:
    data = {}
    if not os.path.exists(path):
        return data
    with open(path, "r") as f:
        for line in f:
            if "	" in line:
                url, lastmod = line.strip().split("	", 1)
                data[url] = lastmod
    return data


def write_ingest_state(urls: List[str], lastmods: Dict[str, str]) -> None:
    if not urls:
        return
    state = {u: lastmods.get(u, "") for u in urls}
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2, sort_keys=True)
    print(f"Wrote {STATE_FILE} with {len(state)} entries.")


def init_chroma_client() -> tuple[ClientAPI, bool]:
    settings = ChromaSettings(anonymized_telemetry=False, allow_reset=True)
    try:
        client = chromadb.PersistentClient(path=CHROMA_PATH, settings=settings)
        return client, False
    except ChromaError as err:
        print(f"[WARN] Persistent Chroma unavailable ({err}); using EphemeralClient (non-persistent).")
    except Exception as err:  # pragma: no cover - defensive catch for unexpected failures
        print(f"[WARN] Persistent Chroma threw unexpected error ({err}); using EphemeralClient (non-persistent).")
    client = chromadb.EphemeralClient(settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True))
    return client, True


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

def fetch_text(url: str, retries: int = 2, backoff: float = 1.5) -> Optional[str]:
    last_err = None
    for attempt in range(retries + 1):
        try:
            r = requests.get(url, headers=shopify_headers(), timeout=30)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            for tag in soup(["script", "style", "noscript"]):
                tag.extract()
            return soup.get_text(" ", strip=True)
        except requests.RequestException as err:
            last_err = err
            wait = backoff * (attempt + 1)
            print(f"[WARN] fetch failed for {url} ({attempt + 1}/{retries + 1}): {err}")
            if attempt < retries:
                time.sleep(wait)
    print(f"[ERROR] giving up on {url}: {last_err}")
    return None

def load_urls(path="urls.txt") -> List[str]:
    with open(path, "r") as f:
        return [x.strip() for x in f if x.strip()]

def main():
    if not os.path.exists("urls.txt"):
        raise SystemExit("Missing urls.txt. Run discover_urls.py first.")

    urls = load_urls()
    mode = "OpenAI" if USING_OPENAI else "FastEmbed"
    print(f"Ingesting {len(urls)} URLs... (embedding mode: {mode})")

    # Chroma persistent client + collection
    client, ephemeral = init_chroma_client()
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    docs = []
    skipped = []
    for chunk in batched(urls, n=25):
        for u in chunk:
            text = fetch_text(u)
            if not text:
                skipped.append(u)
                continue
            docs.append(Document(text=text, metadata={"source_url": u}, doc_id=u))
        time.sleep(0.5)

    if not docs:
        raise SystemExit("No documents were ingested; aborting before persisting an empty index.")

    index = VectorStoreIndex.from_documents(docs, storage_context=storage_context)
    index.set_index_id(INDEX_ID)
    index.storage_context.persist(persist_dir=PERSIST_DIR)
    persistence_hint = "(non-persistent run)" if ephemeral else ""
    print(f"Bootstrap complete. Docs: {len(docs)} | index_id={INDEX_ID} {persistence_hint}")
    ingested_urls = [doc.metadata.get("source_url") for doc in docs]
    lastmods = load_lastmods()
    if os.path.exists(LASTMOD_PATH):
        write_ingest_state([u for u in ingested_urls if u], lastmods)
    else:
        print("No urls_with_lastmod.tsv found; skipping ingest_state.json update.")
    if skipped:
        print(f"Skipped {len(skipped)} URL(s) due to fetch errors. See warnings above.")

if __name__ == "__main__":
    main()
