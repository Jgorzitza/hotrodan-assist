SHELL := /bin/bash
REPO := $(shell pwd)

.PHONY: health ready goldens live-check smoke ingest

health:
	@curl -sS http://localhost:8001/health || true

ready:
	@curl -sS http://localhost:8001/ready || true

goldens:
	@python3 run_goldens.py || true

live-check:
	@python3 scripts/live_check.py || true

smoke:
	@bash scripts/smoke.sh || true

ingest:
	@python3 ingest_incremental_chroma.py || true
