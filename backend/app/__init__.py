from flask import Flask, jsonify, request
from flask_login import LoginManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.config import Config
from app.models import db, User
import logging
import os
import sys

logger = logging.getLogger(__name__)


def _setup_logging(app):
    """Configure logging to both console and file with clear error formatting."""
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, 'foodapp.log')

    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    ))

    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(logging.Formatter(
        '\n!!!! %(levelname)s !!!! %(name)s: %(message)s\n'
    ))

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    # Avoid duplicating handlers on reloads
    if not any(isinstance(h, logging.FileHandler) and getattr(h, 'baseFilename', '') == os.path.abspath(log_file) for h in root.handlers):
        root.addHandler(file_handler)
    if not any(isinstance(h, logging.StreamHandler) and h.stream is sys.stderr for h in root.handlers):
        root.addHandler(console_handler)

    app.logger.info("Logging initialised -- file: %s", log_file)
    print(f"  Log file: {log_file}")


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

    # Set up logging FIRST so everything else is captured
    _setup_logging(app)

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
        print("  Database tables created successfully")
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
    print(f"  Running friends-schema migration on database: {current_db}")

    # ── helper functions ─────────────────────────────────────────────────

    def _table_exists(table):
        r = db.session.execute(text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = :db AND table_name = :tbl"
        ), {"db": current_db, "tbl": table})
        return r.scalar() > 0

    def _column_exists(table, column):
        r = db.session.execute(text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema = :db AND table_name = :tbl AND column_name = :col"
        ), {"db": current_db, "tbl": table, "col": column})
        return r.scalar() > 0

    def _has_primary_key(table):
        r = db.session.execute(text(
            "SELECT COUNT(*) FROM information_schema.table_constraints "
            "WHERE table_schema = :db AND table_name = :tbl "
            "AND constraint_type = 'PRIMARY KEY'"
        ), {"db": current_db, "tbl": table})
        return r.scalar() > 0

    def _index_exists(table, index_name):
        r = db.session.execute(text(
            "SELECT COUNT(*) FROM information_schema.statistics "
            "WHERE table_schema = :db AND table_name = :tbl AND index_name = :idx"
        ), {"db": current_db, "tbl": table, "idx": index_name})
        return r.scalar() > 0

    def _safe_add_column(table, column, col_def, changes):
        """Add a column only if it doesn't already exist."""
        if not _column_exists(table, column):
            db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_def}"))
            changes.append(f"{table}.{column}")

    def _safe_add_id_pk(table, changes):
        """Add `id INT AUTO_INCREMENT PRIMARY KEY` only if the table has no PK
        AND no `id` column yet.  If a PK already exists, drop it first then
        add id as the new PK in a single atomic ALTER statement.
        """
        if _column_exists(table, 'id'):
            return  # nothing to do
        if _has_primary_key(table):
            # Table already has a PK (composite or other) -- drop it and
            # add id as the new PK in one statement.
            db.session.execute(text(
                f"ALTER TABLE {table} DROP PRIMARY KEY, "
                f"ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST"
            ))
            changes.append(f"{table}.id (replaced old PK)")
        else:
            db.session.execute(text(
                f"ALTER TABLE {table} ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST"
            ))
            changes.append(f"{table}.id")

    def _safe_add_index(table, column, idx_name, changes):
        if _column_exists(table, column) and not _index_exists(table, idx_name):
            db.session.execute(text(
                f"ALTER TABLE {table} ADD INDEX {idx_name} ({column})"
            ))
            changes.append(f"{table} idx:{column}")

    def _safe_add_unique(table, columns, constraint_name, changes):
        if not _index_exists(table, constraint_name):
            try:
                cols = ", ".join(columns)
                db.session.execute(text(
                    f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} UNIQUE ({cols})"
                ))
                changes.append(f"{table} unique({cols})")
            except Exception:
                pass  # constraint may exist under a different name

    changes = []

    # ── friend_requests ──────────────────────────────────────────────────
    if not _table_exists('friend_requests'):
        db.session.execute(text(
            "CREATE TABLE friend_requests ("
            "  id INT AUTO_INCREMENT PRIMARY KEY,"
            "  requester_id INT NOT NULL,"
            "  recipient_id INT NOT NULL,"
            "  status VARCHAR(20) NOT NULL DEFAULT 'pending',"
            "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,"
            "  INDEX ix_friend_requests_requester_id (requester_id),"
            "  INDEX ix_friend_requests_recipient_id (recipient_id),"
            "  INDEX ix_friend_requests_status (status),"
            "  CONSTRAINT unique_friend_request UNIQUE (requester_id, recipient_id)"
            ") ENGINE=InnoDB"
        ))
        changes.append("friend_requests (created table)")
    else:
        _safe_add_id_pk('friend_requests', changes)
        _safe_add_column('friend_requests', 'requester_id', 'requester_id INT NOT NULL', changes)
        _safe_add_column('friend_requests', 'recipient_id', 'recipient_id INT NOT NULL', changes)
        _safe_add_column('friend_requests', 'status', "status VARCHAR(20) NOT NULL DEFAULT 'pending'", changes)
        _safe_add_column('friend_requests', 'created_at', 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP', changes)
        _safe_add_index('friend_requests', 'requester_id', 'ix_friend_requests_requester_id', changes)
        _safe_add_index('friend_requests', 'recipient_id', 'ix_friend_requests_recipient_id', changes)
        _safe_add_index('friend_requests', 'status', 'ix_friend_requests_status', changes)
        _safe_add_unique('friend_requests', ['requester_id', 'recipient_id'], 'unique_friend_request', changes)

    # ── friendships ──────────────────────────────────────────────────────
    if not _table_exists('friendships'):
        db.session.execute(text(
            "CREATE TABLE friendships ("
            "  id INT AUTO_INCREMENT PRIMARY KEY,"
            "  user_id INT NOT NULL,"
            "  friend_id INT NOT NULL,"
            "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,"
            "  INDEX ix_friendships_user_id (user_id),"
            "  INDEX ix_friendships_friend_id (friend_id),"
            "  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)"
            ") ENGINE=InnoDB"
        ))
        changes.append("friendships (created table)")
    else:
        _safe_add_id_pk('friendships', changes)
        _safe_add_column('friendships', 'user_id', 'user_id INT NOT NULL', changes)
        _safe_add_column('friendships', 'friend_id', 'friend_id INT NOT NULL', changes)
        _safe_add_column('friendships', 'created_at', 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP', changes)
        _safe_add_index('friendships', 'user_id', 'ix_friendships_user_id', changes)
        _safe_add_index('friendships', 'friend_id', 'ix_friendships_friend_id', changes)
        _safe_add_unique('friendships', ['user_id', 'friend_id'], 'unique_friendship', changes)

    db.session.commit()

    if changes:
        msg = "  Migration applied: " + ", ".join(changes)
    else:
        msg = "  Migration: all columns already present, nothing to do"
    logger.info(msg)
    print(msg)
