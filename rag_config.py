from llama_index.core import Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

# Fast + inexpensive defaults
Settings.llm = OpenAI(model="gpt-4o-mini")
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
Settings.node_parser = SentenceSplitter(chunk_size=1500, chunk_overlap=150)

INDEX_ID = "hotrodan"
CHROMA_PATH = "chroma"     # vector store persistence
PERSIST_DIR = "storage"    # index/docstore persistence
COLLECTION = "hotrodan"    # chroma collection name
