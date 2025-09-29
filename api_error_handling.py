#!/usr/bin/env python3
"""
API Error Handling and Retry Logic
Robust error handling for MCP connector integration
"""

import asyncio
import aiohttp
import time
import random
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RetryStrategy(Enum):
    """Retry strategy types"""
    FIXED = "fixed"
    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    CUSTOM = "custom"

class ErrorType(Enum):
    """Error type classification"""
    NETWORK = "network"
    TIMEOUT = "timeout"
    RATE_LIMIT = "rate_limit"
    SERVER_ERROR = "server_error"
    CLIENT_ERROR = "client_error"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    UNKNOWN = "unknown"

@dataclass
class RetryConfig:
    """Retry configuration"""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL
    jitter: bool = True
    backoff_multiplier: float = 2.0
    retryable_errors: List[ErrorType] = None
    
    def __post_init__(self):
        if self.retryable_errors is None:
            self.retryable_errors = [
                ErrorType.NETWORK,
                ErrorType.TIMEOUT,
                ErrorType.RATE_LIMIT,
                ErrorType.SERVER_ERROR
            ]

@dataclass
class APIError:
    """Structured API error"""
    error_type: ErrorType
    message: str
    status_code: Optional[int] = None
    response_data: Optional[Dict[str, Any]] = None
    timestamp: str = None
    retry_after: Optional[float] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

