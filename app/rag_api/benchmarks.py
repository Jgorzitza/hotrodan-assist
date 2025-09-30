"""Benchmarking and performance testing for RAG API."""

import time
import statistics
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class BenchmarkResult:
    """Result from a single benchmark run."""
    query: str
    provider: str
    response_time_ms: float
    success: bool
    error: Optional[str] = None
    cache_hit: bool = False
    sources_count: int = 0
    answer_length: int = 0


@dataclass
class BenchmarkSuite:
    """Collection of benchmark results with statistics."""
    name: str
    results: List[BenchmarkResult] = field(default_factory=list)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    def add_result(self, result: BenchmarkResult):
        """Add a benchmark result."""
        self.results.append(result)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Calculate statistics from benchmark results."""
        if not self.results:
            return {}
        
        response_times = [r.response_time_ms for r in self.results]
        successful = [r for r in self.results if r.success]
        failed = [r for r in self.results if not r.success]
        cached = [r for r in self.results if r.cache_hit]
        
        stats = {
            "suite_name": self.name,
            "total_queries": len(self.results),
            "successful": len(successful),
            "failed": len(failed),
            "success_rate": len(successful) / len(self.results) if self.results else 0,
            "cache_hits": len(cached),
            "cache_hit_rate": len(cached) / len(self.results) if self.results else 0,
            "response_times": {
                "min_ms": min(response_times),
                "max_ms": max(response_times),
                "mean_ms": statistics.mean(response_times),
                "median_ms": statistics.median(response_times),
                "stdev_ms": statistics.stdev(response_times) if len(response_times) > 1 else 0,
                "p95_ms": sorted(response_times)[int(len(response_times) * 0.95)] if response_times else 0,
                "p99_ms": sorted(response_times)[int(len(response_times) * 0.99)] if response_times else 0
            }
        }
        
        # Provider breakdown
        providers = {}
        for result in self.results:
            if result.provider not in providers:
                providers[result.provider] = {"count": 0, "times": []}
            providers[result.provider]["count"] += 1
            providers[result.provider]["times"].append(result.response_time_ms)
        
        stats["by_provider"] = {
            provider: {
                "count": data["count"],
                "avg_time_ms": statistics.mean(data["times"])
            }
            for provider, data in providers.items()
        }
        
        # Duration
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
            stats["duration_seconds"] = duration
            stats["queries_per_second"] = len(self.results) / duration if duration > 0 else 0
        
        return stats


class PerformanceBenchmark:
    """Performance benchmarking for RAG API."""
    
    def __init__(self):
        self.suites: Dict[str, BenchmarkSuite] = {}
        
        # Standard benchmark queries
        self.standard_queries = [
            "What is PTFE?",
            "How to install a fuel pump?",
            "Compare return vs returnless fuel systems",
            "Why is my fuel pressure dropping?",
            "What size fuel line for 600hp?",
            "Best fuel filter for E85",
            "PTFE hose specifications",
            "Fuel pump sizing calculator",
            "AN fitting types",
            "Regulator placement guidelines"
        ]
    
    def create_suite(self, name: str) -> BenchmarkSuite:
        """Create a new benchmark suite."""
        suite = BenchmarkSuite(name=name, start_time=datetime.now())
        self.suites[name] = suite
        return suite
    
    def finalize_suite(self, name: str):
        """Finalize a benchmark suite."""
        if name in self.suites:
            self.suites[name].end_time = datetime.now()
    
    def get_suite(self, name: str) -> Optional[BenchmarkSuite]:
        """Get a benchmark suite by name."""
        return self.suites.get(name)
    
    def compare_providers(self, providers: List[str], queries: Optional[List[str]] = None) -> Dict[str, Any]:
        """Compare performance across different providers."""
        if queries is None:
            queries = self.standard_queries[:5]  # Use subset for quick comparison
        
        comparison = {
            "queries": queries,
            "providers": {},
            "timestamp": datetime.now().isoformat()
        }
        
        # This would integrate with actual API calls - simplified here
        for provider in providers:
            comparison["providers"][provider] = {
                "avg_response_time": 0,
                "success_rate": 0,
                "tested": False
            }
        
        return comparison
    
    def stress_test(self, concurrent_users: int = 10, duration_seconds: int = 60) -> Dict[str, Any]:
        """Simulate stress test with concurrent users."""
        # This would implement actual stress testing - outline here
        return {
            "concurrent_users": concurrent_users,
            "duration_seconds": duration_seconds,
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "avg_response_time_ms": 0,
            "requests_per_second": 0,
            "errors": []
        }


# Global benchmark instance
BENCHMARK = PerformanceBenchmark()
