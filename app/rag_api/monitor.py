"""Basic performance monitoring for RAG API."""

import time
import json
import os
from datetime import datetime
from typing import Dict, Any
from functools import wraps

# Simple in-memory metrics storage
metrics = {
    "query_count": 0,
    "total_response_time": 0.0,
    "avg_response_time": 0.0,
    "error_count": 0,
    "last_query_time": None,
    "queries_by_hour": {},
    "response_times": [],
}


def track_performance(func):
    """Decorator to track API performance metrics."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            response_time = time.time() - start_time

            # Update metrics
            metrics["query_count"] += 1
            metrics["total_response_time"] += response_time
            metrics["avg_response_time"] = (
                metrics["total_response_time"] / metrics["query_count"]
            )
            metrics["last_query_time"] = datetime.now().isoformat()
            metrics["response_times"].append(response_time)

            # Keep only last 100 response times
            if len(metrics["response_times"]) > 100:
                metrics["response_times"] = metrics["response_times"][-100:]

            # Track queries by hour
            hour = datetime.now().strftime("%Y-%m-%d %H:00")
            metrics["queries_by_hour"][hour] = (
                metrics["queries_by_hour"].get(hour, 0) + 1
            )

            return result
        except Exception:
            metrics["error_count"] += 1
            raise

    return wrapper


def get_metrics() -> Dict[str, Any]:
    """Get current performance metrics."""
    return {
        "query_count": metrics["query_count"],
        "avg_response_time_ms": round(metrics["avg_response_time"] * 1000, 2),
        "error_count": metrics["error_count"],
        "error_rate": round(
            metrics["error_count"] / max(metrics["query_count"], 1) * 100, 2
        ),
        "last_query_time": metrics["last_query_time"],
        "queries_by_hour": dict(list(metrics["queries_by_hour"].items())[-24:]),
        "recent_response_times_ms": [
            round(t * 1000, 2) for t in metrics["response_times"][-10:]
        ],
    }


def save_metrics():
    """Save metrics to file for persistence."""
    metrics_file = "/app/metrics.json"
    try:
        with open(metrics_file, "w") as f:
            json.dump(metrics, f, indent=2)
    except Exception:
        pass
