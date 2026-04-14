#!/usr/bin/env python3
"""
Modo Gusto Food App - Main Entry Point
Dev:  python run.py
Prod: FLASK_ENV=production python run.py
"""

import os
import sys
from app.config import DevelopmentConfig, ProductionConfig, TestingConfig

config_name = os.environ.get('FLASK_ENV', 'development')

if config_name == 'production':
    # Validate required production env vars before touching Flask
    if not os.environ.get('SECRET_KEY'):
        print("ERROR: SECRET_KEY must be set for production.")
        sys.exit(1)
    if not os.environ.get('DATABASE_URL'):
        print("ERROR: DATABASE_URL must be set for production.")
        sys.exit(1)
    config = ProductionConfig
elif config_name == 'testing':
    config = TestingConfig
else:
    config = DevelopmentConfig

from app import create_app
app = create_app(config)

if __name__ == '__main__':
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))

    db_uri = app.config['SQLALCHEMY_DATABASE_URI']
    db_display = db_uri.split('@')[-1] if '@' in db_uri else db_uri.split('///')[-1]

    print("=" * 55)
    print("  Modo Gusto Food App")
    print("=" * 55)
    print(f"  Environment : {config_name}")
    print(f"  Debug mode  : {app.config['DEBUG']}")
    print(f"  Database    : {db_display}")
    print(f"  URL         : http://{host}:{port}")
    print("=" * 55)

    if app.config['DEBUG']:
        print("\n  Dev server starting — press CTRL+C to stop\n")
        app.run(host=host, port=port, debug=True)
    else:
        try:
            from waitress import serve
        except ImportError:
            print("\nERROR: waitress not installed.  pip install waitress")
            sys.exit(1)

        threads = int(os.environ.get('WAITRESS_THREADS', '8'))
        connection_limit = int(os.environ.get('WAITRESS_CONNECTION_LIMIT', '500'))
        channel_timeout = int(os.environ.get('WAITRESS_CHANNEL_TIMEOUT', '120'))

        print(f"\n  Waitress starting — threads={threads}  timeout={channel_timeout}s\n")
        serve(
            app,
            host=host,
            port=port,
            threads=threads,
            connection_limit=connection_limit,
            channel_timeout=channel_timeout,
            cleanup_interval=30,
            recv_bytes=65536,
            url_scheme='https',
        )
