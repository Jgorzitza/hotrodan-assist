from datetime import datetime, timedelta
from sync.stock_sync import MultiLocationStockSync, SkuStockState, LocationStock, SourcePriority

def make_iso(dt):
    return dt.replace(microsecond=0).isoformat() + "Z"

def test_merge_prefers_newer_timestamp():
    engine = MultiLocationStockSync()
    now = datetime.utcnow()
    current = {
        "SKU-1": SkuStockState(
            sku="SKU-1",
            locations={
                "LOC-A": LocationStock(location_id="LOC-A", available=5, updated_at=make_iso(now - timedelta(minutes=5)), source="shopify")
            },
        )
    }
    updates = [{"sku": "SKU-1", "location_id": "LOC-A", "available": 7, "updated_at": make_iso(now), "source": "shopify"}]
    merged, decisions = engine.merge(current, updates)
    assert merged["SKU-1"].locations["LOC-A"].available == 7
    assert any(d.reason == "newer-timestamp" for d in decisions)

def test_merge_uses_source_priority_on_equal_timestamps():
    engine = MultiLocationStockSync(source_priorities=[SourcePriority(name="shopify", priority=50), SourcePriority(name="wms", priority=80)])
    ts = make_iso(datetime.utcnow())
    current = {
        "SKU-2": SkuStockState(
            sku="SKU-2",
            locations={
                "LOC-A": LocationStock(location_id="LOC-A", available=3, updated_at=ts, source="shopify")
            },
        )
    }
    updates = [{"sku": "SKU-2", "location_id": "LOC-A", "available": 4, "updated_at": ts, "source": "wms"}]
    merged, decisions = engine.merge(current, updates)
    assert merged["SKU-2"].locations["LOC-A"].available == 4
    assert any(d.reason == "higher-priority-source" for d in decisions)

def test_merge_tiebreak_greater_available():
    engine = MultiLocationStockSync()
    ts = make_iso(datetime.utcnow())
    current = {
        "SKU-3": SkuStockState(
            sku="SKU-3",
            locations={
                "LOC-X": LocationStock(location_id="LOC-X", available=1, updated_at=ts, source="shopify")
            },
        )
    }
    updates = [{"sku": "SKU-3", "location_id": "LOC-X", "available": 2, "updated_at": ts, "source": "shopify"}]
    merged, decisions = engine.merge(current, updates)
    assert merged["SKU-3"].locations["LOC-X"].available == 2
    assert any(d.reason == "greater-available-tiebreak" for d in decisions)

def test_merge_adds_new_location_and_new_sku():
    engine = MultiLocationStockSync()
    now = datetime.utcnow()
    current = {}
    updates = [{"sku": "SKU-NEW", "location_id": "LOC-NEW", "available": 10, "updated_at": make_iso(now), "source": "pos", "metadata": {"note": "initial"}}]
    merged, decisions = engine.merge(current, updates)
    assert "SKU-NEW" in merged
    assert "LOC-NEW" in merged["SKU-NEW"].locations
    assert merged["SKU-NEW"].locations["LOC-NEW"].available == 10
    assert any(d.reason == "no-current" for d in decisions)

def test_serialize_and_summary():
    engine = MultiLocationStockSync()
    now = datetime.utcnow()
    current = {}
    updates = [
        {"sku": "SKU-X", "location_id": "A", "available": 1, "updated_at": make_iso(now), "source": "shopify"},
        {"sku": "SKU-X", "location_id": "A", "available": 2, "updated_at": make_iso(now), "source": "shopify"},
    ]
    merged, decisions = engine.merge(current, updates)
    serialized = engine.serialize_state(merged)
    summary = engine.decisions_summary(decisions)
    assert serialized["SKU-X"]["locations"]["A"]["available"] == 2
    assert sum(summary.values()) == len(decisions)
