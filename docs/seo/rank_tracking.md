# Rank Tracking and Volatility Index

Provides daily keyword rank logging and a volatility index from day-over-day changes.

## Usage

```bash
export SEO_DATA_DIR=./data/seo
python - <<"PY"
import os, importlib.util
from pathlib import Path
os.environ["SEO_DATA_DIR"] = os.path.abspath("./data/seo")
MODULE_PATH = Path("app/seo-api/analytics/rank_tracking.py").resolve()
spec = importlib.util.spec_from_file_location("rank_tracking", str(MODULE_PATH))
rt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rt)
rt.append_daily_rank("my kw", 18)
print(rt.compute_volatility_index("my kw"))
PY
```

## API
- append_daily_rank(keyword: str, rank: int, date: date|None) -> None
- read_rank_series(keyword: str, lookback_days: int|None) -> List[RankPoint]
- compute_volatility_index(keyword: str, window_days: int = 14) -> float
