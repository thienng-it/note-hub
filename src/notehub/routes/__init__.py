"""Route registrations for the Note Hub Flask application - Modular version."""

from __future__ import annotations

from flask import jsonify, render_template, request, session

from ..routes_modules import (register_admin_routes, register_api_routes,
                               register_auth_routes, register_note_routes,
                               register_profile_routes, register_task_routes)
from ..services.utils import current_user, db


def register_routes(app):
    """Register all Flask routes on the passed-in app instance using modular structure."""
    
    # Register modular route groups
    register_auth_routes(app)
    register_note_routes(app)
    register_task_routes(app)
    register_profile_routes(app)
    register_admin_routes(app)
    register_api_routes(app)  # JWT-based API routes
    
    # Health check endpoint for Fly.io and other platforms
    @app.route('/health')
    def health_check():
        """Health check endpoint for load balancers and monitoring."""
        return jsonify({'status': 'healthy', 'service': 'notehub'}), 200

    # Context processor and error handlers
    @app.context_processor
    def inject_user():
        """Inject current user and theme into template context.
        
        Optimized to avoid database queries by using session-cached data.
        """
        user = current_user()
        
        # Theme is now cached in current_user() function
        # This avoids the extra DB query that was causing performance issues
        if user:
            theme = user.theme if hasattr(user, 'theme') else session.get("theme", "light")
        else:
            theme = session.get("theme", "light")
        
        return dict(current_user=user, current_theme=theme)

    @app.errorhandler(404)
    def not_found(error):
        # Return JSON for API routes
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Resource not found'}), 404
        return render_template("error.html", error="Page not found", code=404), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        # Return JSON for API routes
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Method not allowed'}), 405
        return render_template("error.html", error="Method not allowed", code=405), 405

    @app.errorhandler(500)
    def server_error(error):
        # Return JSON for API routes
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal server error'}), 500
        return render_template("error.html", error="Internal server error", code=500), 500
