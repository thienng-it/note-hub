"""Application factory for the Note Hub project."""

from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).resolve().parents[2] / '.env'
if env_path.exists():
    load_dotenv(env_path)

from flask import Flask, render_template
from flask_wtf.csrf import CSRFError
from werkzeug.middleware.proxy_fix import ProxyFix

from .config import AppConfig
from .extensions import csrf, limiter
from .database import init_database
from .routes import register_routes
from .services.bootstrap import ensure_admin, migrate_database


def create_app(config: AppConfig | None = None) -> Flask:
    config = config or AppConfig()
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.config.update(config.flask_settings)
    
    # Handle proxy headers from Render
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    csrf.init_app(app)
    limiter.init_app(app)
    
    # Initialize Swagger/OpenAPI documentation
    try:
        from flasgger import Swagger
        from .openapi import openapi_config, openapi_template
        
        swagger = Swagger(app, config=openapi_config, template=openapi_template)
    except ImportError:
        # Flasgger not installed, skip API documentation
        pass

    # Add CSRF error handler to surface friendlier messaging
    @app.errorhandler(CSRFError)
    def handle_csrf_error(error):
        return render_template(
            "error.html",
            error_title="Security Error",
            error_message="The form token has expired or is invalid. Please try again.",
            error_code=400,
        ), 400
    
    init_database(config.database_uri)
    migrate_database()
    ensure_admin(config.admin_username, config.admin_password)
    register_routes(app)

    return app


def get_app() -> Flask:
    """Get or create the application instance."""
    return create_app()
