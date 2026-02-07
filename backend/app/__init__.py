from flask import Flask, jsonify, request
from flask_login import LoginManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import text
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

def _execute_mappings(conn, sql_text, params, context):
    try:
        return conn.execute(text(sql_text), params).mappings().all()
    except Exception as exc:
        print(f"❌ Schema check failed in {context}. SQL: {sql_text} params={params}")
        raise RuntimeError(f"Schema check failed in {context}") from exc

def _execute_scalar(conn, sql_text, params, context):
    try:
        return conn.execute(text(sql_text), params).scalar()
    except Exception as exc:
        print(f"❌ Schema check failed in {context}. SQL: {sql_text} params={params}")
        raise RuntimeError(f"Schema check failed in {context}") from exc

def _table_exists(conn, table_name):
    result = _execute_scalar(
        conn,
        """
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = :table_name
        """,
        {"table_name": table_name},
        "_table_exists",
    )
    return result and result > 0

def _get_columns(conn, table_name):
    rows = _execute_mappings(
        conn,
        """
        SELECT column_name, is_nullable, column_default, extra
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = :table_name
        """,
        {"table_name": table_name},
        "_get_columns",
    )
    try:
        return {row["column_name"]: row for row in rows}
    except Exception as exc:
        if rows:
            print(f"⚠️ Unexpected column row structure: {list(rows[0].keys())}")
        raise RuntimeError("Unexpected column row structure in _get_columns") from exc

