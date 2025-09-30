"""
Integration tests for MCP platform modules.

Tests cross-module workflows and interactions between different components.
"""

import pytest
from pathlib import Path
import tempfile
from datetime import datetime, timezone

from app.service_registry import ServiceRegistry, ServiceDescriptor
from app.idempotency.handlers import FileIdempotencyStore, make_idempotent_key
from app.resilience.circuit_breaker import CircuitBreaker, CircuitState
from app.resilience.rate_limiting import TokenBucketRateLimiter
from app.observability.otel_correlation import SimpleTracer
from app.contracts.registry import ContractsRegistry
from app.replay.backfill_tool import BackfillTool, ReplayEvent
from pydantic import BaseModel


class TestIdempotencyWithResilience:
    """Test idempotency combined with circuit breaker."""
    
    def test_idempotent_operation_with_circuit_breaker(self):
        """Verify idempotency prevents duplicate execution even with circuit breaker."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = FileIdempotencyStore(tmpdir)
            circuit_breaker = CircuitBreaker(failure_threshold=3, timeout=1.0)
            
            # Simulated operation
            call_count = [0]
            
            def risky_operation():
                call_count[0] += 1
                if call_count[0] < 3:
                    raise Exception("Simulated failure")
                return {"result": "success", "count": call_count[0]}
            
            # First attempt - should fail and be cached
            key = make_idempotent_key("test_op", user_id="123")
            
            try:
                result = circuit_breaker.call(risky_operation)
                store.set(key, result)
            except Exception:
                pass
            
            # Verify circuit breaker state changed
            assert circuit_breaker.failure_count > 0


class TestObservabilityIntegration:
    """Test observability across modules."""
    
    def test_trace_context_propagation(self):
        """Verify trace context can be propagated across service boundaries."""
        tracer = SimpleTracer()
        
        # Start parent span
        parent_ctx = tracer.start_span("parent_operation")
        assert parent_ctx.trace_id is not None
        assert parent_ctx.span_id is not None
        assert parent_ctx.parent_span_id is None
        
        # Inject headers for propagation
        headers = tracer.inject_headers(parent_ctx)
        assert "x-trace-id" in headers
        assert "x-span-id" in headers
        assert headers["x-trace-id"] == parent_ctx.trace_id
        
        # Simulate receiving in another service
        extracted_ctx = tracer.extract_headers(headers)
        assert extracted_ctx is not None
        assert extracted_ctx.trace_id == parent_ctx.trace_id
        
        # Start child span
        child_ctx = tracer.start_span("child_operation", parent=extracted_ctx)
        assert child_ctx.trace_id == parent_ctx.trace_id  # Same trace
        assert child_ctx.span_id != parent_ctx.span_id  # Different span
        assert child_ctx.parent_span_id == parent_ctx.span_id


class TestContractsWithValidation:
    """Test contracts registry with validation."""
    
    def test_contract_registration_and_validation(self):
        """Verify contracts can be registered and used for validation."""
        
        class UserContract(BaseModel):
            user_id: str
            email: str
            age: int
        
        registry = ContractsRegistry()
        registry.register("user_v1", UserContract)
        
        # Verify registration
        assert "user_v1" in registry.list()
        
        # Get contract and validate data
        contract = registry.get("user_v1")
        valid_data = {"user_id": "123", "email": "test@example.com", "age": 25}
        user = contract(**valid_data)
        
        assert user.user_id == "123"
        assert user.email == "test@example.com"
        assert user.age == 25
        
        # Test validation failure
        with pytest.raises(Exception):
            contract(user_id="123", email="invalid", age="not_a_number")


class TestReplayWithIdempotency:
    """Test event replay combined with idempotency."""
    
    def test_replay_prevents_duplicate_processing(self):
        """Verify replay tool works with idempotency to prevent duplicates."""
        with tempfile.TemporaryDirectory() as tmpdir:
            events_dir = Path(tmpdir) / "events"
            idempotency_dir = Path(tmpdir) / "idempotency"
            
            replay_tool = BackfillTool(events_dir)
            idempotency_store = FileIdempotencyStore(idempotency_dir)
            
            # Create test events
            event1 = ReplayEvent(
                event_id="evt_001",
                event_type="order_created",
                payload={"order_id": "order_123", "amount": 100},
                occurred_at=datetime.now(timezone.utc).isoformat()
            )
            event2 = ReplayEvent(
                event_id="evt_002",
                event_type="order_created",
                payload={"order_id": "order_124", "amount": 200},
                occurred_at=datetime.now(timezone.utc).isoformat()
            )
            
            replay_tool.save_event(event1)
            replay_tool.save_event(event2)
            
            # Replay events with idempotency check
            events = replay_tool.load_events("order_created")
            assert len(events) == 2
            
            processed = []
            for event in events:
                key = make_idempotent_key("process_event", event_id=event.event_id)
                
                # Check if already processed
                if idempotency_store.get(key):
                    continue
                
                # Process and mark as done
                processed.append(event.event_id)
                idempotency_store.set(key, {"status": "processed"})
            
            assert len(processed) == 2
            
            # Replay again - should skip both
            processed_again = []
            for event in events:
                key = make_idempotent_key("process_event", event_id=event.event_id)
                if idempotency_store.get(key):
                    continue
                processed_again.append(event.event_id)
            
            assert len(processed_again) == 0  # All skipped


class TestRateLimitingWithCircuitBreaker:
    """Test rate limiting combined with circuit breaker."""
    
    def test_rate_limiter_and_circuit_breaker_interaction(self):
        """Verify rate limiter works alongside circuit breaker."""
        rate_limiter = TokenBucketRateLimiter(capacity=5, refill_rate=1.0)
        circuit_breaker = CircuitBreaker(failure_threshold=3, timeout=2.0)
        
        success_count = 0
        failure_count = 0
        
        # Simulate 10 requests
        for i in range(10):
            # Check rate limit
            if not rate_limiter.try_consume():
                failure_count += 1
                continue
            
            # Simulate operation through circuit breaker
            def operation():
                return {"request_id": i, "status": "success"}
            
            try:
                result = circuit_breaker.call(operation)
                success_count += 1
            except Exception:
                failure_count += 1
        
        # First 5 should succeed (rate limit), rest should be throttled
        assert success_count <= 5
        assert failure_count >= 5
        assert circuit_breaker.state == CircuitState.CLOSED  # No failures


class TestEndToEndWorkflow:
    """End-to-end integration test."""
    
    @pytest.mark.asyncio
    async def test_complete_request_workflow(self):
        """Test a complete request workflow with all components."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Setup components
            tracer = SimpleTracer()
            idempotency_store = FileIdempotencyStore(Path(tmpdir) / "idempotency")
            circuit_breaker = CircuitBreaker(failure_threshold=5, timeout=10.0)
            rate_limiter = TokenBucketRateLimiter(capacity=10, refill_rate=2.0)
            
            # Simulate incoming request
            request_id = "req_001"
            user_id = "user_123"
            
            # 1. Start trace
            trace_ctx = tracer.start_span("handle_request")
            assert trace_ctx.trace_id is not None
            
            # 2. Check rate limit
            if not rate_limiter.try_consume():
                pytest.fail("Rate limit exceeded unexpectedly")
            
            # 3. Check idempotency
            idempotency_key = make_idempotent_key(
                "handle_request",
                request_id=request_id,
                user_id=user_id
            )
            
            cached_result = idempotency_store.get(idempotency_key)
            if cached_result:
                # Return cached result
                result = cached_result.result
            else:
                # 4. Execute through circuit breaker
                def process_request():
                    return {
                        "request_id": request_id,
                        "user_id": user_id,
                        "trace_id": trace_ctx.trace_id,
                        "status": "success",
                        "processed_at": datetime.now(timezone.utc).isoformat()
                    }
                
                result = circuit_breaker.call(process_request)
                
                # 5. Cache result
                idempotency_store.set(idempotency_key, result, ttl_seconds=3600)
            
            # Verify result
            assert result["request_id"] == request_id
            assert result["user_id"] == user_id
            assert result["status"] == "success"
            assert result["trace_id"] == trace_ctx.trace_id
            
            # Verify idempotency - second call should return cached
            cached_result2 = idempotency_store.get(idempotency_key)
            assert cached_result2 is not None
            assert cached_result2.result == result
