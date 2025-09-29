import time
import pytest
from app.resilience.rate_limiting import TokenBucketRateLimiter, SlidingWindowRateLimiter
from app.resilience.circuit_breaker import CircuitBreaker

def test_token_bucket():
    limiter = TokenBucketRateLimiter(capacity=2, refill_rate=1.0)
    assert limiter.try_consume() is True
    assert limiter.try_consume() is True
    assert limiter.try_consume() is False

def test_sliding_window():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=1.0)
    assert limiter.try_consume() is True
    assert limiter.try_consume() is True
    assert limiter.try_consume() is False

def test_circuit_breaker():
    breaker = CircuitBreaker(failure_threshold=2, timeout=0.1)
    
    def failing_func():
        raise ValueError("test error")
    
    with pytest.raises(ValueError):
        breaker.call(failing_func)
    with pytest.raises(ValueError):
        breaker.call(failing_func)
    
    with pytest.raises(Exception, match="Circuit breaker is OPEN"):
        breaker.call(failing_func)
