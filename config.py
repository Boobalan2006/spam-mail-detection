import os
from datetime import timedelta

class Config:
    # JWT Configuration
    JWT_SECRET_KEY = 'your-secret-key-for-development'  # Fixed key for development
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)  # Increased for testing
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access', 'refresh']
    JWT_ERROR_MESSAGE_KEY = 'msg'  # Ensure consistent error message key
    
    # Password Hashing Configuration
    BCRYPT_LOG_ROUNDS = 12
    
    # Rate Limiting
    LOGIN_RATE_LIMIT = "5 per minute"
    
    # Password Requirements
    PASSWORD_MIN_LENGTH = 12
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_NUMBERS = True
    PASSWORD_REQUIRE_SPECIAL = True
    
    # Session Configuration
    SESSION_COOKIE_SECURE = False  # Set to False for development (no HTTPS)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'  # More permissive for development 