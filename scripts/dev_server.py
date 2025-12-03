"""Entry point for running the Note Hub Flask app locally."""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from notehub import create_app
from notehub.config import AppConfig


def build_app():
    config = AppConfig()
    flask_app = create_app(config)
    return flask_app, config


app, _config = build_app()


if __name__ == "__main__":
    print("\n🗒️  Simple Notes App Starting...")
    print(f"📊 Database: MySQL - {_config.db_user}@{_config.db_host}:{_config.db_port}/{_config.db_name}")
    print(f"👤 Admin: {_config.admin_username}")
    print("🌐 URL: http://127.0.0.1:5000")
    print("🛑 Press Ctrl+C to stop\n")
    app.run(debug=True, host="127.0.0.1", port=5000)
