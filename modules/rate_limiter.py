"""
Rate limiter module to prevent API abuse and manage resource consumption
"""
import os
import time
from functools import wraps
from flask import request, jsonify, current_app
import logging

logger = logging.getLogger('linkedin-generator')

# Simple in-memory rate limiter (in production, consider using Redis)
class RateLimiter:
    def __init__(self, limit=60, window=60):  # Default: 60 requests per minute
        """
        Initialize the rate limiter
        
        Args:
            limit: Maximum number of requests allowed in the time window
            window: Time window in seconds
        """
        self.limit = limit
        self.window = window
        self.clients = {}
        
    def is_rate_limited(self, client_id):
        """Check if a client is currently rate limited
        
        Args:
            client_id: Unique identifier for the client (typically IP address)
            
        Returns:
            tuple: (is_limited, reset_time, remaining)
        """
        current = time.time()
        
        # Initialize client record if not exists
        if client_id not in self.clients:
            self.clients[client_id] = {
                'requests': [],
                'blocked_until': 0
            }
        
        client = self.clients[client_id]
        
        # If client is currently blocked
        if client['blocked_until'] > current:
            reset_time = int(client['blocked_until'] - current)
            return True, reset_time, 0
            
        # Clean old requests outside the time window
        client['requests'] = [req for req in client['requests'] if req > current - self.window]
        
        # Check if client has reached the limit
        remaining = self.limit - len(client['requests'])
        if remaining <= 0:
            # Block for double the window time if they've maxed out requests
            client['blocked_until'] = current + (self.window * 2)
            reset_time = self.window * 2
            return True, reset_time, 0
            
        # Add current request
        client['requests'].append(current)
        return False, 0, remaining


# Get configuration from environment variables with defaults
default_limit = 60
try:
    rate_limit_value = int(os.environ.get('RATE_LIMIT', default_limit))
except ValueError:
    logger.warning(f"Invalid RATE_LIMIT environment variable, using default {default_limit}")
    rate_limit_value = default_limit

# Global rate limiter instance
limiter = RateLimiter(limit=rate_limit_value)

def rate_limit(f):
    """Decorator to apply rate limiting to Flask routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip rate limiting in test/development environments
        if os.environ.get('MOCK_MODE', 'false').lower() in ['true', '1', 'yes']:
            return f(*args, **kwargs)
            
        # Skip rate limiting if app is in testing mode
        if current_app.config.get('TESTING', False):
            return f(*args, **kwargs)
        
        # Get client identifier (IP address or custom header for testing)
        client_id = request.headers.get('X-Test-Client-ID', request.remote_addr)
        is_limited, reset_time, remaining = limiter.is_rate_limited(client_id)
        
        if is_limited:
            logger.warning(f"Rate limit exceeded for {client_id}. Reset in {reset_time}s")
            return jsonify({
                "status": "error",
                "message": "Rate limit exceeded",
                "retryAfter": reset_time
            }), 429
            
        # Add rate limit headers
        response = f(*args, **kwargs)
        
        # If it's a tuple of (response, status_code)
        if isinstance(response, tuple) and len(response) == 2:
            resp, code = response
            resp.headers['X-RateLimit-Limit'] = str(limiter.limit)
            resp.headers['X-RateLimit-Remaining'] = str(remaining)
            resp.headers['X-RateLimit-Reset'] = str(int(time.time() + limiter.window))
            return resp, code
        
        # If it's just a response
        response.headers['X-RateLimit-Limit'] = str(limiter.limit)
        response.headers['X-RateLimit-Remaining'] = str(remaining)
        response.headers['X-RateLimit-Reset'] = str(int(time.time() + limiter.window))
        return response
        
    return decorated_function
