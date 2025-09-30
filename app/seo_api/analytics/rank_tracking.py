from __future__ import annotations
import csv
import math
import os
import datetime as dt
from dataclasses import dataclass
from typing import List

DATA_DIR = os.environ.get("SEO_DATA_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "seo")))
HISTORY_CSV = os.path.abspath(os.path.join(DATA_DIR, "rank_history.csv"))


@dataclass
class RankPoint:
    date: dt.date
    keyword: str
    rank: int


def ensure_storage() -> None:
    os.makedirs(os.path.dirname(HISTORY_CSV), exist_ok=True)
    if not os.path.exists(HISTORY_CSV):
        with open(HISTORY_CSV, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["date", "keyword", "rank"])


def append_daily_rank(keyword: str, rank: int, date: dt.date | None = None) -> None:
    ensure_storage()
    d = (date or dt.date.today()).isoformat()
    with open(HISTORY_CSV, "a", newline="") as f:
        w = csv.writer(f)
        w.writerow([d, keyword, int(rank)])


def read_rank_series(keyword: str, lookback_days: int | None = None) -> List[RankPoint]:
    ensure_storage()
    rows: List[RankPoint] = []
    with open(HISTORY_CSV, "r", newline="") as f:
        r = csv.DictReader(f)
        for row in r:
            if row["keyword"] != keyword:
                continue
            rows.append(
                RankPoint(
                    date=dt.date.fromisoformat(row["date"]),
                    keyword=row["keyword"],
                    rank=int(row["rank"]),
                )
            )
    rows.sort(key=lambda rp: rp.date)
    if lookback_days is not None and rows:
        cutoff = rows[-1].date - dt.timedelta(days=lookback_days - 1)
        rows = [rp for rp in rows if rp.date >= cutoff]
    return rows


def compute_volatility_index(keyword: str, window_days: int = 14) -> float:
    series = read_rank_series(keyword, lookback_days=window_days)
    if len(series) < 2:
        return 0.0
    deltas: List[float] = []
    for i in range(1, len(series)):
        prev = series[i - 1].rank
        curr = series[i].rank
        if prev <= 0:
            continue
        change = (curr - prev) / prev
        deltas.append(change)
    if not deltas:
        return 0.0
    mean = sum(deltas) / len(deltas)
    var = sum((x - mean) ** 2 for x in deltas) / max(1, (len(deltas) - 1))
    stdev = math.sqrt(var)
    normalized = min(stdev, 0.5) / 0.5 * 100.0
    return round(normalized, 2)
