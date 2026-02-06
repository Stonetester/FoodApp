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
    print("🏡 Cosy Cottage Food App")
    print("=" * 60)
    print(f"Environment: {config_name}")
    print(f"Debug mode: {app.config['DEBUG']}")
    print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1] if '@' in app.config['SQLALCHEMY_DATABASE_URI'] else 'SQLite'}")
    print("=" * 60)
    print("\n🚀 Starting server...")
    print("📱 Access the app at: http://localhost:5000")
    print("🛑 Press CTRL+C to stop\n")
    
    # Run the development server
    app.run(
        host='0.0.0.0',  # Listen on all interfaces
        port=5000,
        debug=app.config['DEBUG']
    )
