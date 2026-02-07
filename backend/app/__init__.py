from flask import Flask, jsonify, request
from flask_login import LoginManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.config import Config
from app.models import db, User
import logging

logger = logging.getLogger(__name__)

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
    
    # Create tables and run idempotent schema migration
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully")
        _migrate_friends_schema(app)

    return app


def _migrate_friends_schema(app):
    """Idempotent migration: add missing columns to friend_requests / friendships.

    db.create_all() does NOT alter existing tables, so if these tables were
    created before the columns were added to models.py the columns will be
    missing.  This function checks information_schema and ADDs only what is
    needed.  No DROP / DELETE / TRUNCATE -- safe for existing data.
    """
    uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if not uri.startswith('mysql'):
        logger.info("Skipping friends-schema migration (non-MySQL backend: %s)", uri.split('://')[0])
        return

    from sqlalchemy import text

    # Log which DB we're actually connected to
    row = db.session.execute(text("SELECT DATABASE()")).fetchone()
    current_db = row[0] if row else '<unknown>'
    logger.info("friends-schema migration running against MySQL database: %s", current_db)
    print(f"🔧 Running friends-schema migration on database: {current_db}")

    def _column_exists(table, column):
        result = db.session.execute(text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema = :db AND table_name = :tbl AND column_name = :col"
        ), {"db": current_db, "tbl": table, "col": column})
        return result.scalar() > 0

    def _index_exists(table, index_name):
        result = db.session.execute(text(
            "SELECT COUNT(*) FROM information_schema.statistics "
            "WHERE table_schema = :db AND table_name = :tbl AND index_name = :idx"
        ), {"db": current_db, "tbl": table, "idx": index_name})
        return result.scalar() > 0

    changes = []

    # -- friend_requests table --------------------------------------------------
    if not _column_exists('friend_requests', 'id'):
        db.session.execute(text(
            "ALTER TABLE friend_requests ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST"
        ))
        changes.append("friend_requests.id")

    if not _column_exists('friend_requests', 'requester_id'):
        db.session.execute(text(
            "ALTER TABLE friend_requests ADD COLUMN requester_id INT NOT NULL"
        ))
        changes.append("friend_requests.requester_id")

    if not _column_exists('friend_requests', 'recipient_id'):
        db.session.execute(text(
            "ALTER TABLE friend_requests ADD COLUMN recipient_id INT NOT NULL"
        ))
        changes.append("friend_requests.recipient_id")

    if not _column_exists('friend_requests', 'status'):
        db.session.execute(text(
            "ALTER TABLE friend_requests ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'"
        ))
        changes.append("friend_requests.status")

    if not _column_exists('friend_requests', 'created_at'):
        db.session.execute(text(
            "ALTER TABLE friend_requests ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"
        ))
        changes.append("friend_requests.created_at")

    # Indexes + FK for friend_requests
    if _column_exists('friend_requests', 'requester_id') and not _index_exists('friend_requests', 'ix_friend_requests_requester_id'):
        db.session.execute(text(
            "ALTER TABLE friend_requests ADD INDEX ix_friend_requests_requester_id (requester_id)"
        ))
        changes.append("friend_requests idx:requester_id")

    if _column_exists('friend_requests', 'recipient_id') and not _index_exists('friend_requests', 'ix_friend_requests_recipient_id'):
        db.session.execute(text(
            "ALTER TABLE friend_requests ADD INDEX ix_friend_requests_recipient_id (recipient_id)"
        ))
        changes.append("friend_requests idx:recipient_id")

    if _column_exists('friend_requests', 'status') and not _index_exists('friend_requests', 'ix_friend_requests_status'):
        db.session.execute(text(
            "ALTER TABLE friend_requests ADD INDEX ix_friend_requests_status (status)"
        ))
        changes.append("friend_requests idx:status")

    if not _index_exists('friend_requests', 'unique_friend_request'):
        try:
            db.session.execute(text(
                "ALTER TABLE friend_requests ADD CONSTRAINT unique_friend_request "
                "UNIQUE (requester_id, recipient_id)"
            ))
            changes.append("friend_requests unique(requester_id, recipient_id)")
        except Exception:
            pass  # constraint may already exist under a different name

    # -- friendships table ------------------------------------------------------
    if not _column_exists('friendships', 'id'):
        db.session.execute(text(
            "ALTER TABLE friendships ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST"
        ))
        changes.append("friendships.id")

    if not _column_exists('friendships', 'user_id'):
        db.session.execute(text(
            "ALTER TABLE friendships ADD COLUMN user_id INT NOT NULL"
        ))
        changes.append("friendships.user_id")

    if not _column_exists('friendships', 'friend_id'):
        db.session.execute(text(
            "ALTER TABLE friendships ADD COLUMN friend_id INT NOT NULL"
        ))
        changes.append("friendships.friend_id")

    if not _column_exists('friendships', 'created_at'):
        db.session.execute(text(
            "ALTER TABLE friendships ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"
        ))
        changes.append("friendships.created_at")

    # Indexes + FK for friendships
    if _column_exists('friendships', 'user_id') and not _index_exists('friendships', 'ix_friendships_user_id'):
        db.session.execute(text(
            "ALTER TABLE friendships ADD INDEX ix_friendships_user_id (user_id)"
        ))
        changes.append("friendships idx:user_id")

    if _column_exists('friendships', 'friend_id') and not _index_exists('friendships', 'ix_friendships_friend_id'):
        db.session.execute(text(
            "ALTER TABLE friendships ADD INDEX ix_friendships_friend_id (friend_id)"
        ))
        changes.append("friendships idx:friend_id")

    if not _index_exists('friendships', 'unique_friendship'):
        try:
            db.session.execute(text(
                "ALTER TABLE friendships ADD CONSTRAINT unique_friendship "
                "UNIQUE (user_id, friend_id)"
            ))
            changes.append("friendships unique(user_id, friend_id)")
        except Exception:
            pass

    db.session.commit()

    if changes:
        msg = "✅ friends-schema migration applied: " + ", ".join(changes)
    else:
        msg = "✅ friends-schema migration: all columns already present, nothing to do"
    logger.info(msg)
    print(msg)
