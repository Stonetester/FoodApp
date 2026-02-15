import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production-' + os.urandom(24).hex()
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL not set")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True for SQL query debugging

    # SQLAlchemy connection-pool settings.
    # pool_recycle: recycle (close + reopen) connections after this many seconds
    #   so the DB doesn't drop them for being idle.  MySQL's default
    #   wait_timeout is 28800 s (8 h); Cloudflare's proxy can also close idle
    #   connections, so 1800 s (30 min) is a safe middle ground.
    # pool_pre_ping: send a lightweight ping before reusing a connection to
    #   detect "server has gone away" errors instead of crashing the request.
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', '1800')),
        'pool_pre_ping': True,
        'pool_size': int(os.environ.get('DB_POOL_SIZE', '10')),
        'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', '20')),
    }

    # Session configuration
    SESSION_COOKIE_SECURE = (os.getenv("SESSION_COOKIE_SECURE", "1") == "1")  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    PERMANENT_SESSION_LIFETIME = timedelta(days=1)
    # Upload configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    # Email (SendGrid)
    SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
    SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@modogusto.com')
    SENDGRID_FROM_NAME = os.environ.get('SENDGRID_FROM_NAME', 'Modo Gusto')
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')
    APP_BASE_URL = os.environ.get('APP_BASE_URL', 'http://localhost:5000')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_ECHO = False
    #SESSION_COOKIE_SECURE = True  # Requires HTTPS
    #SESSION_COOKIE_SAMESITE = 'Strict'
    # Use environment variable for secret key in production
    SECRET_KEY = os.environ.get('SECRET_KEY')    
    if not SECRET_KEY:
        raise ValueError("No SECRET_KEY set for production environment")

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
