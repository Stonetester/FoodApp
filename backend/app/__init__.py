from flask import Flask, jsonify, request
from flask_login import LoginManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.config import Config
from app.models import db, User
from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError

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

def ensure_social_schema():
    inspector = inspect(db.engine)
    dialect = db.engine.dialect.name

    def has_column(table_name, column_name):
        return column_name in {col["name"] for col in inspector.get_columns(table_name)}

    def add_column(table_name, column_sql):
        try:
            db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}"))
            db.session.commit()
        except OperationalError as error:
            message = str(error).lower()
            if "multiple primary key" in message:
                db.session.rollback()
                return
            db.session.rollback()
            raise

    if inspector.has_table("friendships"):
        if not has_column("friendships", "id"):
            add_column("friendships", "id INTEGER")
        if not has_column("friendships", "user_id"):
            add_column("friendships", "user_id INTEGER")
        if not has_column("friendships", "friend_id"):
            add_column("friendships", "friend_id INTEGER")
        if not has_column("friendships", "created_at"):
            add_column("friendships", "created_at DATETIME")

    if inspector.has_table("friend_requests"):
        if not has_column("friend_requests", "id"):
            add_column("friend_requests", "id INTEGER")
        if not has_column("friend_requests", "requester_id"):
            add_column("friend_requests", "requester_id INTEGER")
        if not has_column("friend_requests", "recipient_id"):
            add_column("friend_requests", "recipient_id INTEGER")
        if not has_column("friend_requests", "status"):
            add_column("friend_requests", "status VARCHAR(20)")
        if not has_column("friend_requests", "created_at"):
            add_column("friend_requests", "created_at DATETIME")
