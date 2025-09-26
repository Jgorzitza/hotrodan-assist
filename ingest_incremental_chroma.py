import os, json, time
from typing import Dict, List, Tuple, Optional
import chromadb
from chromadb.api import ClientAPI
from chromadb.config import Settings as ChromaSettings
from chromadb.errors import ChromaError
from bs4 import BeautifulSoup
import requests

from llama_index.core import StorageContext, VectorStoreIndex, Document, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore
from rag_config import INDEX_ID, CHROMA_PATH, PERSIST_DIR, COLLECTION  # sets Settings globally

STATE_FILE = "ingest_state.json"

def read_urls_with_lastmod(path="urls_with_lastmod.tsv") -> List[Tuple[str,str]]:
    pairs = []
    with open(path,"r") as f:
        for line in f:
            if "\t" in line:
                u, m = line.strip().split("\t", 1)
                pairs.append((u, m))
    return pairs

def load_state() -> Dict[str,str]:
    if not os.path.exists(STATE_FILE):
        return {}
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as err:
        print(f"[WARN] Could not read {STATE_FILE}: {err}. Rebuilding from scratch.")
        return {}

def save_state(d: Dict[str,str]):
    with open(STATE_FILE,"w") as f:
        json.dump(d, f, indent=2, sort_keys=True)

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


def main():
    if not os.path.exists("urls_with_lastmod.tsv"):
        raise SystemExit("Run discover_urls.py first to build urls_with_lastmod.tsv")

    pairs = read_urls_with_lastmod()
    current_urls = {u for (u, _) in pairs}
    state = load_state()

    # Chroma + index load / create
    client, ephemeral = init_chroma_client()
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage = StorageContext.from_defaults(vector_store=vector_store)

    try:
        index = load_index_from_storage(storage, index_id=INDEX_ID)
    except Exception:
        index = VectorStoreIndex.from_documents([], storage_context=storage)
        index.set_index_id(INDEX_ID)

    # Determine changes
    to_update = [(u,m) for (u,m) in pairs if state.get(u) != m]
    to_delete = [u for u in state.keys() if u not in current_urls]

    print(f"Changed: {len(to_update)} | Deleted: {len(to_delete)}")

    # Delete removed URLs from Chroma (by metadata filter)
    # chroma supports metadata-based delete; LlamaIndex wrapper exposes collection
    if to_delete:
        # delete where source_url in to_delete (do in chunks)
        for i in range(0, len(to_delete), 100):
            batch = to_delete[i:i+100]
            collection.delete(where={"source_url": {"$in": batch}})

    # For changed URLs: delete old vectors for that URL, then upsert fresh content
    refreshed = []
    skipped = []
    for u, m in to_update:
        text = fetch_text(u)
        if not text:
            skipped.append(u)
            continue
        collection.delete(where={"source_url": u})
        doc = Document(text=text, metadata={"source_url": u}, doc_id=u)
        # insert via index (honors current Settings + chunking)
        index.insert_documents([doc])
        refreshed.append((u, m))
        time.sleep(0.1)

    # Persist non-vector parts (index_store/docstore)
    storage.persist(persist_dir=PERSIST_DIR)

    # Update state
    for u, m in refreshed:
        state[u] = m
    for u in to_delete:
        state.pop(u, None)
    save_state(state)

    summary = []
    if refreshed:
        summary.append(f"updated {len(refreshed)}")
    if skipped:
        summary.append(f"skipped {len(skipped)}")
    if to_delete:
        summary.append(f"deleted {len(to_delete)}")
    persistence_hint = " (non-persistent run)" if ephemeral else ""
    print("Incremental upsert complete." + (" (" + ", ".join(summary) + ")" if summary else "") + persistence_hint)
    if skipped:
        print("Retry needed for:")
        for u in skipped:
            print("-", u)

if __name__ == "__main__":
    main()
