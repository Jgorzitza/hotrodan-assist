"""Advanced rate limiting for RAG API with token bucket and provider limits."""

import time
import os
from typing import Dict, Optional, Tuple
from collections import defaultdict
from dataclasses import dataclass, field
from fastapi import HTTPException, status


@dataclass
class TokenBucket:
    """Token bucket implementation for rate limiting."""
    
    capacity: int
    refill_rate: float  # tokens per second
    tokens: float = field(init=False)
    last_refill: float = field(init=False)
    
    def __post_init__(self):
        self.tokens = float(self.capacity)
        self.last_refill = time.time()
    
    def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens. Returns True if successful."""
        self._refill()
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def _refill(self):
        """Refill tokens based on time elapsed."""
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(
            self.capacity,
            self.tokens + (elapsed * self.refill_rate)
        )
        self.last_refill = now
    
    def time_until_available(self, tokens: int = 1) -> float:
        """Get time in seconds until tokens are available."""
        self._refill()
        if self.tokens >= tokens:
            return 0.0
        tokens_needed = tokens - self.tokens
        return tokens_needed / self.refill_rate


class RateLimiter:
    """Advanced rate limiter with multiple strategies."""
    
    def __init__(self):
        # Per-IP rate limiting (token bucket)
        self.ip_buckets: Dict[str, TokenBucket] = {}
        
        # Per-provider rate limiting
        self.provider_buckets: Dict[str, TokenBucket] = {}
        
        # User quotas (daily limits)
        self.user_quotas: Dict[str, Dict[str, int]] = defaultdict(lambda: {
            "daily_limit": 1000,
            "used_today": 0,
            "reset_day": time.strftime("%Y-%m-%d")
        })
        
        # Configuration
        self.config = {
            "ip_capacity": int(os.getenv("RATE_LIMIT_IP_CAPACITY", "100")),
            "ip_refill_rate": float(os.getenv("RATE_LIMIT_IP_REFILL", "1.0")),  # 1 token/sec = 60/min
            "provider_limits": {
                "openai": {"capacity": 50, "refill_rate": 0.5},  # 30/min
                "anthropic": {"capacity": 50, "refill_rate": 0.5},
                "local": {"capacity": 100, "refill_rate": 2.0},  # 120/min
                "retrieval-only": {"capacity": 200, "refill_rate": 5.0}  # 300/min
            },
            "daily_quota": int(os.getenv("RATE_LIMIT_DAILY_QUOTA", "1000"))
        }
    
    def check_rate_limit(self, client_ip: str, provider: Optional[str] = None, 
                        user_id: Optional[str] = None) -> Tuple[bool, Optional[int]]:
        """
        Check if request is allowed.
        Returns (allowed: bool, retry_after: Optional[int])
        """
        # Check IP-based rate limit
        if client_ip not in self.ip_buckets:
            self.ip_buckets[client_ip] = TokenBucket(
                capacity=self.config["ip_capacity"],
                refill_rate=self.config["ip_refill_rate"]
            )
        
        ip_bucket = self.ip_buckets[client_ip]
        if not ip_bucket.consume():
            retry_after = int(ip_bucket.time_until_available()) + 1
            return False, retry_after
        
        # Check provider-specific rate limit
        if provider:
            if provider not in self.provider_buckets:
                limits = self.config["provider_limits"].get(provider, {
                    "capacity": 100,
                    "refill_rate": 1.0
                })
                self.provider_buckets[provider] = TokenBucket(**limits)
            
            provider_bucket = self.provider_buckets[provider]
            if not provider_bucket.consume():
                retry_after = int(provider_bucket.time_until_available()) + 1
                return False, retry_after
        
        # Check daily quota
        if user_id:
            quota = self.user_quotas[user_id]
            today = time.strftime("%Y-%m-%d")
            
            # Reset if new day
            if quota["reset_day"] != today:
                quota["used_today"] = 0
                quota["reset_day"] = today
            
            # Check quota
            if quota["used_today"] >= quota["daily_limit"]:
                # Calculate seconds until midnight
                import datetime
                now = datetime.datetime.now()
                midnight = (now + datetime.timedelta(days=1)).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                retry_after = int((midnight - now).total_seconds())
                return False, retry_after
            
            quota["used_today"] += 1
        
        return True, None
    
    def enforce_rate_limit(self, client_ip: str, provider: Optional[str] = None,
                          user_id: Optional[str] = None):
        """
        Enforce rate limit and raise HTTPException if exceeded.
        Includes Retry-After header in response.
        """
        allowed, retry_after = self.check_rate_limit(client_ip, provider, user_id)
        
        if not allowed:
            headers = {}
            if retry_after:
                headers["Retry-After"] = str(retry_after)
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Rate limit exceeded",
                    "retry_after": retry_after,
                    "message": f"Please wait {retry_after} seconds before retrying"
                },
                headers=headers
            )
    
    def get_rate_limit_status(self, client_ip: str, provider: Optional[str] = None,
                             user_id: Optional[str] = None) -> Dict:
        """Get current rate limit status for debugging."""
        status_info = {}
        
        # IP bucket status
        if client_ip in self.ip_buckets:
            bucket = self.ip_buckets[client_ip]
            bucket._refill()  # Update tokens
            status_info["ip"] = {
                "tokens_available": int(bucket.tokens),
                "capacity": bucket.capacity,
                "refill_rate": bucket.refill_rate
            }
        
        # Provider bucket status
        if provider and provider in self.provider_buckets:
            bucket = self.provider_buckets[provider]
            bucket._refill()
            status_info["provider"] = {
                "name": provider,
                "tokens_available": int(bucket.tokens),
                "capacity": bucket.capacity
            }
        
        # User quota status
        if user_id and user_id in self.user_quotas:
            quota = self.user_quotas[user_id]
            status_info["quota"] = {
                "used_today": quota["used_today"],
                "daily_limit": quota["daily_limit"],
                "remaining": quota["daily_limit"] - quota["used_today"]
            }
        
        return status_info


# Global rate limiter instance
RATE_LIMITER = RateLimiter()
