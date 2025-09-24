<<<<<<< HEAD
# hotrodan-assist
=======
# Hot Rod AN — RAG + Omnichannel Assistants

Start here: see **HANDOVER.md** for full specs, milestones, and service layout.

## Quickstart (local)
pip install -U llama-index openai "chromadb>=0.5" llama-index-vector-stores-chroma \
               llama-index-readers-web llama-index-readers-file
cp .env.example .env
python discover_urls.py
python ingest_site_chroma.py
python query_chroma_router.py "EFI swap ~400 hp; pump LPH, 10 micron, AN sizes?"

## Tests
python run_goldens.py  # offline corrections-only; no API calls

## Repo highlights
- RAG core: LlamaIndex + Chroma (see scripts in root)
- Corrections layer: corrections/corrections.yaml
- Golden tests: goldens/qa.yaml, run_goldens.py
- Handover spec: HANDOVER.md
>>>>>>> c11eefd (Initial handover bundle)
