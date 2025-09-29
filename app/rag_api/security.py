"""Security enhancements for RAG API."""

import time
import hashlib
from typing import Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Rate limiting storage
rate_limit_storage: Dict[str, list] = {}

# Security configuration
SECURITY_CONFIG = {
    "rate_limit_requests": 100,
    "rate_limit_window": 3600,  # 1 hour
    "max_question_length": 2000,
    "api_key_required": False,
}

security = HTTPBearer(auto_error=False)

def check_rate_limit(client_ip: str) -> bool:
    """Check if client has exceeded rate limit."""
    now = time.time()
    window_start = now - SECURITY_CONFIG["rate_limit_window"]
    
    # Clean old entries
    rate_limit_storage[client_ip] = [
        timestamp for timestamp in rate_limit_storage.get(client_ip, [])
        if timestamp > window_start
    ]
    
    # Check if limit exceeded
    if len(rate_limit_storage.get(client_ip, [])) >= SECURITY_CONFIG["rate_limit_requests"]:
        return False
    
    # Add current request
    rate_limit_storage[client_ip].append(now)
    return True

def verify_api_key(credentials: HTTPAuthorizationCredentials = None):
    """Verify API key if required."""
    if not SECURITY_CONFIG["api_key_required"]:
        return True
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )
    
    # Simple API key validation
    expected_key = "rag-api-key-2025"
    if credentials.credentials != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return True

def validate_request(request: Request) -> bool:
    """Validate incoming request."""
    # Check rate limit
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    return True
