import os, sys, chromadb
from chromadb.config import Settings as ChromaSettings
from llama_index.core import StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore
from rag_config import INDEX_ID, CHROMA_PATH, PERSIST_DIR, COLLECTION  # sets Settings globally

def main(question: str):
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("Missing OPENAI_API_KEY in environment.")

    client = chromadb.PersistentClient(path=CHROMA_PATH, settings=ChromaSettings())
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage = StorageContext.from_defaults(vector_store=vector_store, persist_dir=PERSIST_DIR)

    index = load_index_from_storage(storage, index_id=INDEX_ID)

    # Bias answers toward practical, parts-linked guidance for squarebody LS swaps
    system_hint = (
        "You are a Hot Rod AN tech specialist. Prioritize clear recommendations for 1973–87 squarebody LS swaps. "
        "Always include: pump size guidance (LPH vs horsepower), return vs returnless note, ≤10 μm EFI filtration, "
        "and typical AN line sizes. When relevant, reference Tanks Inc. EFI tanks and PTFE hose. Keep answers concise."
    )

    qe = index.as_query_engine(response_mode="compact", similarity_top_k=10, text_qa_template=None)
    resp = qe.query(system_hint + "\n\nQuestion: " + question)

    print("\n=== ANSWER ===")
    print(resp)
    print("\n=== SOURCES ===")
    for n in getattr(resp, "source_nodes", []):
        print("-", n.metadata.get("source_url", "unknown"))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python query_chroma.py "your question here"')
        raise SystemExit(2)
    main(" ".join(sys.argv[1:]))
