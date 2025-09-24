import os, sys, re, pathlib, yaml, chromadb
from chromadb.config import Settings as ChromaSettings
from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from rag_config import INDEX_ID, CHROMA_PATH, PERSIST_DIR, COLLECTION
from router_config import ESCALATE_KEYWORDS, LEN_THRESHOLD

ESCALATE_CANDIDATES = ["gpt-5", "gpt-5-mini", "gpt-4.1"]

def pick_model(name: str, temperature=0.2):
    return OpenAI(model=name, temperature=temperature)

def choose_model(question: str):
    q = question.lower()
    long_q = len(q) >= LEN_THRESHOLD
    keyword_hit = any(k in q for k in ESCALATE_KEYWORDS)
    return pick_model(ESCALATE_CANDIDATES[0] if (long_q or keyword_hit) else "gpt-4o-mini")

# ---- corrections layer ----
def load_corrections(path="corrections/corrections.yaml"):
    p = pathlib.Path(path)
    if not p.exists(): return []
    data = yaml.safe_load(p.read_text()) or []
    for item in data:
        item["_compiled"] = [re.compile(pat, re.I) for pat in item.get("patterns", [])]
    return data

def correction_hit(question: str, corrections):
    q = question.lower()
    for item in corrections:
        for rx in item.get("_compiled", []):
            if rx.search(q):
                return item
    return None

# ---- dynamic context booster (signals) ----
def parse_signals(q: str):
    ql = q.lower()
    hp = None
    m = re.findall(r'(\d{2,4})\s*hp', ql)
    if m: hp = max(int(x) for x in m)
    else:
        nums = [int(x) for x in re.findall(r'\b(\d{2,4})\b', ql)]
        plausible = [n for n in nums if 60 <= n <= 1500 and "19" not in str(n)]
        if plausible: hp = max(plausible)
    fuel = "E85" if any(k in ql for k in ["e85", "ethanol", "flex fuel"]) else "pump gas"
    boosted = any(k in ql for k in ["boost", "turbo", "supercharg", "blower"])
    dual_tanks = any(k in ql for k in ["dual tank", "saddle tank", "selector valve", "tank switch"])
    returnless = any(k in ql for k in ["returnless", "corvette regulator", "in-rail regulator"])
    return {"hp": hp, "fuel": fuel, "boosted": boosted, "dual_tanks": dual_tanks, "returnless": returnless}

def dynamic_addendum(sig: dict) -> str:
    bits = []
    hp = sig["hp"]
    bits.append(f"Approx target horsepower: ~{hp} hp; include ~30% headroom." if hp else
                "If horsepower is unspecified, assume mild street build (~350–450 hp) and note headroom options.")
    bits.append(f"Fuel: {sig['fuel']}.")
    bits.append("Induction: boosted." if sig["boosted"] else "Induction: naturally aspirated.")
    if sig["dual_tanks"]: bits.append("Dual/selector-tank mentioned — address lift/merge or selector valve strategy.")
    if sig["returnless"]: bits.append("Customer mentioned returnless; compare with return-style and regulator placement.")
    bits.append("Always specify ≤10 μm EFI pressure-side filtration and PTFE-lined hose compatible with gasoline, diesel, E85, methanol, and other fuels.")
    bits.append("Line sizing: AN-6 to ~500 hp; AN-8 for ~500–800 hp/headroom; AN-10 for higher flow.")
    if sig["boosted"] or sig["fuel"] == "E85": bits.append("If boosted or E85, note higher flow needs and step pump/lines accordingly.")
    return " ".join(bits)

def main(question: str):
    # Corrections FIRST (no API)
    corrections = load_corrections()
    hit = correction_hit(question, corrections)
    if hit:
        print("\n[Model] override: corrections.yaml\n")
        print("=== ANSWER ===")
        print(hit["answer"].strip())
        print("\n=== SOURCES ===")
        for s in hit.get("sources", []): print("-", s)
        return

    if os.getenv("OFFLINE_CORRECTIONS_ONLY") == "1":
        print("\n[Model] offline-corrections-only (no RAG call)\n")
        print("=== ANSWER ===")
        print("No correction matched and offline mode is enabled. Add a corrections.yaml entry or run without OFFLINE_CORRECTIONS_ONLY.")
        print("\n=== SOURCES ===")
        return

    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("Missing OPENAI_API_KEY in environment.")

    llm = choose_model(question)
    Settings.llm = llm
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

    client = chromadb.PersistentClient(path=CHROMA_PATH, settings=ChromaSettings())
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage = StorageContext.from_defaults(vector_store=vector_store, persist_dir=PERSIST_DIR)
    index = load_index_from_storage(storage, index_id=INDEX_ID)

    system_hint = (
        "You are a Hot Rod AN tech specialist. Provide clear, platform-agnostic EFI fuel system recommendations "
        "for street/performance builds across many vehicles. Always cover: pump sizing (LPH vs target hp and fuel type), "
        "return vs returnless tradeoffs, regulator placement, required filtration (≤10 μm pressure-side), typical AN line sizes, "
        "and PTFE-lined hose compatibility for gasoline, diesel, E85, methanol, and other fuels. Keep it concise and practical."
    )

    sig = parse_signals(question)
    addendum = dynamic_addendum(sig)

    qe = index.as_query_engine(response_mode="compact", similarity_top_k=10, text_qa_template=None)
    resp = qe.query(system_hint + "\n\nCustomer signals: " + addendum + "\n\nQuestion: " + question)

    print(f"\n[Model] {llm.model}\n")
    print("=== ANSWER ===")
    print(resp)
    print("\n=== SOURCES ===")
    for n in getattr(resp, "source_nodes", []):
        print("-", n.metadata.get("source_url", "unknown"))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python query_chroma_router.py "your question here"')
        raise SystemExit(2)
    main(" ".join(sys.argv[1:]))
