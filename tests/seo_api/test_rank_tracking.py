import os, datetime as dt, importlib.util
from pathlib import Path

MODULE_PATH = Path("app/seo-api/analytics/rank_tracking.py").resolve()
spec = importlib.util.spec_from_file_location("rank_tracking", str(MODULE_PATH))
rt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rt)  # type: ignore


def setup_function(_):
    os.environ["SEO_DATA_DIR"] = os.path.abspath("tmp_test_data")
    rt.ensure_storage()


def teardown_function(_):
    base = os.environ.get("SEO_DATA_DIR")
    if base and os.path.isdir(base):
        import shutil
        shutil.rmtree(base, ignore_errors=True)
    os.environ.pop("SEO_DATA_DIR", None)


def test_append_and_read_series():
    k = "test-keyword"
    rt.append_daily_rank(k, 20, dt.date(2025, 9, 1))
    rt.append_daily_rank(k, 18, dt.date(2025, 9, 2))
    rt.append_daily_rank(k, 15, dt.date(2025, 9, 3))
    series = rt.read_rank_series(k)
    assert [p.rank for p in series] == [20, 18, 15]


def test_volatility_low_changes():
    k = "stable-keyword"
    ranks = [20, 20, 19, 20, 21, 20, 20]
    start = dt.date(2025, 9, 1)
    for i, r in enumerate(ranks):
        rt.append_daily_rank(k, r, start + dt.timedelta(days=i))
    vi = rt.compute_volatility_index(k, window_days=30)
    assert 0 <= vi <= 30


def test_volatility_high_changes():
    k = "wild-keyword"
    ranks = [10, 20, 10, 25, 8, 30, 5]
    start = dt.date(2025, 9, 1)
    for i, r in enumerate(ranks):
        rt.append_daily_rank(k, r, start + dt.timedelta(days=i))
    vi = rt.compute_volatility_index(k, window_days=30)
    assert vi >= 60
