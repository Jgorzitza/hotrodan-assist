"""Advanced caching layer for RAG API with LRU cache and TTL."""

import time
import hashlib
import json
from typing import Dict, Any, Optional
from collections import OrderedDict
from dataclasses import dataclass
import threading


@dataclass
class CacheEntry:
    """Cache entry with value and metadata."""
    value: Any
    timestamp: float
    ttl: float
    hits: int = 0
    
    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        return time.time() - self.timestamp > self.ttl
    
    def get_age(self) -> float:
        """Get age of cache entry in seconds."""
        return time.time() - self.timestamp


class QueryCache:
    """LRU cache with TTL for query results."""
    
    def __init__(self, max_size: int = 1000, default_ttl: float = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: OrderedDict = OrderedDict()
        self.lock = threading.Lock()
        
        # Statistics
        self.stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "expirations": 0
        }
    
    def _generate_key(self, question: str, top_k: int, provider: Optional[str] = None) -> str:
        """Generate cache key from query parameters."""
        key_data = {
            "question": question.lower().strip(),
            "top_k": top_k,
            "provider": provider or "default"
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, question: str, top_k: int, provider: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get cached result if available and not expired."""
        key = self._generate_key(question, top_k, provider)
        
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                
                # Check expiration
                if entry.is_expired():
                    del self.cache[key]
                    self.stats["expirations"] += 1
                    self.stats["misses"] += 1
                    return None
                
                # Move to end (LRU)
                self.cache.move_to_end(key)
                entry.hits += 1
                self.stats["hits"] += 1
                
                # Add cache metadata to result
                result = entry.value.copy()
                result["cache_metadata"] = {
                    "cached": True,
                    "age_seconds": entry.get_age(),
                    "hits": entry.hits,
                    "ttl_remaining": entry.ttl - entry.get_age()
                }
                
                return result
            
            self.stats["misses"] += 1
            return None
    
    def set(self, question: str, top_k: int, result: Dict[str, Any], 
            provider: Optional[str] = None, ttl: Optional[float] = None):
        """Store result in cache."""
        key = self._generate_key(question, top_k, provider)
        ttl = ttl or self.default_ttl
        
        with self.lock:
            # Check size limit
            if key not in self.cache and len(self.cache) >= self.max_size:
                # Remove oldest entry (LRU)
                self.cache.popitem(last=False)
                self.stats["evictions"] += 1
            
            # Store entry
            self.cache[key] = CacheEntry(
                value=result.copy(),
                timestamp=time.time(),
                ttl=ttl
            )
            
            # Move to end
            self.cache.move_to_end(key)
    
    def invalidate(self, question: Optional[str] = None, provider: Optional[str] = None):
        """Invalidate cache entries."""
        with self.lock:
            if question is None and provider is None:
                # Clear all
                count = len(self.cache)
                self.cache.clear()
                return count
            
            # Selective invalidation would need additional logic
            return 0
    
    def cleanup_expired(self) -> int:
        """Remove all expired entries."""
        with self.lock:
            expired_keys = [
                key for key, entry in self.cache.items()
                if entry.is_expired()
            ]
            
            for key in expired_keys:
                del self.cache[key]
                self.stats["expirations"] += 1
            
            return len(expired_keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self.lock:
            total_requests = self.stats["hits"] + self.stats["misses"]
            hit_rate = self.stats["hits"] / total_requests if total_requests > 0 else 0
            
            # Calculate average age and hits
            if self.cache:
                avg_age = sum(entry.get_age() for entry in self.cache.values()) / len(self.cache)
                avg_hits = sum(entry.hits for entry in self.cache.values()) / len(self.cache)
            else:
                avg_age = 0
                avg_hits = 0
            
            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "hits": self.stats["hits"],
                "misses": self.stats["misses"],
                "hit_rate": round(hit_rate, 3),
                "evictions": self.stats["evictions"],
                "expirations": self.stats["expirations"],
                "avg_age_seconds": round(avg_age, 2),
                "avg_hits_per_entry": round(avg_hits, 2)
            }
    
    def get_top_queries(self, limit: int = 10) -> list:
        """Get most frequently accessed cached queries."""
        with self.lock:
            sorted_entries = sorted(
                self.cache.items(),
                key=lambda x: x[1].hits,
                reverse=True
            )
            
            return [
                {
                    "key": key,
                    "hits": entry.hits,
                    "age": entry.get_age(),
                    "ttl_remaining": entry.ttl - entry.get_age()
                }
                for key, entry in sorted_entries[:limit]
            ]


# Global cache instance
QUERY_CACHE = QueryCache(max_size=1000, default_ttl=1800)  # 30 minutes TTL
