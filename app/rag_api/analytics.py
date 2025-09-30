"""Enhanced analytics and query tracking for RAG API."""

import time
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict
from statistics import mean, median


class QueryAnalytics:
    """Advanced query analytics and tracking."""
    
    def __init__(self, storage_file: str = "/home/justin/llama_rag/app/rag_api/analytics.json"):
        self.storage_file = storage_file
        self.queries: List[Dict[str, Any]] = []
        self.provider_metrics: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "count": 0,
            "total_time": 0.0,
            "errors": 0,
            "avg_sources": 0.0,
            "total_sources": 0
        })
        self.hourly_queries: Dict[str, int] = defaultdict(int)
        self.quality_scores: List[float] = []
        self.load()
    
    def track_query(self, question: str, provider: str, response_time: float, 
                   sources_count: int, success: bool = True, error: Optional[str] = None):
        """Track a query execution."""
        query_data = {
            "timestamp": datetime.now().isoformat(),
            "question_length": len(question),
            "provider": provider,
            "response_time_ms": response_time * 1000,
            "sources_count": sources_count,
            "success": success,
            "error": error,
            "hour": datetime.now().strftime("%Y-%m-%d %H:00")
        }
        
        # Calculate quality score
        quality_score = self._calculate_quality_score(response_time, sources_count, success)
        query_data["quality_score"] = quality_score
        
        # Store query
        self.queries.append(query_data)
        
        # Update provider metrics
        pm = self.provider_metrics[provider]
        pm["count"] += 1
        pm["total_time"] += response_time
        if not success:
            pm["errors"] += 1
        pm["total_sources"] += sources_count
        pm["avg_sources"] = pm["total_sources"] / pm["count"]
        pm["avg_time_ms"] = (pm["total_time"] / pm["count"]) * 1000
        pm["error_rate"] = pm["errors"] / pm["count"]
        
        # Update hourly queries
        self.hourly_queries[query_data["hour"]] += 1
        
        # Track quality score
        self.quality_scores.append(quality_score)
        
        # Keep only last 1000 queries
        if len(self.queries) > 1000:
            self.queries = self.queries[-1000:]
        
        # Periodically save
        if len(self.queries) % 10 == 0:
            self.save()
    
    def _calculate_quality_score(self, response_time: float, sources_count: int, success: bool) -> float:
        """Calculate a quality score for the query (0-1)."""
        if not success:
            return 0.0
        
        # Components of quality:
        # - Speed: faster is better (target < 2s)
        # - Sources: more is better (target 5-10)
        
        speed_score = max(0, 1 - (response_time / 2.0))  # 1.0 if < 2s, 0.0 if >= 2s
        sources_score = min(sources_count / 10.0, 1.0)  # 1.0 if >= 10 sources
        
        # Weighted average
        quality = (speed_score * 0.6) + (sources_score * 0.4)
        return round(quality, 3)
    
    def get_provider_summary(self) -> Dict[str, Dict[str, Any]]:
        """Get summary metrics for each provider."""
        return dict(self.provider_metrics)
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get overall performance metrics."""
        if not self.queries:
            return {
                "total_queries": 0,
                "avg_response_time_ms": 0,
                "median_response_time_ms": 0,
                "success_rate": 0,
                "avg_quality_score": 0
            }
        
        response_times = [q["response_time_ms"] for q in self.queries]
        successes = sum(1 for q in self.queries if q["success"])
        
        return {
            "total_queries": len(self.queries),
            "avg_response_time_ms": round(mean(response_times), 2),
            "median_response_time_ms": round(median(response_times), 2),
            "p95_response_time_ms": round(sorted(response_times)[int(len(response_times) * 0.95)], 2) if response_times else 0,
            "success_rate": round(successes / len(self.queries), 3),
            "avg_quality_score": round(mean(self.quality_scores), 3) if self.quality_scores else 0,
            "median_quality_score": round(median(self.quality_scores), 3) if self.quality_scores else 0
        }
    
    def get_usage_patterns(self) -> Dict[str, Any]:
        """Get usage pattern analytics."""
        # Get queries in last 24 hours
        now = datetime.now()
        last_24h = now - timedelta(hours=24)
        recent_queries = [
            q for q in self.queries 
            if datetime.fromisoformat(q["timestamp"]) > last_24h
        ]
        
        # Peak hours analysis
        hourly_counts = defaultdict(int)
        for q in recent_queries:
            hour = datetime.fromisoformat(q["timestamp"]).hour
            hourly_counts[hour] += 1
        
        peak_hour = max(hourly_counts.items(), key=lambda x: x[1])[0] if hourly_counts else 0
        
        return {
            "queries_last_24h": len(recent_queries),
            "peak_hour": f"{peak_hour:02d}:00",
            "avg_queries_per_hour": round(len(recent_queries) / 24, 2),
            "hourly_distribution": dict(sorted(hourly_counts.items()))
        }
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive data for analytics dashboard."""
        return {
            "performance": self.get_performance_metrics(),
            "provider_metrics": self.get_provider_summary(),
            "usage_patterns": self.get_usage_patterns(),
            "recent_queries": self.queries[-20:] if self.queries else [],
            "quality_trend": self.quality_scores[-50:] if self.quality_scores else []
        }
    
    def save(self):
        """Save analytics data to file."""
        try:
            data = {
                "queries": self.queries,
                "provider_metrics": dict(self.provider_metrics),
                "hourly_queries": dict(self.hourly_queries),
                "quality_scores": self.quality_scores
            }
            with open(self.storage_file, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving analytics: {e}")
    
    def load(self):
        """Load analytics data from file."""
        try:
            if os.path.exists(self.storage_file):
                with open(self.storage_file, "r") as f:
                    data = json.load(f)
                self.queries = data.get("queries", [])
                self.provider_metrics = defaultdict(lambda: {
                    "count": 0, "total_time": 0.0, "errors": 0,
                    "avg_sources": 0.0, "total_sources": 0
                }, data.get("provider_metrics", {}))
                self.hourly_queries = defaultdict(int, data.get("hourly_queries", {}))
                self.quality_scores = data.get("quality_scores", [])
        except Exception as e:
            print(f"Error loading analytics: {e}")


# Global analytics instance
ANALYTICS = QueryAnalytics()