class APIRetryHandler:
    """
    Advanced retry handler with multiple strategies
    """
    
    def __init__(self, config: RetryConfig):
        self.config = config
        self.error_classifier = APIErrorClassifier()
    
    async def execute_with_retry(
        self,
        operation: Callable,
        *args,
        **kwargs
    ) -> Any:
        """Execute operation with retry logic"""
        last_error = None
        
        for attempt in range(1, self.config.max_attempts + 1):
            try:
                result = await operation(*args, **kwargs)
                if attempt > 1:
                    logger.info(f"Operation succeeded on attempt {attempt}")
                return result
                
            except Exception as e:
                last_error = e
                api_error = self.error_classifier.classify_error(e)
                
                # Check if error is retryable
                if not self._should_retry(api_error, attempt):
                    logger.error(f"Non-retryable error on attempt {attempt}: {api_error.message}")
                    raise api_error
                
                # Calculate delay
                delay = self._calculate_delay(attempt, api_error)
                
                if attempt < self.config.max_attempts:
                    logger.warning(
                        f"Attempt {attempt} failed ({api_error.error_type.value}): {api_error.message}. "
                        f"Retrying in {delay:.2f} seconds..."
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All {self.config.max_attempts} attempts failed. Last error: {api_error.message}")
                    raise api_error
        
        # This should never be reached, but just in case
        raise last_error
    
    def _should_retry(self, api_error: APIError, attempt: int) -> bool:
        """Determine if operation should be retried"""
        if attempt >= self.config.max_attempts:
            return False
        
        return api_error.error_type in self.config.retryable_errors
    
    def _calculate_delay(self, attempt: int, api_error: APIError) -> float:
        """Calculate delay before next retry attempt"""
        # Use retry_after from rate limit if available
        if api_error.retry_after:
            return api_error.retry_after
        
        # Calculate base delay based on strategy
        if self.config.strategy == RetryStrategy.FIXED:
            delay = self.config.base_delay
        elif self.config.strategy == RetryStrategy.LINEAR:
            delay = self.config.base_delay * attempt
        elif self.config.strategy == RetryStrategy.EXPONENTIAL:
            delay = self.config.base_delay * (self.config.backoff_multiplier ** (attempt - 1))
        else:  # CUSTOM
            delay = self._custom_delay(attempt, api_error)
        
        # Apply jitter to prevent thundering herd
        if self.config.jitter:
            jitter_range = delay * 0.1  # 10% jitter
            delay += random.uniform(-jitter_range, jitter_range)
        
        # Ensure delay is within bounds
        delay = max(0, min(delay, self.config.max_delay))
        
        return delay
    
    def _custom_delay(self, attempt: int, api_error: APIError) -> float:
        """Custom delay calculation based on error type"""
        base_delay = self.config.base_delay
        
        if api_error.error_type == ErrorType.RATE_LIMIT:
            # Longer delay for rate limits
            return base_delay * (2 ** attempt)
        elif api_error.error_type == ErrorType.SERVER_ERROR:
            # Moderate delay for server errors
            return base_delay * attempt
        else:
            # Standard exponential backoff
            return base_delay * (self.config.backoff_multiplier ** (attempt - 1))

class APIErrorClassifier:
    """
    Classify API errors for appropriate handling
    """
    
    def classify_error(self, error: Exception) -> APIError:
        """Classify error and extract relevant information"""
        if isinstance(error, aiohttp.ClientTimeout):
            return APIError(
                error_type=ErrorType.TIMEOUT,
                message=f"Request timeout: {str(error)}",
                timestamp=datetime.now().isoformat()
            )
        
        if isinstance(error, aiohttp.ClientError):
            return self._classify_client_error(error)
        
        if isinstance(error, APIError):
            return error
        
        # Default to unknown error
        return APIError(
            error_type=ErrorType.UNKNOWN,
            message=f"Unknown error: {str(error)}",
            timestamp=datetime.now().isoformat()
        )
    
    def _classify_client_error(self, error: aiohttp.ClientError) -> APIError:
        """Classify aiohttp client errors"""
        if hasattr(error, 'status'):
            status_code = error.status
        else:
            status_code = None
        
        # Network errors
        if isinstance(error, (aiohttp.ClientConnectionError, aiohttp.ClientConnectorError)):
            return APIError(
                error_type=ErrorType.NETWORK,
                message=f"Network error: {str(error)}",
                status_code=status_code,
                timestamp=datetime.now().isoformat()
            )
        
        # HTTP status code based classification
        if status_code:
            if status_code == 429:
                retry_after = self._extract_retry_after(error)
                return APIError(
                    error_type=ErrorType.RATE_LIMIT,
                    message=f"Rate limited: {str(error)}",
                    status_code=status_code,
                    retry_after=retry_after,
                    timestamp=datetime.now().isoformat()
                )
            elif 400 <= status_code < 500:
                if status_code in [401, 403]:
                    error_type = ErrorType.AUTHENTICATION if status_code == 401 else ErrorType.AUTHORIZATION
                elif status_code == 422:
                    error_type = ErrorType.VALIDATION
                else:
                    error_type = ErrorType.CLIENT_ERROR
                
                return APIError(
                    error_type=error_type,
                    message=f"Client error {status_code}: {str(error)}",
                    status_code=status_code,
                    timestamp=datetime.now().isoformat()
                )
            elif 500 <= status_code < 600:
                return APIError(
                    error_type=ErrorType.SERVER_ERROR,
                    message=f"Server error {status_code}: {str(error)}",
                    status_code=status_code,
                    timestamp=datetime.now().isoformat()
                )
        
        # Default client error
        return APIError(
            error_type=ErrorType.CLIENT_ERROR,
            message=f"Client error: {str(error)}",
            status_code=status_code,
            timestamp=datetime.now().isoformat()
        )
    
    def _extract_retry_after(self, error: aiohttp.ClientError) -> Optional[float]:
        """Extract retry-after header from error"""
        if hasattr(error, 'headers') and 'Retry-After' in error.headers:
            try:
                return float(error.headers['Retry-After'])
            except (ValueError, TypeError):
                pass
        return None

class CircuitBreaker:
    """
    Circuit breaker pattern for API calls
    """
    
    def __init__(self, failure_threshold: int = 5, timeout: float = 60.0):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, operation: Callable, *args, **kwargs) -> Any:
        """Execute operation through circuit breaker"""
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise APIError(
                    error_type=ErrorType.SERVER_ERROR,
                    message="Circuit breaker is OPEN - operation blocked"
                )
        
        try:
            result = await operation(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt reset"""
        if self.last_failure_time is None:
            return True
        
        return time.time() - self.last_failure_time >= self.timeout
    
    def _on_success(self):
        """Handle successful operation"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def _on_failure(self):
        """Handle failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

class APIMonitor:
    """
    Monitor API health and performance
    """
    
    def __init__(self):
        self.metrics = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'average_response_time': 0.0,
            'error_counts': {},
            'last_request_time': None
        }
        self.response_times = []
    
    def record_request(self, success: bool, response_time: float, error_type: ErrorType = None):
        """Record API request metrics"""
        self.metrics['total_requests'] += 1
        self.metrics['last_request_time'] = datetime.now().isoformat()
        
        if success:
            self.metrics['successful_requests'] += 1
        else:
            self.metrics['failed_requests'] += 1
            if error_type:
                error_key = error_type.value
                self.metrics['error_counts'][error_key] = self.metrics['error_counts'].get(error_key, 0) + 1
        
        # Update average response time
        self.response_times.append(response_time)
        if len(self.response_times) > 100:  # Keep only last 100 measurements
            self.response_times = self.response_times[-100:]
        
        self.metrics['average_response_time'] = sum(self.response_times) / len(self.response_times)
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get current API health status"""
        total = self.metrics['total_requests']
        if total == 0:
            return {'status': 'unknown', 'success_rate': 0.0}
        
        success_rate = self.metrics['successful_requests'] / total
        
        if success_rate >= 0.95:
            status = 'healthy'
        elif success_rate >= 0.80:
            status = 'degraded'
        else:
            status = 'unhealthy'
        
        return {
            'status': status,
            'success_rate': success_rate,
            'total_requests': total,
            'average_response_time': self.metrics['average_response_time'],
            'error_counts': self.metrics['error_counts']
        }

class RobustAPIClient:
    """
    Robust API client with retry, circuit breaker, and monitoring
    """
    
    def __init__(self, retry_config: RetryConfig = None, circuit_breaker_config: Dict = None):
        self.retry_handler = APIRetryHandler(retry_config or RetryConfig())
        self.circuit_breaker = CircuitBreaker(**(circuit_breaker_config or {}))
        self.monitor = APIMonitor()
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def request(
        self,
        method: str,
        url: str,
        headers: Dict[str, str] = None,
        data: Dict[str, Any] = None,
        params: Dict[str, Any] = None,
        timeout: float = 30.0
    ) -> aiohttp.ClientResponse:
        """Make robust HTTP request with all safety features"""
        start_time = time.time()
        
        async def _make_request():
            async with self.session.request(
                method, url, headers=headers, json=data, params=params,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                return response
        
        try:
            response = await self.circuit_breaker.call(
                self.retry_handler.execute_with_retry,
                _make_request
            )
            
            response_time = time.time() - start_time
            self.monitor.record_request(True, response_time)
            
            return response
            
        except Exception as e:
            response_time = time.time() - start_time
            error_type = ErrorType.UNKNOWN
            
            if isinstance(e, APIError):
                error_type = e.error_type
            
            self.monitor.record_request(False, response_time, error_type)
            raise e
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get API health status"""
        return self.monitor.get_health_status()

# Example usage and testing
async def main():
    """Example usage of robust API client"""
    
    # Configure retry strategy
    retry_config = RetryConfig(
        max_attempts=3,
        base_delay=1.0,
        strategy=RetryStrategy.EXPONENTIAL,
        jitter=True
    )
    
    # Configure circuit breaker
    circuit_breaker_config = {
        'failure_threshold': 5,
        'timeout': 60.0
    }
    
    # Create robust client
    async with RobustAPIClient(retry_config, circuit_breaker_config) as client:
        try:
            # Make API request
            response = await client.request(
                'GET',
                'https://httpbin.org/status/200',
                timeout=10.0
            )
            
            print(f"Request successful: {response.status}")
            
            # Get health status
            health = client.get_health_status()
            print(f"API Health: {health}")
            
        except Exception as e:
            print(f"Request failed: {e}")
            
            # Get health status
            health = client.get_health_status()
            print(f"API Health: {health}")

if __name__ == "__main__":
    asyncio.run(main())
