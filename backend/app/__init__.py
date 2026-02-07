from flask import Flask, jsonify, request
from flask_login import LoginManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import text
from app.config import Config
from app.models import db, User
from app.schema_check import ensure_social_schema

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

def _table_exists(conn, table_name):
    result = conn.execute(
        text(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = :table_name
            """
        ),
        {"table_name": table_name}
    ).scalar()
    return result and result > 0

def _get_columns(conn, table_name):
    rows = conn.execute(
        text(
            """
            SELECT column_name, is_nullable, column_default, extra
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = :table_name
            """
        ),
        {"table_name": table_name}
    ).mappings().all()
    return {row["column_name"]: row for row in rows}

def _get_primary_key_columns(conn, table_name):
    rows = conn.execute(
        text(
            """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
             AND tc.table_name = kcu.table_name
            WHERE tc.table_schema = DATABASE()
              AND tc.table_name = :table_name
              AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY kcu.ordinal_position
            """
        ),
        {"table_name": table_name}
    ).fetchall()
    return [row[0] for row in rows]

def _get_indexes(conn, table_name):
    rows = conn.execute(
        text(
            """
            SELECT index_name,
                   non_unique,
                   GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = :table_name
            GROUP BY index_name, non_unique
            """
        ),
        {"table_name": table_name}
    ).mappings().all()
    return rows

def _has_index(conn, table_name, index_name):
    result = conn.execute(
        text(
            """
            SELECT COUNT(*)
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = :table_name
              AND index_name = :index_name
            """
        ),
        {"table_name": table_name, "index_name": index_name}
    ).scalar()
    return result and result > 0

def _has_unique_index_on_columns(conn, table_name, columns):
    target = ",".join(columns)
    for row in _get_indexes(conn, table_name):
        if row["non_unique"] == 0 and row["columns"] == target:
            return True
    return False

def _ensure_auto_increment_id(conn, table_name, order_by_columns):
    columns = _get_columns(conn, table_name)
    if "id" not in columns:
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN id INT NULL"))
        columns = _get_columns(conn, table_name)

    if "id" in columns:
        conn.execute(text(f"SET @rownum := 0"))
        order_clause = ", ".join(order_by_columns)
        conn.execute(
            text(
                f"""
                UPDATE {table_name}
                SET id = (@rownum := @rownum + 1)
                WHERE id IS NULL
                ORDER BY {order_clause}
                """
            )
        )

        if not _has_unique_index_on_columns(conn, table_name, ["id"]):
            if not _has_index(conn, table_name, f"uniq_{table_name}_id"):
                conn.execute(
                    text(
                        f"CREATE UNIQUE INDEX uniq_{table_name}_id ON {table_name} (id)"
                    )
                )

        columns = _get_columns(conn, table_name)
        if columns["id"]["is_nullable"] == "YES":
            conn.execute(
                text(f"ALTER TABLE {table_name} MODIFY COLUMN id INT NOT NULL")
            )

        if "auto_increment" not in (columns["id"]["extra"] or ""):
            conn.execute(
                text(
                    f"ALTER TABLE {table_name} MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT"
                )
            )

        primary_keys = _get_primary_key_columns(conn, table_name)
        if not primary_keys:
            conn.execute(text(f"ALTER TABLE {table_name} ADD PRIMARY KEY (id)"))

def _ensure_friend_requests_schema(conn):
    if not _table_exists(conn, "friend_requests"):
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS friend_requests (
                    id INT NOT NULL AUTO_INCREMENT,
                    requester_id INT NOT NULL,
                    recipient_id INT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    created_at DATETIME,
                    PRIMARY KEY (id)
                )
                """
            )
        )

    columns = _get_columns(conn, "friend_requests")
    if "requester_id" not in columns:
        conn.execute(text("ALTER TABLE friend_requests ADD COLUMN requester_id INT NULL"))
        columns = _get_columns(conn, "friend_requests")
        if "sender_id" in columns:
            conn.execute(
                text(
                    """
                    UPDATE friend_requests
                    SET requester_id = sender_id
                    WHERE requester_id IS NULL
                    """
                )
            )

    if "recipient_id" not in columns:
        conn.execute(text("ALTER TABLE friend_requests ADD COLUMN recipient_id INT NULL"))
        columns = _get_columns(conn, "friend_requests")
        if "receiver_id" in columns:
            conn.execute(
                text(
                    """
                    UPDATE friend_requests
                    SET recipient_id = receiver_id
                    WHERE recipient_id IS NULL
                    """
                )
            )

    if "status" not in columns:
        conn.execute(
            text(
                "ALTER TABLE friend_requests ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'"
            )
        )
    else:
        conn.execute(
            text(
                """
                UPDATE friend_requests
                SET status = 'pending'
                WHERE status IS NULL
                """
            )
        )

    if "created_at" not in columns:
        conn.execute(text("ALTER TABLE friend_requests ADD COLUMN created_at DATETIME"))

    _ensure_auto_increment_id(conn, "friend_requests", ["created_at", "requester_id", "recipient_id"])

    columns = _get_columns(conn, "friend_requests")
    if "requester_id" in columns and columns["requester_id"]["is_nullable"] == "YES":
        nulls = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM friend_requests
                WHERE requester_id IS NULL
                """
            )
        ).scalar()
        if nulls == 0:
            conn.execute(
                text(
                    "ALTER TABLE friend_requests MODIFY COLUMN requester_id INT NOT NULL"
                )
            )

    if "recipient_id" in columns and columns["recipient_id"]["is_nullable"] == "YES":
        nulls = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM friend_requests
                WHERE recipient_id IS NULL
                """
            )
        ).scalar()
        if nulls == 0:
            conn.execute(
                text(
                    "ALTER TABLE friend_requests MODIFY COLUMN recipient_id INT NOT NULL"
                )
            )

    if not _has_unique_index_on_columns(
        conn, "friend_requests", ["requester_id", "recipient_id"]
    ):
        if not _has_index(conn, "friend_requests", "unique_friend_request"):
            conn.execute(
                text(
                    """
                    CREATE UNIQUE INDEX unique_friend_request
                    ON friend_requests (requester_id, recipient_id)
                    """
                )
            )

