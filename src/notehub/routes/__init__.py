"""Route registrations for the Note Hub Flask application - API-focused version."""

from __future__ import annotations

from flask import jsonify, request

from ..routes_modules import register_api_routes


def register_routes(app):
    """Register all Flask API routes on the passed-in app instance."""
    
    # Register API routes (JWT-based)
    register_api_routes(app)
    
    # Health check endpoint for load balancers and monitoring
    @app.route('/health')
    def health_check():
        """Health check endpoint for load balancers and monitoring."""
        return jsonify({'status': 'healthy', 'service': 'notehub'}), 200

    # Error handlers - return JSON for all routes
    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Resource not found'}), 404
        # For non-API routes, let the SPA handle routing
        return app.send_static_file('index.html')

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def server_error(error):
        return jsonify({'error': 'Internal server error'}), 500
