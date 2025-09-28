#!/usr/bin/env python3
"""Compare sitemap lastmod timestamps against ingest_state.json.

Usage:
  python scripts/check_ingest_staleness.py [--limit N]

Outputs a summary of URLs whose sitemap lastmod is newer than the
recorded ingest timestamp (or missing entirely from ingest_state). It also
surfaces URLs that were ingested but no longer appear in the sitemap.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
URLS_TSV = ROOT / 'urls_with_lastmod.tsv'
INGEST_STATE = ROOT / 'ingest_state.json'


def parse_lastmod(raw: str) -> datetime | None:
    raw = raw.strip()
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def load_urls() -> Dict[str, datetime | None]:
    data: Dict[str, datetime | None] = {}
    if not URLS_TSV.exists():
        raise FileNotFoundError(f'missing {URLS_TSV}')
    for line in URLS_TSV.read_text().splitlines():
        if not line.strip():
            continue
        url, *rest = line.split('\t')
        lastmod_raw = rest[0] if rest else ''
        data[url] = parse_lastmod(lastmod_raw)
    return data


def load_ingest_state() -> Dict[str, datetime | None]:
    if not INGEST_STATE.exists():
        raise FileNotFoundError(f'missing {INGEST_STATE}')
    state_raw = json.loads(INGEST_STATE.read_text())
    parsed: Dict[str, datetime | None] = {}
    for url, ts in state_raw.items():
        parsed[url] = parse_lastmod(ts or '')
    return parsed


def compute_stale(limit: int | None = None) -> Tuple[List[Tuple[str, datetime | None, datetime | None]], int]:
    sitemap = load_urls()
    ingest = load_ingest_state()
    stale: List[Tuple[str, datetime | None, datetime | None]] = []
    for url, lastmod in sitemap.items():
        ingested = ingest.get(url)
        if ingested is None or (lastmod and ingested and lastmod > ingested):
            stale.append((url, lastmod, ingested))
    stale.sort(key=lambda x: (x[1] or datetime.min), reverse=True)
    total = len(stale)
    if limit is not None:
        stale = stale[:limit]
    return stale, total


def compute_orphans(limit: int | None = None) -> Tuple[List[Tuple[str, datetime | None]], int]:
    sitemap = load_urls()
    ingest = load_ingest_state()
    orphans = [(url, ts) for url, ts in ingest.items() if url not in sitemap]
    orphans.sort(key=lambda x: (x[1] or datetime.min), reverse=True)
    total = len(orphans)
    if limit is not None:
        orphans = orphans[:limit]
    return orphans, total


def main() -> None:
    parser = argparse.ArgumentParser(description='Check ingest freshness vs sitemap lastmod.')
    parser.add_argument('--limit', type=int, default=10, help='Limit number of rows shown (default: 10)')
    args = parser.parse_args()

    stale, total_stale = compute_stale(args.limit)
    orphans, total_orphans = compute_orphans(args.limit)

    print(f'Stale or missing entries: {total_stale}')
    if stale:
        print('\nTop stale URLs:')
        for url, lastmod, ingested in stale:
            lastmod_str = lastmod.isoformat() if lastmod else 'unknown'
            ingested_str = ingested.isoformat() if ingested else 'missing'
            print(f'- {url}\n    sitemap:  {lastmod_str}\n    ingested: {ingested_str}')
    else:
        print('No sitemap entries are newer than ingest_state.')

    if total_orphans:
        print(f'\nIngested but missing from sitemap: {total_orphans}')
        for url, ts in orphans:
            ts_str = ts.isoformat() if ts else 'unknown'
            print(f'- {url}\n    ingested: {ts_str}')
    else:
        print('\nNo orphans detected (ingest_state matches sitemap set).')


if __name__ == '__main__':
    main()
