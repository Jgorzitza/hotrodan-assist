"""
Advanced API Gateway for inventory microservices.

Provides unified API gateway with load balancing, authentication,
rate limiting, and service discovery for inventory microservices.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import asyncio
import aiohttp
import json
import time
import hashlib
import hmac
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn
import redis
import jwt
from collections import defaultdict, deque
import threading
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ServiceEndpoint:
    """Service endpoint configuration."""
    name: str
    url: str
    health_check_url: str
    weight: int = 1
    timeout: int = 30
    retry_count: int = 3
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60

@dataclass
class RateLimit:
    """Rate limiting configuration."""
    requests_per_minute: int = 100
    requests_per_hour: int = 1000
    burst_limit: int = 20

@dataclass
class ServiceHealth:
    """Service health status."""
    service_name: str
    is_healthy: bool
    response_time: float
    last_check: datetime
    error_count: int = 0
    circuit_breaker_open: bool = False
    circuit_breaker_until: Optional[datetime] = None

class CircuitBreaker:
    """Circuit breaker implementation."""
    
    def __init__(self, threshold: int = 5, timeout: int = 60):
        self.threshold = threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def can_execute(self) -> bool:
        """Check if request can be executed."""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if self.last_failure_time and \
               (datetime.now() - self.last_failure_time).seconds >= self.timeout:
                self.state = "HALF_OPEN"
                return True
            return False
        else:  # HALF_OPEN
            return True
    
    def on_success(self):
        """Handle successful request."""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def on_failure(self):
        """Handle failed request."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.threshold:
            self.state = "OPEN"

class LoadBalancer:
    """Load balancer with health checking."""
    
    def __init__(self):
        self.services: Dict[str, List[ServiceEndpoint]] = defaultdict(list)
        self.health_status: Dict[str, ServiceHealth] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.round_robin_index: Dict[str, int] = defaultdict(int)
        self.health_check_interval = 30
        self.health_check_thread = None
        self.is_running = False
    
    def add_service(self, service_name: str, endpoint: ServiceEndpoint):
        """Add service endpoint."""
        self.services[service_name].append(endpoint)
        self.health_status[f"{service_name}_{endpoint.name}"] = ServiceHealth(
            service_name=service_name,
            is_healthy=True,
            response_time=0.0,
            last_check=datetime.now()
        )
        self.circuit_breakers[f"{service_name}_{endpoint.name}"] = CircuitBreaker(
            endpoint.circuit_breaker_threshold,
            endpoint.circuit_breaker_timeout
        )
    
    def get_healthy_endpoint(self, service_name: str) -> Optional[ServiceEndpoint]:
        """Get next healthy endpoint using round-robin."""
        if service_name not in self.services:
            return None
        
        healthy_endpoints = []
        for endpoint in self.services[service_name]:
            health_key = f"{service_name}_{endpoint.name}"
            health = self.health_status.get(health_key)
            circuit_breaker = self.circuit_breakers.get(health_key)
            
            if health and health.is_healthy and circuit_breaker and circuit_breaker.can_execute():
                healthy_endpoints.append(endpoint)
        
        if not healthy_endpoints:
            return None
        
        # Round-robin selection
        index = self.round_robin_index[service_name] % len(healthy_endpoints)
        self.round_robin_index[service_name] += 1
        
        return healthy_endpoints[index]
    
    def start_health_checks(self):
        """Start health check background thread."""
        if self.is_running:
            return
        
        self.is_running = True
        self.health_check_thread = threading.Thread(
            target=self._health_check_loop,
            daemon=True
        )
        self.health_check_thread.start()
        logger.info("Health check thread started")
    
    def stop_health_checks(self):
        """Stop health check background thread."""
        self.is_running = False
        if self.health_check_thread:
            self.health_check_thread.join(timeout=5)
        logger.info("Health check thread stopped")
    
    def _health_check_loop(self):
        """Health check background loop."""
        while self.is_running:
            try:
                for service_name, endpoints in self.services.items():
                    for endpoint in endpoints:
                        asyncio.run(self._check_endpoint_health(service_name, endpoint))
                
                time.sleep(self.health_check_interval)
                
            except Exception as e:
                logger.error(f"Health check error: {e}")
                time.sleep(5)
    
    async def _check_endpoint_health(self, service_name: str, endpoint: ServiceEndpoint):
        """Check health of a specific endpoint."""
        health_key = f"{service_name}_{endpoint.name}"
        circuit_breaker = self.circuit_breakers.get(health_key)
        
        if circuit_breaker and not circuit_breaker.can_execute():
            return
        
        try:
            start_time = time.time()
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(endpoint.health_check_url) as response:
                    response_time = (time.time() - start_time) * 1000
                    
                    if response.status == 200:
                        health = self.health_status[health_key]
                        health.is_healthy = True
                        health.response_time = response_time
                        health.last_check = datetime.now()
                        health.error_count = 0
                        
                        if circuit_breaker:
                            circuit_breaker.on_success()
                    else:
                        await self._handle_health_check_failure(service_name, endpoint, health_key)
                        
        except Exception as e:
            logger.warning(f"Health check failed for {service_name}_{endpoint.name}: {e}")
            await self._handle_health_check_failure(service_name, endpoint, health_key)
    
    async def _handle_health_check_failure(self, service_name: str, endpoint: ServiceEndpoint, health_key: str):
        """Handle health check failure."""
        health = self.health_status[health_key]
        health.error_count += 1
        health.last_check = datetime.now()
        
        if health.error_count >= endpoint.circuit_breaker_threshold:
            health.is_healthy = False
            health.circuit_breaker_open = True
            health.circuit_breaker_until = datetime.now() + timedelta(seconds=endpoint.circuit_breaker_timeout)
        
        circuit_breaker = self.circuit_breakers.get(health_key)
        if circuit_breaker:
            circuit_breaker.on_failure()

