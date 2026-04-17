#!/usr/bin/env python3
"""
Local dev server — uses SQLite so MySQL is not required.

Usage:
    python run_dev_local.py

The production .env sets DATABASE_URL to MySQL.
This script forces SQLite before dotenv loads, so you can test
locally without running MySQL.
"""

import os, sys

# Override DATABASE_URL BEFORE dotenv loads it from .env
os.environ['DATABASE_URL'] = 'sqlite:///foodapp_dev.db'

from app.config import DevelopmentConfig
from app import create_app

app = create_app(DevelopmentConfig)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("=" * 55)
    print("  Modo Gusto — Local Dev (SQLite)")
    print(f"  URL : http://127.0.0.1:{port}")
    print("  DB  : backend/foodapp_dev.db (SQLite)")
    print("  Tip : Run seed.py --reset for test data")
    print("=" * 55)
    app.run(host='127.0.0.1', port=port, debug=True)
