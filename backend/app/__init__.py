from flask import Flask, jsonify, request
from flask_login import LoginManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
from sqlalchemy import text
from app.config import Config
from app.models import db, User
from app.schema_check import ensure_social_schema

def get_real_client_ip():
    """Get the real client IP when behind Cloudflare or other reverse proxies."""
    # Cloudflare sets CF-Connecting-IP to the actual visitor IP
    cf_ip = request.headers.get('CF-Connecting-IP')
    if cf_ip:
        return cf_ip
    # Fall back to X-Forwarded-For (first entry is the client)
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return get_remote_address()

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
    ).fetchall()
    result = {}
    for row in rows:
        result[row[0]] = {
            "column_name": row[0],
            "is_nullable": row[1],
            "column_default": row[2],
            "extra": row[3],
        }
    return result

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
    ).fetchall()
    result = []
    for row in rows:
        result.append({
            "index_name": row[0],
            "non_unique": row[1],
            "columns": row[2],
        })
    return result

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
                    sender_id INT NOT NULL,
                    receiver_id INT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    created_at DATETIME,
                    PRIMARY KEY (id)
                )
                """
            )
        )

    columns = _get_columns(conn, "friend_requests")
    if "sender_id" not in columns:
        conn.execute(text("ALTER TABLE friend_requests ADD COLUMN sender_id INT NULL"))
        columns = _get_columns(conn, "friend_requests")
        if "requester_id" in columns:
            conn.execute(
                text(
                    """
                    UPDATE friend_requests
                    SET sender_id = requester_id
                    WHERE sender_id IS NULL
                    """
                )
            )

    if "receiver_id" not in columns:
        conn.execute(text("ALTER TABLE friend_requests ADD COLUMN receiver_id INT NULL"))
        columns = _get_columns(conn, "friend_requests")
        if "recipient_id" in columns:
            conn.execute(
                text(
                    """
                    UPDATE friend_requests
                    SET receiver_id = recipient_id
                    WHERE receiver_id IS NULL
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

    _ensure_auto_increment_id(conn, "friend_requests", ["created_at", "sender_id", "receiver_id"])

    columns = _get_columns(conn, "friend_requests")
    if "sender_id" in columns and columns["sender_id"]["is_nullable"] == "YES":
        nulls = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM friend_requests
                WHERE sender_id IS NULL
                """
            )
        ).scalar()
        if nulls == 0:
            conn.execute(
                text(
                    "ALTER TABLE friend_requests MODIFY COLUMN sender_id INT NOT NULL"
                )
            )

    if "receiver_id" in columns and columns["receiver_id"]["is_nullable"] == "YES":
        nulls = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM friend_requests
                WHERE receiver_id IS NULL
                """
            )
        ).scalar()
        if nulls == 0:
            conn.execute(
                text(
                    "ALTER TABLE friend_requests MODIFY COLUMN receiver_id INT NOT NULL"
                )
            )

    if not _has_unique_index_on_columns(
        conn, "friend_requests", ["sender_id", "receiver_id"]
    ):
        if not _has_index(conn, "friend_requests", "unique_friend_request"):
            conn.execute(
                text(
                    """
                    CREATE UNIQUE INDEX unique_friend_request
                    ON friend_requests (sender_id, receiver_id)
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

def _ensure_recipe_reviews_schema(conn):
    if not _table_exists(conn, "recipe_reviews"):
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS recipe_reviews (
                    id INT NOT NULL AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    recipe_id INT NOT NULL,
                    rating INT NOT NULL,
                    review_text TEXT,
                    created_at DATETIME,
                    updated_at DATETIME,
                    PRIMARY KEY (id),
                    UNIQUE KEY unique_user_recipe_review (user_id, recipe_id),
                    INDEX idx_recipe_reviews_recipe (recipe_id),
                    INDEX idx_recipe_reviews_user (user_id)
                )
                """
            )
        )

