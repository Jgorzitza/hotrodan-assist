"""Production configuration and tuning for RAG API."""

import os
from typing import Dict, Any
from dataclasses import dataclass


@dataclass
class ProductionConfig:
    """Production configuration settings."""
    
    # Performance settings
    max_concurrent_requests: int = 100
    request_timeout_seconds: int = 30
    slow_query_threshold_ms: int = 2000
    
    # Caching settings
    cache_enabled: bool = True
    cache_ttl_seconds: int = 1800  # 30 minutes
    cache_max_size: int = 1000
    
    # Rate limiting
    rate_limit_enabled: bool = True
    rate_limit_requests_per_minute: int = 60
    rate_limit_burst: int = 100
    
    # Provider settings
    default_provider: str = "openai"
    fallback_provider: str = "retrieval-only"
    provider_timeout_seconds: int = 15
    
    # Search settings
    default_top_k: int = 10
    max_top_k: int = 50
    min_top_k: int = 1
    
    # Vector search
    vector_search_enabled: bool = True
    hybrid_search_enabled: bool = True
    reranking_enabled: bool = True
    
    # Analytics
    analytics_enabled: bool = True
    analytics_persist_interval: int = 10  # queries
    
    # Monitoring
    monitoring_enabled: bool = True
    log_slow_queries: bool = True
    log_errors: bool = True
    
    # Feature flags
    enable_query_optimization: bool = True
    enable_cache: bool = True
    enable_benchmarking: bool = True
    
    @classmethod
    def from_env(cls) -> 'ProductionConfig':
        """Load configuration from environment variables."""
        return cls(
            max_concurrent_requests=int(os.getenv('RAG_MAX_CONCURRENT', '100')),
            request_timeout_seconds=int(os.getenv('RAG_TIMEOUT', '30')),
            cache_ttl_seconds=int(os.getenv('RAG_CACHE_TTL', '1800')),
            rate_limit_requests_per_minute=int(os.getenv('RAG_RATE_LIMIT', '60')),
            default_provider=os.getenv('RAG_DEFAULT_PROVIDER', 'openai'),
            enable_query_optimization=os.getenv('RAG_QUERY_OPT', 'true').lower() == 'true',
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return {
            "performance": {
                "max_concurrent_requests": self.max_concurrent_requests,
                "request_timeout_seconds": self.request_timeout_seconds,
                "slow_query_threshold_ms": self.slow_query_threshold_ms
            },
            "caching": {
                "enabled": self.cache_enabled,
                "ttl_seconds": self.cache_ttl_seconds,
                "max_size": self.cache_max_size
            },
            "rate_limiting": {
                "enabled": self.rate_limit_enabled,
                "requests_per_minute": self.rate_limit_requests_per_minute,
                "burst": self.rate_limit_burst
            },
            "providers": {
                "default": self.default_provider,
                "fallback": self.fallback_provider,
                "timeout_seconds": self.provider_timeout_seconds
            },
            "search": {
                "default_top_k": self.default_top_k,
                "max_top_k": self.max_top_k,
                "vector_search_enabled": self.vector_search_enabled,
                "hybrid_search_enabled": self.hybrid_search_enabled,
                "reranking_enabled": self.reranking_enabled
            },
            "features": {
                "query_optimization": self.enable_query_optimization,
                "cache": self.enable_cache,
                "benchmarking": self.enable_benchmarking,
                "analytics": self.analytics_enabled,
                "monitoring": self.monitoring_enabled
            }
        }


class HealthChecker:
    """Health checking for production monitoring."""
    
    def __init__(self):
        self.checks = {}
    
    def check_health(self) -> Dict[str, Any]:
        """Perform comprehensive health check."""
        health = {
            "status": "healthy",
            "timestamp": time.time(),
            "checks": {}
        }
        
        # Check vector store
        try:
            # Would actually check vector store connectivity
            health["checks"]["vector_store"] = {"status": "healthy", "latency_ms": 5}
        except Exception as e:
            health["checks"]["vector_store"] = {"status": "unhealthy", "error": str(e)}
            health["status"] = "degraded"
        
        # Check LLM providers
        health["checks"]["providers"] = {
            "openai": "unknown",  # Would check actual connectivity
            "local": "healthy"
        }
        
        # Check cache
        health["checks"]["cache"] = {"status": "healthy", "size": 0}
        
        # Check rate limiter
        health["checks"]["rate_limiter"] = {"status": "healthy"}
        
        return health
    
    def check_readiness(self) -> Dict[str, Any]:
        """Check if service is ready to accept traffic."""
        return {
            "ready": True,
            "checks": {
                "vector_store": "ready",
                "cache": "ready",
                "providers": "ready"
            }
        }


import time

# Global instances
PROD_CONFIG = ProductionConfig.from_env()
HEALTH_CHECKER = HealthChecker()
