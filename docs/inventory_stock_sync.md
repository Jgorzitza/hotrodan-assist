# Multi-location Stock Sync Strategy

This document describes the conflict resolution strategy for synchronizing inventory levels across multiple locations and sources.

## Goals
- Deterministic merges across sources (Shopify, WMS, POS, Manual)
- Minimize stockout risk while preserving data integrity
- Full auditability via merge decisions log

## Conflict Resolution (in order)
1. Newer timestamp wins
2. If timestamps tie or missing, higher source priority wins
3. If still tied, prefer greater available to reduce stockouts

## Source Priorities (default)
- wms: 80
- pos: 60
- shopify: 50
- manual: 40

## Usage
```python
from sync.stock_sync import MultiLocationStockSync
engine = MultiLocationStockSync()
merged_state, decisions = engine.merge(current_state, updates)
```

- `current_state`: mapping of `sku -> { locations: { location_id -> {available, updated_at, source, metadata} } }`
- `updates`: list of updates with fields: `sku`, `location_id`, `available`, `updated_at`, `source`, `metadata?`

## Outputs
- `merged_state`: normalized state after applying conflict resolution
- `decisions`: per-update decision records (reason codes: newer-timestamp, higher-priority-source, greater-available-tiebreak, no-change)
- `summary`: counts per reason

## Testing
Run unit tests:
```bash
. .venv/bin/activate
python -m pytest -q test_stock_sync.py
```

## Notes
- All timestamps are treated as ISO8601; `Z` is accepted and normalized.
- Extend `SourcePriority` list to customize trust levels per deployment.
