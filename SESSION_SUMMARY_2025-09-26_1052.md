# Session Summary

## What we did
- Wired up Shopify CLI; dev preview is running.
- Clarified webhook testing flow; localhost vs https tunnel.
- Decided to keep Codex brief in `prompts/` inside app root.
- Introduced app scaffolding for embedded Remix “Dashboard”.

## Current state
- On branch `feature/dashboard-setup`.
- New untracked app files present (dashboard/, prompts/, shopify.app.toml, package.json, etc.).
- Receiver on :3000 not running yet (curl failed) — next to start it and re-trigger webhook.

## Immediate focus
1) Keep the webhook receiver running on `http://localhost:3000` and re-test with `shopify app webhook trigger` after config changes.
2) Land the UI route skeletons with mock loaders for `/`, `/sales`, `/orders`, `/inbox`, `/inventory`, `/seo` and run lint/tests before handoff.
3) Freeze contracts under `app/lib/contracts/*` so adapters continue in parallel without schema churn.

## 2025-09-26 RAG Refresh
- `.venv/bin/python discover_urls.py` refreshed sitemap inputs (133 URLs after filters).
- `.venv/bin/python ingest_incremental_chroma.py` completed in FastEmbed fallback (OpenAI key absent); `ingest_state.json` now reflects 2025-09-26 crawl.
- `.venv/bin/python run_goldens.py` passing (correction paths exercised; FastEmbed cache warmed at `/tmp/fastembed_cache`).

## 2025-09-26 RAG Spot Check (PM)
- Compared `urls_with_lastmod.tsv` vs `ingest_state.json`; no deltas so incremental ingest skipped.
- `.venv/bin/python run_goldens.py` ✅ (2/2); output unchanged from morning pass.
- `.venv/bin/python query_chroma_router.py "Need fueling guidance for 600 hp LS swap on E85"` hit retrieval-only mode and cited latest guides/products correctly.

## Follow-ups
1) Expand `corrections/corrections.yaml` beyond the current EFI micron/returnless coverage (target dual-tank, surge, and vapor management FAQs).
2) Add matching golden cases for each new correction so regressions surface offline.
3) Monitor Shopify sitemap timestamps; rerun `discover_urls.py` + incremental ingest on the next >2025-09-26 delta.
