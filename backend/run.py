#!/usr/bin/env python3
"""
Cosy Cottage Food App - Main Entry Point
Run this file to start the application
"""

from app import create_app
from app.config import Config, DevelopmentConfig, ProductionConfig
import os

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
    print("=" * 60)
    print("  Cosy Cottage Food App")
    print("=" * 60)
    print(f"  Environment: {config_name}")
    print(f"  Debug mode:  {app.config['DEBUG']}")
    print(f"  Database:    {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1] if '@' in app.config['SQLALCHEMY_DATABASE_URI'] else 'SQLite'}")
    print("=" * 60)
    print("\n  Starting server...")
    print("  Access the app at: http://localhost:5000")
    print("  Press CTRL+C to stop\n")
    
    # Run the development server
    # Bind to 127.0.0.1 (not 0.0.0.0) so 'localhost' works instantly.
    # 0.0.0.0 only binds IPv4, but localhost resolves to IPv6 ::1 first
    # on Windows, causing a ~2s hang on every request in the browser.
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=app.config['DEBUG']
    )
