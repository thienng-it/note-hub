#!/usr/bin/env python3
"""Entry point for production deployment."""

import sys
from pathlib import Path

# Add src directory to Python path
ROOT_DIR = Path(__file__).resolve().parent
SRC_DIR = ROOT_DIR / "src"
sys.path.insert(0, str(SRC_DIR))

from notehub import app

if __name__ == "__main__":
    app.run()