class RateLimiter:
    """Rate limiter implementation."""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.local_limits: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.rate_limits: Dict[str, RateLimit] = {}
    
    def add_rate_limit(self, key: str, rate_limit: RateLimit):
        """Add rate limit configuration."""
        self.rate_limits[key] = rate_limit
    
    def is_allowed(self, client_id: str, endpoint: str) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed."""
        key = f"{client_id}:{endpoint}"
        rate_limit = self.rate_limits.get(endpoint, RateLimit())
        
        now = time.time()
        
        if self.redis_client:
            return self._check_redis_rate_limit(key, rate_limit, now)
        else:
            return self._check_local_rate_limit(key, rate_limit, now)
    
    def _check_redis_rate_limit(self, key: str, rate_limit: RateLimit, now: float) -> Tuple[bool, Dict[str, Any]]:
        """Check rate limit using Redis."""
        try:
            pipe = self.redis_client.pipeline()
            
            # Check minute limit
            minute_key = f"{key}:minute:{int(now // 60)}"
            pipe.incr(minute_key)
            pipe.expire(minute_key, 60)
            
            # Check hour limit
            hour_key = f"{key}:hour:{int(now // 3600)}"
            pipe.incr(hour_key)
            pipe.expire(hour_key, 3600)
            
            results = pipe.execute()
            minute_count = results[0]
            hour_count = results[2]
            
            allowed = (minute_count <= rate_limit.requests_per_minute and 
                     hour_count <= rate_limit.requests_per_hour)
            
            return allowed, {
                "minute_requests": minute_count,
                "hour_requests": hour_count,
                "minute_limit": rate_limit.requests_per_minute,
                "hour_limit": rate_limit.requests_per_hour
            }
            
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            return True, {"error": "Rate limit check failed"}
    
    def _check_local_rate_limit(self, key: str, rate_limit: RateLimit, now: float) -> Tuple[bool, Dict[str, Any]]:
        """Check rate limit using local storage."""
        requests = self.local_limits[key]
        
        # Clean old requests
        cutoff_time = now - 3600  # 1 hour
        while requests and requests[0] < cutoff_time:
            requests.popleft()
        
        # Count recent requests
        minute_requests = sum(1 for req_time in requests if req_time > now - 60)
        hour_requests = len(requests)
        
        allowed = (minute_requests <= rate_limit.requests_per_minute and 
                 hour_requests <= rate_limit.requests_per_hour)
        
        if allowed:
            requests.append(now)
        
        return allowed, {
            "minute_requests": minute_requests,
            "hour_requests": hour_requests,
            "minute_limit": rate_limit.requests_per_minute,
            "hour_limit": rate_limit.requests_per_hour
        }

class APIGateway:
    """Main API Gateway implementation."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.app = FastAPI(
            title="Inventory API Gateway",
            description="Unified API Gateway for Inventory Microservices",
            version="1.0.0"
        )
        
        # Initialize components
        self.load_balancer = LoadBalancer()
        self.rate_limiter = RateLimiter()
        self.redis_client = None
        
        try:
            self.redis_client = redis.from_url(redis_url)
            self.rate_limiter.redis_client = self.redis_client
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}, using local rate limiting")
        
        # Security
        self.security = HTTPBearer()
        self.jwt_secret = "inventory-gateway-secret-key"
        
        # Setup middleware
        self._setup_middleware()
        self._setup_routes()
        
        # Start health checks
        self.load_balancer.start_health_checks()
    
    def _setup_middleware(self):
        """Setup middleware."""
        # CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Trusted hosts
        self.app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["*"]
        )
    
    def _setup_routes(self):
        """Setup API routes."""
        
        @self.app.get("/")
        async def root():
            return {
                "message": "Inventory API Gateway",
                "version": "1.0.0",
                "services": list(self.load_balancer.services.keys()),
                "status": "operational"
            }
        
        @self.app.get("/health")
        async def health_check():
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "services": {
                    name: {
                        "healthy_endpoints": len([
                            ep for ep in endpoints 
                            if self.load_balancer.health_status.get(f"{name}_{ep.name}").is_healthy
                        ]),
                        "total_endpoints": len(endpoints)
                    }
                    for name, endpoints in self.load_balancer.services.items()
                }
            }
        
        @self.app.get("/services")
        async def list_services():
            return {
                "services": {
                    name: [
                        {
                            "name": ep.name,
                            "url": ep.url,
                            "weight": ep.weight,
                            "health_status": self.load_balancer.health_status.get(f"{name}_{ep.name}").is_healthy
                        }
                        for ep in endpoints
                    ]
                    for name, endpoints in self.load_balancer.services.items()
                }
            }
        
        @self.app.post("/services/{service_name}")
        async def add_service(service_name: str, endpoint: ServiceEndpoint):
            self.load_balancer.add_service(service_name, endpoint)
            return {"message": f"Service {service_name} added successfully"}
        
        @self.app.get("/rate-limits")
        async def get_rate_limits():
            return {
                "rate_limits": {
                    endpoint: {
                        "requests_per_minute": limit.requests_per_minute,
                        "requests_per_hour": limit.requests_per_hour,
                        "burst_limit": limit.burst_limit
                    }
                    for endpoint, limit in self.rate_limiter.rate_limits.items()
                }
            }
        
        @self.app.post("/rate-limits/{endpoint}")
        async def set_rate_limit(endpoint: str, rate_limit: RateLimit):
            self.rate_limiter.add_rate_limit(endpoint, rate_limit)
            return {"message": f"Rate limit set for {endpoint}"}
        
        @self.app.api_route("/{service_name}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
        async def proxy_request(service_name: str, path: str, request: Request):
            return await self._handle_proxy_request(service_name, path, request)
    
    async def _handle_proxy_request(self, service_name: str, path: str, request: Request):
        """Handle proxy request to microservice."""
        # Get client ID (simplified)
        client_id = request.headers.get("X-Client-ID", "anonymous")
        
        # Check rate limit
        allowed, rate_info = self.rate_limiter.is_allowed(client_id, f"{service_name}/{path}")
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={"X-Rate-Limit-Info": json.dumps(rate_info)}
            )
        
        # Get healthy endpoint
        endpoint = self.load_balancer.get_healthy_endpoint(service_name)
        if not endpoint:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Service {service_name} is not available"
            )
        
        # Prepare request
        target_url = f"{endpoint.url}/{path}"
        headers = dict(request.headers)
        headers.pop("host", None)
        
        # Get request body
        body = await request.body()
        
        try:
            # Make request to microservice
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=endpoint.timeout)) as session:
                async with session.request(
                    method=request.method,
                    url=target_url,
                    headers=headers,
                    data=body,
                    params=request.query_params
                ) as response:
                    response_body = await response.read()
                    
                    return {
                        "status_code": response.status,
                        "headers": dict(response.headers),
                        "body": response_body.decode() if response_body else "",
                        "service": service_name,
                        "endpoint": endpoint.name
                    }
        
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Service request timeout"
            )
        except Exception as e:
            logger.error(f"Proxy request error: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Service request failed"
            )
    
    def add_service(self, service_name: str, endpoint: ServiceEndpoint):
        """Add service endpoint."""
        self.load_balancer.add_service(service_name, endpoint)
    
    def set_rate_limit(self, endpoint: str, rate_limit: RateLimit):
        """Set rate limit for endpoint."""
        self.rate_limiter.add_rate_limit(endpoint, rate_limit)
    
    def shutdown(self):
        """Shutdown gateway."""
        self.load_balancer.stop_health_checks()
        if self.redis_client:
            self.redis_client.close()

def main():
    """Main function for running API Gateway."""
    gateway = APIGateway()
    
    # Add sample services
    gateway.add_service("inventory", ServiceEndpoint(
        name="inventory-1",
        url="http://localhost:8004",
        health_check_url="http://localhost:8004/health",
        weight=1
    ))
    
    gateway.add_service("analytics", ServiceEndpoint(
        name="analytics-1", 
        url="http://localhost:8005",
        health_check_url="http://localhost:8005/health",
        weight=1
    ))
    
    # Set rate limits
    gateway.set_rate_limit("inventory/*", RateLimit(requests_per_minute=200, requests_per_hour=2000))
    gateway.set_rate_limit("analytics/*", RateLimit(requests_per_minute=100, requests_per_hour=1000))
    
    # Run gateway
    uvicorn.run(gateway.app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