def ensure_social_schema():
    with db.engine.begin() as conn:
        _ensure_friend_requests_schema(conn)
        _ensure_friendships_schema(conn)
        _ensure_recipe_reviews_schema(conn)

def _ensure_pantry_and_recipe_schema():
    """Add new columns for pantry categories, serving info, and recipe serving_size."""
    with db.engine.begin() as conn:
        # -- pantry_items new columns --
        if _table_exists(conn, 'pantry_items'):
            cols = _get_columns(conn, 'pantry_items')
            if 'category' not in cols:
                conn.execute(text(
                    "ALTER TABLE pantry_items ADD COLUMN category VARCHAR(64) NOT NULL DEFAULT 'Other'"
                ))
            if 'serving_size' not in cols:
                conn.execute(text(
                    "ALTER TABLE pantry_items ADD COLUMN serving_size VARCHAR(100) DEFAULT NULL"
                ))
            if 'servings_per_container' not in cols:
                conn.execute(text(
                    "ALTER TABLE pantry_items ADD COLUMN servings_per_container FLOAT DEFAULT NULL"
                ))
            if 'container_type' not in cols:
                conn.execute(text(
                    "ALTER TABLE pantry_items ADD COLUMN container_type VARCHAR(50) DEFAULT NULL"
                ))
            if not _has_index(conn, 'pantry_items', 'idx_pantry_items_category'):
                conn.execute(text(
                    "CREATE INDEX idx_pantry_items_category ON pantry_items (category)"
                ))

        # -- recipes new columns --
        if _table_exists(conn, 'recipes'):
            cols = _get_columns(conn, 'recipes')
            if 'serving_size' not in cols:
                conn.execute(text(
                    "ALTER TABLE recipes ADD COLUMN serving_size VARCHAR(100) DEFAULT NULL"
                ))
            if 'source_url' not in cols:
                conn.execute(text(
                    "ALTER TABLE recipes ADD COLUMN source_url VARCHAR(500) DEFAULT NULL"
                ))

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Apply ProxyFix so Flask trusts X-Forwarded-* headers from Cloudflare /
    # reverse proxies.  This fixes request.remote_addr, request.scheme, and
    # request.host when running behind Cloudflare or any L7 proxy.
    app.wsgi_app = ProxyFix(
        app.wsgi_app,
        x_for=1,       # trust one level of X-Forwarded-For
        x_proto=1,     # trust X-Forwarded-Proto  (https behind CF)
        x_host=1,      # trust X-Forwarded-Host
        x_port=1,      # trust X-Forwarded-Port
    )

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    CORS(app, supports_credentials=True)

    # Initialize rate limiter using the *real* client IP behind Cloudflare
    limiter = Limiter(
        key_func=get_real_client_ip,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://",
    )

    # DEV MODE: disable limiter so it doesn't spam 429 while you're building
    if app.debug:
        limiter.enabled = False
    else:
        limiter.init_app(app)

    # Register blueprints
    from app.routes import main_bp, api_bp
    from app.auth import auth_bp

    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(main_bp)  # Register main blueprint last for catch-all route

    # Register CLI commands
    from app.tasks import register_cli
    register_cli(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # --- Health-check endpoint (used by Cloudflare, uptime monitors, etc.) ---
    @app.route('/health')
    def health_check():
        try:
            db.session.execute(text('SELECT 1'))
            return jsonify({'status': 'ok'}), 200
        except Exception:
            return jsonify({'status': 'error', 'detail': 'database'}), 503

    # --- Keep-alive / proxy-friendly response headers ---
    @app.after_request
    def add_proxy_headers(response):
        # Tell Cloudflare & browsers the connection can be reused
        response.headers.setdefault('Connection', 'keep-alive')
        # Prevent Cloudflare from caching authenticated API responses
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        return response

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
        _ensure_pantry_and_recipe_schema()
        print("Database tables created successfully")

    return app
