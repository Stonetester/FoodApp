import os
from dotenv import load_dotenv

load_dotenv()

def _default_database_uri():
    """Return the DATABASE_URL from the environment, falling back to SQLite."""
    url = os.environ.get('DATABASE_URL')
    if url:
        # Quick connectivity check for MySQL URLs
        if url.startswith(('mysql', 'mysql+pymysql')):
            try:
                import socket
                from urllib.parse import urlparse
                parsed = urlparse(url.replace('mysql+pymysql://', 'mysql://'))
                host = parsed.hostname or 'localhost'
                port = parsed.port or 3306
                s = socket.create_connection((host, port), timeout=2)
                s.close()
                return url
            except (OSError, Exception):
                pass  # MySQL unreachable, fall back to SQLite
        else:
            return url
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    return 'sqlite:///' + os.path.join(basedir, 'foodapp.db')

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production-' + os.urandom(24).hex()
    SQLALCHEMY_DATABASE_URI = _default_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True for SQL query debugging
    
    # Session configuration
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours in seconds
    
    # Upload configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_ECHO = False
    SESSION_COOKIE_SECURE = True  # Requires HTTPS
    SESSION_COOKIE_SAMESITE = 'Strict'
    # Use environment variable for secret key in production
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    if not SECRET_KEY:
        raise ValueError("No SECRET_KEY set for production environment")

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
