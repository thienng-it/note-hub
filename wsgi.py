#!/usr/bin/env python3
"""Entry point for production deployment."""

import sys
import os
from pathlib import Path

# Add src directory to Python path
ROOT_DIR = Path(__file__).resolve().parent
SRC_DIR = ROOT_DIR / "src"
sys.path.insert(0, str(SRC_DIR))

# Ensure the src directory is in the Python path
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from notehub import create_app
from notehub.config import AppConfig

# Create the application instance
app = create_app(AppConfig())

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
