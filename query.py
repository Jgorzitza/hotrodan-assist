import os, sys
from llama_index.core import Settings, load_index_from_storage
from llama_index.core.storage import StorageContext
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

INDEX_ID = "hotrodan"

def main(question: str):
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("Missing OPENAI_API_KEY in environment.")

    Settings.llm = OpenAI(model="gpt-4o-mini")
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

    storage_context = StorageContext.from_defaults(persist_dir="storage")
    index = load_index_from_storage(storage_context, index_id=INDEX_ID)

    qe = index.as_query_engine(response_mode="compact", similarity_top_k=10)
    resp = qe.query(question)

    print("\n=== ANSWER ===")
    print(resp)
    print("\n=== SOURCES ===")
    for n in getattr(resp, "source_nodes", []):
        url = n.metadata.get("source_url") or n.metadata.get("url") or "unknown"
        print(f"- {url}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python query.py \"your question here\"")
        raise SystemExit(2)
    main(" ".join(sys.argv[1:]))
