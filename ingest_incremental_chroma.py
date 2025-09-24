import os, json, time
from typing import Dict, List, Tuple
import chromadb
from chromadb.config import Settings as ChromaSettings
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
    if os.path.exists(STATE_FILE):
        return json.load(open(STATE_FILE))
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

def fetch_text(url: str) -> str:
    r = requests.get(url, headers=shopify_headers(), timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script","style","noscript"]): tag.extract()
    return soup.get_text(" ", strip=True)

def main():
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("Missing OPENAI_API_KEY in environment.")
    if not os.path.exists("urls_with_lastmod.tsv"):
        raise SystemExit("Run discover_urls.py first to build urls_with_lastmod.tsv")

    pairs = read_urls_with_lastmod()
    current_urls = {u for (u, _) in pairs}
    state = load_state()

    # Chroma + index load / create
    client = chromadb.PersistentClient(path=CHROMA_PATH, settings=ChromaSettings())
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
    for u, _m in to_update:
        collection.delete(where={"source_url": u})
        text = fetch_text(u)
        doc = Document(text=text, metadata={"source_url": u}, doc_id=u)
        # insert via index (honors current Settings + chunking)
        index.insert_documents([doc])
        time.sleep(0.1)

    # Persist non-vector parts (index_store/docstore)
    storage.persist(persist_dir=PERSIST_DIR)

    # Update state
    for u, m in to_update:
        state[u] = m
    for u in to_delete:
        state.pop(u, None)
    save_state(state)
    print("Incremental upsert complete.")

if __name__ == "__main__":
    main()
