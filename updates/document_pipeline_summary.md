# Document Pipeline Enhancements

## Highlights
- Added `rag_pipeline` package with configurable `DocumentPipeline` supporting dedupe, TOC-aware splitting, and semantic chunking.
- Rewired ingestion scripts (`ingest.py`, `ingest_site.py`, `ingest_site_chroma.py`, `ingest_incremental_chroma.py`) to run the pipeline before indexing.
- Added targeted pipeline tests under `tests/rag/test_document_pipeline.py` (manual run documented due to pytest missing).
- Updated `README.md` to describe the new pipeline module.
- Logged progress in `coordination/inbox/rag/2025-09-29-notes.md` per policy.

## Manual Validation
- `python3 -m compileall rag_pipeline ingest.py ingest_site.py ingest_site_chroma.py ingest_incremental_chroma.py`
- `python3 - <<'PY' ...` (dedupe + chunking smoke tests)

Pytest not available globally; unit tests included but not executed (runner missing).
