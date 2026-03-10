#!/usr/bin/env python3
"""
Cosy Cottage Food App - Main Entry Point
Run this file to start the application
"""

from app import create_app
from app.config import Config, DevelopmentConfig, ProductionConfig
import os
import sys

# Determine which config to use
config_name = os.environ.get('FLASK_ENV', 'development')

if config_name == 'production':
    config = ProductionConfig
elif config_name == 'testing':
    from app.config import TestingConfig
    config = TestingConfig
else:
    config = DevelopmentConfig

# Create the Flask app
app = create_app(config)

if __name__ == '__main__':
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))

    db_display = (
        app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1]
        if '@' in app.config['SQLALCHEMY_DATABASE_URI']
        else 'SQLite'
    )

    print("=" * 60)
    print("  Cosy Cottage Food App")
    print("=" * 60)
    print(f"  Environment : {config_name}")
    print(f"  Debug mode  : {app.config['DEBUG']}")
    print(f"  Database    : {db_display}")
    print("=" * 60)

    if app.config['DEBUG']:
        # --- DEVELOPMENT: use Flask's built-in server ---
        print(f"\n  Starting dev server on http://{host}:{port}")
        print("  Press CTRL+C to stop\n")
        app.run(host=host, port=port, debug=True)
    else:
        # --- PRODUCTION: use Waitress (works on Windows & Linux) ---
        # Waitress is a pure-Python production WSGI server that handles
        # concurrent requests properly, avoids the queue-depth errors you
        # see with Flask's dev server, and plays well with Cloudflare.
        try:
            from waitress import serve
        except ImportError:
            print("\nERROR: waitress is not installed.")
            print("Install it with:  pip install waitress")
            sys.exit(1)

        # Waitress tuning for Cloudflare:
        #  - threads        : number of worker threads (default 4 is too low
        #                     behind a CDN that keeps connections open)
        #  - channel_timeout : seconds before an idle connection is closed;
        #                     Cloudflare's proxy timeout is 100 s on Free plans
        #  - connection_limit: max simultaneous connections
        #  - cleanup_interval: how often (seconds) waitress prunes dead conns
        #  - recv_bytes      : read buffer size
        threads = int(os.environ.get('WAITRESS_THREADS', '8'))
        connection_limit = int(os.environ.get('WAITRESS_CONNECTION_LIMIT', '500'))
        channel_timeout = int(os.environ.get('WAITRESS_CHANNEL_TIMEOUT', '120'))

        print(f"\n  Starting Waitress on http://{host}:{port}")
        print(f"  Threads: {threads}  |  Conn limit: {connection_limit}  |  Timeout: {channel_timeout}s")
        print("  Press CTRL+C to stop\n")

        serve(
            app,
            host=host,
            port=port,
            threads=threads,
            connection_limit=connection_limit,
            channel_timeout=channel_timeout,
            cleanup_interval=30,
            recv_bytes=65536,
            url_scheme='https',       # tells Flask that external URL is HTTPS
        )
