"""Application factory for the Note Hub project."""

from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file ONLY if not already set
# In Docker, environment variables are set by docker-compose, so .env should not override them
env_path = Path(__file__).resolve().parents[2] / '.env'
if env_path.exists():
    # override=False means existing environment variables take precedence
    load_dotenv(env_path, override=False)

from flask import Flask, jsonify, send_from_directory, session
from flask_wtf.csrf import CSRFError
from werkzeug.middleware.proxy_fix import ProxyFix

from .config import AppConfig
from .extensions import csrf, limiter
from .database import init_database
from .routes import register_routes
from .services.bootstrap import ensure_admin, migrate_database


def create_app(config: AppConfig | None = None) -> Flask:
    config = config or AppConfig()
    
    # Determine static folder path (built frontend or legacy static)
    root_path = Path(__file__).resolve().parents[2]
    frontend_dist = root_path / "static" / "frontend"
    legacy_static = root_path / "static"
    
    # Use frontend dist if it exists (production), otherwise legacy static
    if frontend_dist.exists():
        static_folder = str(frontend_dist)
    else:
        static_folder = str(legacy_static)
    
    app = Flask(
        __name__,
        template_folder="../templates",
        static_folder=static_folder,
        static_url_path="/static"
    )
    app.config.update(config.flask_settings)
    
    # Handle proxy headers from Render
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    csrf.init_app(app)
    limiter.init_app(app)
    
    # Exempt API routes from CSRF protection (they use JWT)
    csrf.exempt('notehub.routes_modules.api_routes')
    
    # Initialize Swagger/OpenAPI documentation
    try:
        from flasgger import Swagger
        from .openapi import openapi_config, openapi_template
        
        swagger = Swagger(app, config=openapi_config, template=openapi_template)
    except ImportError:
        # Flasgger not installed, skip API documentation
        pass

    # Add CSRF error handler - return JSON for API routes
    @app.errorhandler(CSRFError)
    def handle_csrf_error(error):
        return jsonify({
            'error': 'Security Error',
            'message': 'The form token has expired or is invalid. Please try again.'
        }), 400
    
    # Add 503 error handler for service unavailable
    @app.errorhandler(503)
    def handle_503_error(error):
        return jsonify({
            'error': 'Service Temporarily Unavailable'
        }), 503
    
    # Auto-refresh session on activity to keep users logged in longer
    @app.before_request
    def refresh_session():
        """Refresh session lifetime on each request to keep users logged in."""
        if 'user_id' in session:
            session.permanent = True
            # Update session modified time to extend its lifetime
            session.modified = True
    
    init_database(config.database_uri)
    migrate_database()
    ensure_admin(config.admin_username, config.admin_password)
    register_routes(app)
    
    # Serve React frontend for all non-API routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        """Serve the React frontend SPA."""
        # Check if this is an API or health route
        if path.startswith('api/') or path == 'health' or path.startswith('apidocs'):
            # Let other routes handle these
            return app.send_static_file('index.html')
        
        # Try to serve the requested file
        static_file = Path(app.static_folder) / path
        if static_file.exists() and static_file.is_file():
            return send_from_directory(app.static_folder, path)
        
        # For all other routes, serve the SPA index.html
        index_path = Path(app.static_folder) / 'index.html'
        if index_path.exists():
            return send_from_directory(app.static_folder, 'index.html')
        
        # Fallback: return a simple JSON response if no frontend is built
        return jsonify({
            'message': 'NoteHub API',
            'status': 'running',
            'docs': '/apidocs'
        })

    return app


def get_app() -> Flask:
    """Get or create the application instance."""
    return create_app()