def _get_primary_key_columns(conn, table_name):
    rows = _execute_mappings(
        conn,
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
        """,
        {"table_name": table_name},
        "_get_primary_key_columns",
    )
    return [row["column_name"] for row in rows]

def _get_indexes(conn, table_name):
    return _execute_mappings(
        conn,
        """
        SELECT index_name,
               non_unique,
               GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = :table_name
        GROUP BY index_name, non_unique
        """,
        {"table_name": table_name},
        "_get_indexes",
    )

def _has_index(conn, table_name, index_name):
    result = _execute_scalar(
        conn,
        """
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = :table_name
          AND index_name = :index_name
        """,
        {"table_name": table_name, "index_name": index_name},
        "_has_index",
    )
    return result and result > 0

def _has_unique_index_on_columns(conn, table_name, columns):
    target = ",".join(columns)
    for row in _get_indexes(conn, table_name):
        if row["non_unique"] == 0 and row["columns"] == target:
            return True
    return False

def _has_non_primary_unique_index_on_columns(conn, table_name, columns):
    target = ",".join(columns)
    for row in _get_indexes(conn, table_name):
        if row["index_name"] == "PRIMARY":
            continue
        if row["non_unique"] == 0 and row["columns"] == target:
            return True
    return False

def _ensure_auto_increment_id(conn, table_name, order_by_columns, legacy_pk_columns=None):
    legacy_pk_columns = legacy_pk_columns or []
    columns = _get_columns(conn, table_name)
    if "id" not in columns:
        try:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN id INT NULL"))
        except Exception as exc:
            print(f"❌ Failed adding id column on {table_name}")
            raise RuntimeError(f"Failed adding id column on {table_name}") from exc
        columns = _get_columns(conn, table_name)

    if "id" in columns:
        try:
            conn.execute(text("SET @rownum := 0"))
        except Exception as exc:
            print(f"❌ Failed initializing rownum for {table_name}")
            raise RuntimeError(f"Failed initializing rownum for {table_name}") from exc
        order_clause = ", ".join(order_by_columns)
        try:
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
        except Exception as exc:
            print(f"❌ Failed backfilling id for {table_name}")
            raise RuntimeError(f"Failed backfilling id for {table_name}") from exc

        if not _has_unique_index_on_columns(conn, table_name, ["id"]):
            if not _has_index(conn, table_name, f"uniq_{table_name}_id"):
                try:
                    conn.execute(
                        text(
                            f"CREATE UNIQUE INDEX uniq_{table_name}_id ON {table_name} (id)"
                        )
                    )
                except Exception as exc:
                    print(f"❌ Failed creating unique id index on {table_name}")
                    raise RuntimeError(
                        f"Failed creating unique id index on {table_name}"
                    ) from exc

        columns = _get_columns(conn, table_name)
        if columns["id"]["is_nullable"] == "YES":
            try:
                conn.execute(
                    text(f"ALTER TABLE {table_name} MODIFY COLUMN id INT NOT NULL")
                )
            except Exception as exc:
                print(f"❌ Failed setting id NOT NULL on {table_name}")
                raise RuntimeError(
                    f"Failed setting id NOT NULL on {table_name}"
                ) from exc

        if "auto_increment" not in (columns["id"]["extra"] or ""):
            try:
                conn.execute(
                    text(
                        f"ALTER TABLE {table_name} MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT"
                    )
                )
            except Exception as exc:
                print(f"❌ Failed setting AUTO_INCREMENT on {table_name}")
                raise RuntimeError(
                    f"Failed setting AUTO_INCREMENT on {table_name}"
                ) from exc

        primary_keys = _get_primary_key_columns(conn, table_name)
        if primary_keys and primary_keys != ["id"]:
            if legacy_pk_columns and primary_keys == legacy_pk_columns:
                try:
                    conn.execute(text(f"ALTER TABLE {table_name} DROP PRIMARY KEY"))
                except Exception as exc:
                    print(f"❌ Failed dropping legacy PK on {table_name}")
                    raise RuntimeError(
                        f"Failed dropping legacy PK on {table_name}"
                    ) from exc
                if not _has_non_primary_unique_index_on_columns(conn, table_name, primary_keys):
                    legacy_index_name = f"uniq_{table_name}_" + "_".join(primary_keys)
                    if not _has_index(conn, table_name, legacy_index_name):
                        try:
                            conn.execute(
                                text(
                                    f"CREATE UNIQUE INDEX {legacy_index_name} "
                                    f"ON {table_name} ({', '.join(primary_keys)})"
                                )
                            )
                        except Exception as exc:
                            print(f"❌ Failed creating legacy unique index on {table_name}")
                            raise RuntimeError(
                                f"Failed creating legacy unique index on {table_name}"
                            ) from exc
                primary_keys = _get_primary_key_columns(conn, table_name)
        if not primary_keys:
            try:
                conn.execute(text(f"ALTER TABLE {table_name} ADD PRIMARY KEY (id)"))
            except Exception as exc:
                print(f"❌ Failed adding primary key on {table_name}")
                raise RuntimeError(f"Failed adding primary key on {table_name}") from exc

def _ensure_friend_requests_schema(conn):
    if not _table_exists(conn, "friend_requests"):
        try:
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
        except Exception as exc:
            print("❌ Failed creating friend_requests")
            raise RuntimeError("Failed creating friend_requests") from exc

    columns = _get_columns(conn, "friend_requests")
    if "requester_id" not in columns:
        try:
            conn.execute(text("ALTER TABLE friend_requests ADD COLUMN requester_id INT NULL"))
        except Exception as exc:
            print("❌ Failed adding requester_id to friend_requests")
            raise RuntimeError("Failed adding requester_id to friend_requests") from exc
        columns = _get_columns(conn, "friend_requests")
        if "sender_id" in columns:
            try:
                conn.execute(
                    text(
                        """
                        UPDATE friend_requests
                        SET requester_id = sender_id
                        WHERE requester_id IS NULL
                        """
                    )
                )
            except Exception as exc:
                print("❌ Failed backfilling requester_id from sender_id")
                raise RuntimeError("Failed backfilling requester_id from sender_id") from exc

    if "recipient_id" not in columns:
        try:
            conn.execute(text("ALTER TABLE friend_requests ADD COLUMN recipient_id INT NULL"))
        except Exception as exc:
            print("❌ Failed adding recipient_id to friend_requests")
            raise RuntimeError("Failed adding recipient_id to friend_requests") from exc
        columns = _get_columns(conn, "friend_requests")
        if "receiver_id" in columns:
            try:
                conn.execute(
                    text(
                        """
                        UPDATE friend_requests
                        SET recipient_id = receiver_id
                        WHERE recipient_id IS NULL
                        """
                    )
                )
            except Exception as exc:
                print("❌ Failed backfilling recipient_id from receiver_id")
                raise RuntimeError("Failed backfilling recipient_id from receiver_id") from exc

    if "status" not in columns:
        try:
            conn.execute(
                text(
                    "ALTER TABLE friend_requests ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'"
                )
            )
        except Exception as exc:
            print("❌ Failed adding status to friend_requests")
            raise RuntimeError("Failed adding status to friend_requests") from exc
    else:
        try:
            conn.execute(
                text(
                    """
                    UPDATE friend_requests
                    SET status = 'pending'
                    WHERE status IS NULL
                    """
                )
            )
        except Exception as exc:
            print("❌ Failed normalizing status for friend_requests")
            raise RuntimeError("Failed normalizing status for friend_requests") from exc

    if "created_at" not in columns:
        try:
            conn.execute(text("ALTER TABLE friend_requests ADD COLUMN created_at DATETIME"))
        except Exception as exc:
            print("❌ Failed adding created_at to friend_requests")
            raise RuntimeError("Failed adding created_at to friend_requests") from exc

    _ensure_auto_increment_id(
        conn,
        "friend_requests",
        ["created_at", "requester_id", "recipient_id"],
        legacy_pk_columns=["requester_id", "recipient_id"],
    )

    columns = _get_columns(conn, "friend_requests")
    if "requester_id" in columns and columns["requester_id"]["is_nullable"] == "YES":
        nulls = _execute_scalar(
            conn,
            """
            SELECT COUNT(*)
            FROM friend_requests
            WHERE requester_id IS NULL
            """,
            {},
            "friend_requests requester_id null check",
        )
        if nulls == 0:
            try:
                conn.execute(
                    text(
                        "ALTER TABLE friend_requests MODIFY COLUMN requester_id INT NOT NULL"
                    )
                )
            except Exception as exc:
                print("❌ Failed setting requester_id NOT NULL")
                raise RuntimeError("Failed setting requester_id NOT NULL") from exc

    if "recipient_id" in columns and columns["recipient_id"]["is_nullable"] == "YES":
        nulls = _execute_scalar(
            conn,
            """
            SELECT COUNT(*)
            FROM friend_requests
            WHERE recipient_id IS NULL
            """,
            {},
            "friend_requests recipient_id null check",
        )
        if nulls == 0:
            try:
                conn.execute(
                    text(
                        "ALTER TABLE friend_requests MODIFY COLUMN recipient_id INT NOT NULL"
                    )
                )
            except Exception as exc:
                print("❌ Failed setting recipient_id NOT NULL")
                raise RuntimeError("Failed setting recipient_id NOT NULL") from exc

    if not _has_unique_index_on_columns(
        conn, "friend_requests", ["requester_id", "recipient_id"]
    ):
        if not _has_index(conn, "friend_requests", "unique_friend_request"):
            try:
                conn.execute(
                    text(
                        """
                        CREATE UNIQUE INDEX unique_friend_request
                        ON friend_requests (requester_id, recipient_id)
                        """
                    )
                )
            except Exception as exc:
                print("❌ Failed creating unique_friend_request index")
                raise RuntimeError("Failed creating unique_friend_request index") from exc

def _ensure_friendships_schema(conn):
    if not _table_exists(conn, "friendships"):
        try:
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
        except Exception as exc:
            print("❌ Failed creating friendships")
            raise RuntimeError("Failed creating friendships") from exc

    columns = _get_columns(conn, "friendships")
    if "user_id" not in columns:
        try:
            conn.execute(text("ALTER TABLE friendships ADD COLUMN user_id INT NULL"))
        except Exception as exc:
            print("❌ Failed adding user_id to friendships")
            raise RuntimeError("Failed adding user_id to friendships") from exc
        columns = _get_columns(conn, "friendships")

    if "friend_id" not in columns:
        try:
            conn.execute(text("ALTER TABLE friendships ADD COLUMN friend_id INT NULL"))
        except Exception as exc:
            print("❌ Failed adding friend_id to friendships")
            raise RuntimeError("Failed adding friend_id to friendships") from exc
        columns = _get_columns(conn, "friendships")

    if "created_at" not in columns:
        try:
            conn.execute(text("ALTER TABLE friendships ADD COLUMN created_at DATETIME"))
        except Exception as exc:
            print("❌ Failed adding created_at to friendships")
            raise RuntimeError("Failed adding created_at to friendships") from exc

    _ensure_auto_increment_id(
        conn,
        "friendships",
        ["user_id", "friend_id"],
        legacy_pk_columns=["user_id", "friend_id"],
    )

    if not _has_unique_index_on_columns(conn, "friendships", ["user_id", "friend_id"]):
        if not _has_index(conn, "friendships", "unique_friendship"):
            try:
                conn.execute(
                    text(
                        """
                        CREATE UNIQUE INDEX unique_friendship
                        ON friendships (user_id, friend_id)
                        """
                    )
                )
            except Exception as exc:
                print("❌ Failed creating unique_friendship index")
                raise RuntimeError("Failed creating unique_friendship index") from exc

    columns = _get_columns(conn, "friendships")
    if "user_id" in columns and columns["user_id"]["is_nullable"] == "YES":
        nulls = _execute_scalar(
            conn,
            """
            SELECT COUNT(*)
            FROM friendships
            WHERE user_id IS NULL
            """,
            {},
            "friendships user_id null check",
        )
        if nulls == 0:
            try:
                conn.execute(
                    text("ALTER TABLE friendships MODIFY COLUMN user_id INT NOT NULL")
                )
            except Exception as exc:
                print("❌ Failed setting user_id NOT NULL")
                raise RuntimeError("Failed setting user_id NOT NULL") from exc

    if "friend_id" in columns and columns["friend_id"]["is_nullable"] == "YES":
        nulls = _execute_scalar(
            conn,
            """
            SELECT COUNT(*)
            FROM friendships
            WHERE friend_id IS NULL
            """,
            {},
            "friendships friend_id null check",
        )
        if nulls == 0:
            try:
                conn.execute(
                    text("ALTER TABLE friendships MODIFY COLUMN friend_id INT NOT NULL")
                )
            except Exception as exc:
                print("❌ Failed setting friend_id NOT NULL")
                raise RuntimeError("Failed setting friend_id NOT NULL") from exc

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
