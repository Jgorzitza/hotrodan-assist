from __future__ import annotations
import time
from collections import defaultdict, deque
from typing import Dict

class TokenBucketRateLimiter:
    def __init__(self, capacity: int, refill_rate: float) -> None:
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.time()

    def try_consume(self, tokens: int = 1) -> bool:
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: float) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: deque = deque()

    def try_consume(self) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        
        while self.requests and self.requests[0] <= cutoff:
            self.requests.popleft()
            
        if len(self.requests) < self.max_requests:
            self.requests.append(now)
            return True
        return False
