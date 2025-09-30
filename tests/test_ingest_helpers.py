"""Unit tests for helper utilities in sync ingest modules."""
from __future__ import annotations

import os
from datetime import datetime, timezone

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

from sync import shopify_ingest, zoho_ingest


def test_parse_ts_handles_millis():
    value = 1727356800000
    ts = zoho_ingest._parse_ts(value)
    assert ts == datetime.utcfromtimestamp(value / 1000)


def test_parse_ts_handles_iso():
    ts = zoho_ingest._parse_ts("2024-09-26T15:30:00Z")
    assert ts == datetime(2024, 9, 26, 15, 30, tzinfo=timezone.utc)


def test_extract_addresses_filters_garbage():
    addresses = shopify_ingest._extract_addresses([
        {"first_name": "Jane", "last_name": "Doe", "address1": "123", "city": "Boise", "default": True},
        "not-a-dict",
    ])
    assert len(addresses) == 1
    assert addresses[0]["name"] == "Jane Doe"


def test_safe_money_handles_strings():
    assert shopify_ingest._safe_money("12.34", "USD") == 1234


def test_extract_tracking_flattens_lists():
    tracking = shopify_ingest._extract_tracking([
        {"tracking_numbers": ["1", "2"]},
        {"tracking_numbers": []},
        "bad",
    ])
    assert tracking == ["1", "2"]
