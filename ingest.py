import os, sys
from typing import List
from llama_index.core import Settings, VectorStoreIndex, Document
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.readers.web import SimpleWebPageReader

INDEX_ID = "hotrodan"

def main(urls: List[str]):
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("Missing OPENAI_API_KEY in environment.")

    Settings.llm = OpenAI(model="gpt-4o-mini")
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
    Settings.node_parser = SentenceSplitter(chunk_size=1024, chunk_overlap=100)

    print(f"Ingesting {len(urls)} URL(s)...")
    docs = SimpleWebPageReader(html_to_text=True).load_data(urls)

    tagged_docs = []
    for d in docs:
        md = dict(d.metadata or {})
        md["source_url"] = md.get("url", "unknown")
        tagged_docs.append(Document(text=d.text, metadata=md))

    index = VectorStoreIndex.from_documents(tagged_docs)
    index.set_index_id(INDEX_ID)
    # IMPORTANT: persist the *index's* storage context
    index.storage_context.persist(persist_dir="storage")
    print("Done. Index persisted to ./storage with index_id:", INDEX_ID)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <url1> [url2 ...]")
        raise SystemExit(2)
    main(sys.argv[1:])