def _ensure_friendships_schema(conn):
    if not _table_exists(conn, "friendships"):
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS friendships (
                    id INT NOT NULL AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    friend_id INT NOT NULL,
                    created_at DATETIME,
                    PRIMARY KEY (id)
                )
                """
            )
        )

    columns = _get_columns(conn, "friendships")
    if "user_id" not in columns:
        conn.execute(text("ALTER TABLE friendships ADD COLUMN user_id INT NULL"))
        columns = _get_columns(conn, "friendships")

    if "friend_id" not in columns:
        conn.execute(text("ALTER TABLE friendships ADD COLUMN friend_id INT NULL"))
        columns = _get_columns(conn, "friendships")

    if "created_at" not in columns:
        conn.execute(text("ALTER TABLE friendships ADD COLUMN created_at DATETIME"))

    _ensure_auto_increment_id(conn, "friendships", ["user_id", "friend_id"])

    if not _has_unique_index_on_columns(conn, "friendships", ["user_id", "friend_id"]):
        if not _has_index(conn, "friendships", "unique_friendship"):
            conn.execute(
                text(
                    """
                    CREATE UNIQUE INDEX unique_friendship
                    ON friendships (user_id, friend_id)
                    """
                )
            )

    columns = _get_columns(conn, "friendships")
    if "user_id" in columns and columns["user_id"]["is_nullable"] == "YES":
        nulls = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM friendships
                WHERE user_id IS NULL
                """
            )
        ).scalar()
        if nulls == 0:
            conn.execute(
                text("ALTER TABLE friendships MODIFY COLUMN user_id INT NOT NULL")
            )

    if "friend_id" in columns and columns["friend_id"]["is_nullable"] == "YES":
        nulls = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM friendships
                WHERE friend_id IS NULL
                """
            )
        ).scalar()
        if nulls == 0:
            conn.execute(
                text("ALTER TABLE friendships MODIFY COLUMN friend_id INT NOT NULL")
            )

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
