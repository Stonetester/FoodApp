import os

from flask import Flask, jsonify, request
from flask_login import LoginManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import text, inspect as sa_inspect
from app.models import db, User

login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'

# Rate limiter — no global default; applied per-route (auth endpoints)
limiter = Limiter(key_func=get_remote_address, storage_uri='memory://')


@login_manager.unauthorized_handler
def unauthorized():
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Authentication required. Please log in.'}), 401
    from flask import redirect, url_for
    return redirect(url_for('auth.login'))


def _migrate_columns():
    """
    Add columns that were introduced after the initial schema.
    Uses db.create_all() for fresh databases; this handles existing ones.
    Safe to re-run — skips columns that already exist.
    """
    is_mysql = db.engine.dialect.name == 'mysql'
    inspector = sa_inspect(db.engine)

    pantry_cols = [
        ("category",               "ALTER TABLE pantry_items ADD COLUMN category VARCHAR(64) DEFAULT 'Other'"),
        ("serving_size",           "ALTER TABLE pantry_items ADD COLUMN serving_size VARCHAR(100) DEFAULT NULL"),
        ("servings_per_container", "ALTER TABLE pantry_items ADD COLUMN servings_per_container FLOAT DEFAULT NULL"),
        ("container_type",         "ALTER TABLE pantry_items ADD COLUMN container_type VARCHAR(50) DEFAULT NULL"),
    ]
    recipe_cols = [
        ("serving_size", "ALTER TABLE recipes ADD COLUMN serving_size VARCHAR(100) DEFAULT NULL"),
        ("source_url",   "ALTER TABLE recipes ADD COLUMN source_url VARCHAR(500) DEFAULT NULL"),
    ]
    user_cols = [
        ("is_admin",              "ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE"),
        ("last_digest_sent_at",   "ALTER TABLE users ADD COLUMN last_digest_sent_at DATETIME DEFAULT NULL"),
    ]

    with db.engine.begin() as conn:
        if inspector.has_table('pantry_items'):
            existing = {c['name'] for c in inspector.get_columns('pantry_items')}
            for col, sql in pantry_cols:
                if col not in existing:
                    conn.execute(text(sql))

        if inspector.has_table('recipes'):
            existing = {c['name'] for c in inspector.get_columns('recipes')}
            for col, sql in recipe_cols:
                if col not in existing:
                    conn.execute(text(sql))

        if inspector.has_table('users'):
            existing = {c['name'] for c in inspector.get_columns('users')}
            for col, sql in user_cols:
                if col not in existing:
                    conn.execute(text(sql))

        # MySQL: make sure category column is NOT NULL with default (if it was added without constraint)
        if is_mysql and inspector.has_table('pantry_items'):
            try:
                conn.execute(text(
                    "UPDATE pantry_items SET category = 'Other' WHERE category IS NULL OR category = ''"
                ))
            except Exception:
                pass


def create_app(config_class=None):
    from app.config import DevelopmentConfig
    if config_class is None:
        config_class = DevelopmentConfig

    app = Flask(__name__)
    app.config.from_object(config_class)

    # Refuse to run outside debug/testing with the known dev SECRET_KEY —
    # it signs sessions AND password-reset tokens (account takeover if forged).
    if not app.config.get('DEBUG') and not app.config.get('TESTING'):
        if app.config.get('SECRET_KEY') in (None, '', 'dev-secret-key-local-only'):
            raise RuntimeError('SECRET_KEY must be set to a strong random value in production')

    db.init_app(app)
    login_manager.init_app(app)
    limiter.init_app(app)

    # CORS: the frontend is served same-origin by this app, so cross-origin
    # access is opt-in only. The old CORS(app, supports_credentials=True)
    # reflected ANY origin with credentials — CSRF/data-theft primitive.
    cors_origins = os.environ.get('CORS_ORIGINS')
    if cors_origins:
        CORS(app, origins=[o.strip() for o in cors_origins.split(',') if o.strip()],
             supports_credentials=True)

    @app.after_request
    def set_security_headers(response):
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'DENY')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
        response.headers.setdefault(
            'Content-Security-Policy',
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self'; "
            "worker-src 'self' blob:; "
            "media-src 'self' blob:; "
            "object-src 'none'; base-uri 'self'"
        )
        return response

    # ── Blueprints ──────────────────────────────────────────────────────────
    from app.routes import main_bp, api_bp
    from app.auth import auth_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(main_bp)

    # ── CLI commands ─────────────────────────────────────────────────────────
    try:
        from app.tasks import register_cli
        register_cli(app)
    except Exception:
        pass

    # ── User loader ──────────────────────────────────────────────────────────
    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # ── Health check ─────────────────────────────────────────────────────────
    @app.route('/health')
    def health_check():
        try:
            db.session.execute(text('SELECT 1'))
            return jsonify({'status': 'ok'}), 200
        except Exception:
            return jsonify({'status': 'error', 'detail': 'database'}), 503

    # ── Error handlers ───────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Endpoint not found'}), 404
        return error

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal server error'}), 500
        return error

    # ── Database init ────────────────────────────────────────────────────────
    with app.app_context():
        try:
            db.create_all()
            _migrate_columns()
            # Ensure account_profiles table (managed outside SQLAlchemy models)
            from app.account_profile import ensure_account_profiles_table
            ensure_account_profiles_table()
            db.session.commit()
        except Exception as e:
            print(f"\n[ERROR] Database setup failed: {e}")
            print("  - For MySQL: make sure the server is running and the database exists.")
            print("  - For SQLite: no setup needed, this should work automatically.")
            raise

    return app
