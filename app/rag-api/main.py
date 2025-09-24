# FastAPI stub that wraps the existing query router.
from fastapi import FastAPI
from pydantic import BaseModel
import os, chromadb
from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

INDEX_ID=os.getenv("INDEX_ID","hotrodan")
CHROMA_PATH=os.getenv("CHROMA_PATH","/data/chroma")
PERSIST_DIR=os.getenv("PERSIST_DIR","/data/storage")
COLLECTION=os.getenv("COLLECTION","hotrodan_docs")

app = FastAPI()

class QueryIn(BaseModel):
    question: str
    top_k: int = 10

@app.on_event("startup")
def setup():
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
    Settings.llm = OpenAI(model="gpt-4o-mini", temperature=0.2)

@app.post("/query")
def query(q: QueryIn):
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage = StorageContext.from_defaults(vector_store=vector_store, persist_dir=PERSIST_DIR)
    index = load_index_from_storage(storage, index_id=INDEX_ID)

    system_hint = ("Retail EFI specialist. Cover pump sizing (LPH vs hp & fuel), "
                   "return vs returnless, regulator placement, ≤10 μm pressure-side filtration, "
                   "AN line sizes, PTFE-lined hose for gasoline/diesel/E85/methanol. Be concise.")
    qe = index.as_query_engine(response_mode="compact", similarity_top_k=q.top_k)
    resp = qe.query(system_hint + "\n\nQuestion: " + q.question)
    return {
        "answer": str(resp),
        "sources": [n.metadata.get("source_url","unknown") for n in getattr(resp,"source_nodes",[])],
    }
