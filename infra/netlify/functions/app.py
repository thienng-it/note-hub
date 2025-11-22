"""Netlify Function entrypoint that wraps the Flask app via serverless-wsgi."""

import sys
from pathlib import Path

# Add src to path before importing
ROOT_DIR = Path(__file__).resolve().parents[3]
SRC_DIR = ROOT_DIR / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

try:
    import serverless_wsgi
    from notehub import create_app
    from notehub.config import AppConfig

    # Create app instance once
    _app = create_app(AppConfig())

    def handler(event, context):
        """Netlify function handler that processes HTTP requests."""
        return serverless_wsgi.handle_request(_app, event, context)

except Exception as e:
    # Provide detailed error message for debugging
    def handler(event, context):
        return {
            'statusCode': 500,
            'body': f'Error initializing app: {str(e)}\nPython path: {sys.path}\nRoot: {ROOT_DIR}'
        }
