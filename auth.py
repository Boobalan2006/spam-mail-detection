from flask import current_app
from werkzeug.security import generate_password_hash, check_password_hash
import re
from datetime import datetime, timedelta
import bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt
import pickle
from functools import wraps
from flask import jsonify, request
import threading
import os
import uuid

# Thread-safe lock for file operations
file_lock = threading.Lock()

class TokenBlacklist:
    _instance = None
    _blacklist = set()
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = TokenBlacklist()
        return cls._instance
    
    def add_token(self, jti):
        self._blacklist.add(jti)
    
    def is_blacklisted(self, jti):
        return jti in self._blacklist

def create_tokens(identity):
    """Create access and refresh tokens."""
    access_token = create_access_token(
        identity=identity,
        fresh=True,
        additional_claims={"type": "access"}
    )
    refresh_token = create_refresh_token(
        identity=identity,
        additional_claims={"type": "refresh"}
    )
    return access_token, refresh_token

class UserManager:
    def __init__(self, users_file='users.pkl'):
        self.users_file = users_file
        self.lock = threading.Lock()
    
    def load_users(self):
        """Thread-safe user loading."""
        with self.lock:
            if os.path.exists(self.users_file):
                try:
                    with open(self.users_file, 'rb') as f:
                        return pickle.load(f)
                except Exception as e:
                    current_app.logger.error(f"Error loading users: {e}")
                    return {}
            return {}
    
    def save_users(self, users):
        """Thread-safe user saving."""
        with self.lock:
            with open(self.users_file, 'wb') as f:
                pickle.dump(users, f)
    
    def create_user(self, username, email, password):
        """Create a new user with secure password hashing."""
        # Validate password
        is_valid, message = validate_password(password)
        if not is_valid:
            return False, message
        
        users = self.load_users()
        
        # Check if email already exists
        if any(user['email'] == email for user in users.values()):
            return False, "Email already registered"
        
        # Generate secure user ID
        user_id = str(uuid.uuid4())
        
        # Create user with hashed password
        users[user_id] = {
            'id': user_id,
            'username': username,
            'email': email,
            'password': hash_password(password),
            'created_at': datetime.utcnow().isoformat(),
            'settings': {
                'theme': 'system',
                'notifications': True
            }
        }
        
        self.save_users(users)
        return True, user_id
    
    def authenticate_user(self, email, password):
        """Authenticate a user and generate tokens."""
        users = self.load_users()
        
        # Find user by email
        user = None
        user_id = None
        for uid, u in users.items():
            if u['email'] == email:
                user = u
                user_id = uid
                break
        
        if not user or not verify_password(user['password'], password):
            return None
        
        # Generate tokens
        access_token, refresh_token = create_tokens(user_id)
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user_id,
                'username': user['username'],
                'email': user['email']
            }
        }

def validate_password(password):
    """Validate password meets security requirements."""
    if len(password) < current_app.config['PASSWORD_MIN_LENGTH']:
        return False, f"Password must be at least {current_app.config['PASSWORD_MIN_LENGTH']} characters long"
    
    if current_app.config['PASSWORD_REQUIRE_UPPERCASE'] and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if current_app.config['PASSWORD_REQUIRE_LOWERCASE'] and not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if current_app.config['PASSWORD_REQUIRE_NUMBERS'] and not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    if current_app.config['PASSWORD_REQUIRE_SPECIAL'] and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Password meets requirements"

def hash_password(password):
    """Generate a secure password hash using bcrypt."""
    salt = bcrypt.gensalt(rounds=current_app.config['BCRYPT_LOG_ROUNDS'])
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
    return password_hash.decode('utf-8')

def verify_password(stored_hash, provided_password):
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(provided_password.encode('utf-8'), stored_hash.encode('utf-8'))
    except Exception:
        return False

# Rate limiting decorator
def rate_limit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Simple in-memory rate limiting
        key = f"{request.remote_addr}:{func.__name__}"
        now = datetime.utcnow()
        
        # Get the rate limit window
        window_start = now - timedelta(minutes=1)
        
        # Clean up old entries
        RateLimiter.cleanup(window_start)
        
        # Check rate limit
        if RateLimiter.is_rate_limited(key, window_start):
            return jsonify({'error': 'Too many attempts. Please try again later.'}), 429
        
        # Add this request to rate limiting
        RateLimiter.add_request(key, now)
        
        return func(*args, **kwargs)
    return wrapper

class RateLimiter:
    _requests = {}
    _lock = threading.Lock()
    
    @classmethod
    def add_request(cls, key, timestamp):
        with cls._lock:
            if key not in cls._requests:
                cls._requests[key] = []
            cls._requests[key].append(timestamp)
    
    @classmethod
    def is_rate_limited(cls, key, window_start):
        with cls._lock:
            if key not in cls._requests:
                return False
            # Count requests in the current window
            count = sum(1 for ts in cls._requests[key] if ts >= window_start)
            return count >= 5  # 5 requests per minute
    
    @classmethod
    def cleanup(cls, window_start):
        with cls._lock:
            for key in list(cls._requests.keys()):
                cls._requests[key] = [ts for ts in cls._requests[key] if ts >= window_start]
                if not cls._requests[key]:
                    del cls._requests[key] 