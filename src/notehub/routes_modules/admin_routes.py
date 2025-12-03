"""Admin dashboard and management routes."""

from __future__ import annotations

import os
from datetime import datetime, timezone

from flask import flash, jsonify, redirect, render_template, request, url_for
from sqlalchemy import func, select

from ..models import User
from ..services.utils import current_user, db, login_required


def register_admin_routes(app):
    """Register admin-related routes."""
    
    @app.route("/admin/users")
    @login_required
    def admin_users():
        """Admin dashboard to view and manage all users."""
        user = current_user()
        
        # Check if user is admin
        if not user or user.username != 'admin':
            flash("Access denied. Admin privileges required.", "error")
            return redirect(url_for("index"))
        
        # Get search and pagination parameters
        search_query = request.args.get('search', '').strip()
        page = max(1, int(request.args.get('page', 1)))
        per_page = 20
        
        with db() as s:
            # Build query
            stmt = select(User).order_by(User.created_at.desc())
            
            # Apply search filter
            if search_query:
                stmt = stmt.where(
                    (User.username.ilike(f'%{search_query}%')) |
                    (User.email.ilike(f'%{search_query}%'))
                )
            
            # Get total count
            total_count = s.execute(select(func.count()).select_from(stmt.subquery())).scalar()
            
            # Apply pagination
            offset = (page - 1) * per_page
            stmt = stmt.limit(per_page).offset(offset)
            
            # Execute query
            users = s.execute(stmt).scalars().all()
            
            # Get stats
            total_users = s.execute(select(func.count(User.id))).scalar()
            users_with_2fa = s.execute(
                select(func.count(User.id)).where(User.totp_secret.isnot(None))
            ).scalar()
            users_with_email = s.execute(
                select(func.count(User.id)).where(User.email.isnot(None))
            ).scalar()
            
            # Calculate pagination
            total_pages = (total_count + per_page - 1) // per_page
            
            return render_template(
                "admin_dashboard.html",
                users=users,
                search_query=search_query,
                page=page,
                total_pages=total_pages,
                total_count=total_count,
                total_users=total_users,
                users_with_2fa=users_with_2fa,
                users_with_email=users_with_email,
            )
    
    @app.route("/admin/health")
    def admin_health():
        """Health check endpoint to verify database connectivity and system status."""
        try:
            from ..config import AppConfig
            config = AppConfig()
            
            # Get database connection info
            db_uri = config.database_uri
            
            # Mask password in URI for security
            masked_uri = db_uri
            if '@' in db_uri and ':' in db_uri:
                parts = db_uri.split('@')
                before_at = parts[0]
                after_at = '@'.join(parts[1:])
                if ':' in before_at:
                    user_part = before_at.split('://')[1].split(':')[0]
                    protocol = before_at.split('://')[0]
                    masked_uri = f"{protocol}://{user_part}:****@{after_at}"
            
            # Check database connectivity
            with db() as s:
                user_count = s.execute(select(func.count(User.id))).scalar()
            
            health_data = {
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "database": {
                    "type": "MySQL",
                    "host": config.db_host,
                    "port": config.db_port,
                    "database": config.db_name,
                    "connection": "OK",
                    "uri_masked": masked_uri
                },
                "stats": {
                    "total_users": user_count,
                },
                "warnings": [],
            }
            
            return jsonify(health_data)
            
        except Exception as e:
            return jsonify({
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }), 500

