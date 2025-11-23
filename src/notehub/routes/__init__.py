"""Route registrations for the Note Hub Flask application - Modular version."""

from __future__ import annotations

from flask import render_template, session

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

    # Context processor and error handlers
    @app.context_processor
    def inject_user():
        user = current_user()
        theme = session.get("theme")
        if user and not theme:
            with db() as s:
                db_user = s.get(type(user), user.id)
                theme = db_user.theme if db_user else "light"
                session["theme"] = theme
        if not theme:
            theme = "light"
        return dict(current_user=user, current_theme=theme)

    @app.errorhandler(404)
    def not_found(error):
        return render_template("error.html", error="Page not found", code=404), 404

    @app.errorhandler(500)
    def server_error(error):
        return render_template("error.html", error="Internal server error", code=500), 500
