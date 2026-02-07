from flask import Flask, jsonify, request
from flask_login import LoginManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import inspect, text
from app.config import Config
from app.models import db, User

login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'

@login_manager.unauthorized_handler
def unauthorized():
    """Return JSON error for unauthorized API requests"""
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Authentication required. Please log in.'}), 401
    # For non-API routes, redirect to login (handled by login_view)
    from flask import redirect, url_for
    return redirect(url_for('auth.login'))

def _get_columns(conn, table_name):
    try:
        inspector = inspect(conn)
        columns = inspector.get_columns(table_name)
    except Exception as exc:
        print(f"❌ Schema check failed in _get_columns for {table_name}")
        raise RuntimeError(f"Schema check failed in _get_columns for {table_name}") from exc
    return {column["name"]: column for column in columns}

def _get_indexes(conn, table_name):
    try:
        inspector = inspect(conn)
        return inspector.get_indexes(table_name)
    except Exception as exc:
        print(f"❌ Schema check failed in _get_indexes for {table_name}")
        raise RuntimeError(f"Schema check failed in _get_indexes for {table_name}") from exc

def _ensure_friend_requests_schema(conn):
    columns = _get_columns(conn, "friend_requests")
    if "sender_id" in columns and "requester_id" in columns:
        try:
            conn.execute(
                text(
                    """
                    UPDATE friend_requests
                    SET sender_id = requester_id
                    WHERE sender_id IS NULL AND requester_id IS NOT NULL
                    """
                )
            )
        except Exception as exc:
            print("❌ Failed backfilling sender_id from requester_id")
            raise RuntimeError("Failed backfilling sender_id from requester_id") from exc

    if "receiver_id" in columns and "recipient_id" in columns:
        try:
            conn.execute(
                text(
                    """
                    UPDATE friend_requests
                    SET receiver_id = recipient_id
                    WHERE receiver_id IS NULL AND recipient_id IS NOT NULL
                    """
                )
            )
        except Exception as exc:
            print("❌ Failed backfilling receiver_id from recipient_id")
            raise RuntimeError("Failed backfilling receiver_id from recipient_id") from exc

def _ensure_friendships_schema(conn):
    _get_columns(conn, "friendships")

def ensure_social_schema():
    with db.engine.begin() as conn:
        _ensure_friend_requests_schema(conn)
        _ensure_friendships_schema(conn)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    CORS(app, supports_credentials=True)
    
    # Initialize rate limiter for security
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://"
    )
    
    # Register blueprints
    from app.routes import main_bp, api_bp
    from app.auth import auth_bp
    
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(main_bp)  # Register main blueprint last for catch-all route
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Error handler for API routes to always return JSON
    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Endpoint not found'}), 404
        return error
    
    @app.errorhandler(500)
    def internal_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal server error'}), 500
        return error
    
    # Create tables
    with app.app_context():
        db.create_all()
        ensure_social_schema()
        print("✅ Database tables created successfully")
    
    return app
