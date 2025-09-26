import os, chromadb
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.readers.web import SimpleWebPageReader

INDEX_ID    = os.getenv("INDEX_ID", "hotrodan")
CHROMA_PATH = os.getenv("CHROMA_PATH", "./data/chroma")
PERSIST_DIR = os.getenv("PERSIST_DIR", "./data/storage")
COLLECTION  = os.getenv("COLLECTION", "hotrodan_docs")

Settings.llm = OpenAI(model="gpt-4o-mini", temperature=0.2)
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
Settings.chunk_size = 1500
Settings.chunk_overlap = 150

# URLs
with open("urls.txt") as f:
    urls = [u.strip() for u in f if u.strip()]

docs = SimpleWebPageReader(html_to_text=True, timeout=25).load_data(urls)

# Chroma collection
client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
vector_store = ChromaVectorStore(chroma_collection=collection)

# IMPORTANT: do NOT pass persist_dir here (it would try to load a non-existent index_store.json)
storage = StorageContext.from_defaults(vector_store=vector_store)

index = VectorStoreIndex.from_documents(
    docs,
    storage_context=storage,
    index_id=INDEX_ID,
    show_progress=True
)

# Now persist everything to disk
index.storage_context.persist(persist_dir=PERSIST_DIR)
print(f"Reingest complete. index_id={INDEX_ID} -> {PERSIST_DIR}")
