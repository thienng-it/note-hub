"""API routes with JWT authentication and OpenAPI documentation."""

from __future__ import annotations

import logging
from functools import wraps

from flask import jsonify, request
from flasgger import swag_from
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..extensions import limiter
from ..models import Note, Task, User
from ..services.auth_service import AuthService
from ..services.jwt_service import JWTService
from ..services.note_service import NoteService
from ..services.task_service import TaskService
from ..services.utils import db

logger = logging.getLogger(__name__)


def jwt_required(f):
    """Decorator to require JWT authentication for API endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        # Validate Bearer token format
        if not auth_header.lower().startswith('bearer '):
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        parts = auth_header.split()
        if len(parts) != 2:
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        token = parts[1]
        is_valid, user_id, error = JWTService.validate_token(token)
        
        if not is_valid:
            return jsonify({'error': error or 'Invalid token'}), 401
        
        # Get user from database
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 401
        
        # Add user_id to kwargs
        kwargs['user_id'] = user_id
        return f(*args, **kwargs)
    
    return decorated_function


def register_api_routes(app):
    """Register API routes with JWT authentication."""
    
    @app.after_request
    def set_api_content_type(response):
        """Ensure API routes return application/json content type."""
        if request.path.startswith('/api/'):
            if not response.content_type or 'text/html' in response.content_type:
                response.content_type = 'application/json'
        return response
    
    @app.route("/api/health", methods=["GET"])
    def api_health():
        """Health check endpoint for monitoring database connectivity.
        ---
        tags:
          - System
        responses:
          200:
            description: System is healthy
            schema:
              type: object
              properties:
                status:
                  type: string
                database:
                  type: string
                user_count:
                  type: integer
        """
        import os
        from sqlalchemy import text
        
        try:
            with db() as s:
                # Test database connectivity
                s.execute(text("SELECT 1"))
                
                # Count users
                result = s.execute(select(User.id))
                user_count = len(result.fetchall())
                
                # Get database path from environment or config
                from urllib.parse import urlparse
                db_path = os.getenv("NOTES_DB_PATH", "notes.db")
                
                # Parse database path - handle both file paths and SQLite URIs
                if db_path.startswith('sqlite:'):
                    parsed = urlparse(db_path)
                    actual_path = parsed.path.lstrip('/')
                    db_exists = os.path.exists(actual_path)
                else:
                    actual_path = db_path
                    db_exists = os.path.exists(db_path)
                
                return jsonify({
                    'status': 'healthy',
                    'database': 'connected',
                    'database_path': db_path,
                    'database_exists': db_exists,
                    'user_count': user_count,
                    'message': 'Database is accessible and contains data' if user_count > 0 else 'Database is accessible but empty'
                }), 200
        except Exception as e:
            import logging
            logging.error(f"Health check failed: {e}")
            return jsonify({
                'status': 'unhealthy',
                'database': 'error',
                'error': str(e)
            }), 503
    
    @app.route("/api/auth/login", methods=["POST"])
    @limiter.limit("10 per minute")
    def api_login():
        """API login endpoint - returns JWT tokens.
        ---
        tags:
          - Authentication
        parameters:
          - in: body
            name: body
            required: true
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                  description: Username or email for authentication
                password:
                  type: string
                  description: User password
                totp_code:
                  type: string
                  description: 2FA code (required if 2FA is enabled)
        responses:
          200:
            description: Login successful
            schema:
              type: object
              properties:
                access_token:
                  type: string
                refresh_token:
                  type: string
                token_type:
                  type: string
                expires_in:
                  type: integer
                user:
                  type: object
                  properties:
                    id:
                      type: integer
                    username:
                      type: string
                    email:
                      type: string
          401:
            description: Invalid credentials or 2FA required
        """
        data = request.get_json()
        
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Username/email and password required'}), 400
        
        with db() as s:
            user = AuthService.authenticate_user(s, data['username'], data['password'])
            
            if not user:
                return jsonify({'error': 'Invalid credentials'}), 401
            
            # Check 2FA if enabled
            if user.totp_secret and 'totp_code' not in data:
                return jsonify({'error': '2FA code required', 'requires_2fa': True}), 401
            
            if user.totp_secret:
                if not user.verify_totp(data.get('totp_code', '')):
                    return jsonify({'error': 'Invalid 2FA code'}), 401
            
            # Generate tokens
            access_token = JWTService.generate_token(user.id)
            refresh_token = JWTService.generate_refresh_token(user.id)
            
            # Update last login
            AuthService.update_last_login(s, user)
            s.commit()
            
            return jsonify({
                'access_token': access_token,
                'refresh_token': refresh_token,
                'token_type': 'Bearer',
                'expires_in': 86400,  # 24 hours (extended from 1 hour)
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }), 200
    
    @app.route("/api/auth/refresh", methods=["POST"])
    def api_refresh():
        """Refresh access token using refresh token."""
        data = request.get_json()
        
        if not data or 'refresh_token' not in data:
            return jsonify({'error': 'Refresh token required'}), 400
        
        success, new_token, error = JWTService.refresh_access_token(data['refresh_token'])
        
        if not success:
            return jsonify({'error': error}), 401
        
        return jsonify({
            'access_token': new_token,
            'token_type': 'Bearer',
            'expires_in': 86400  # 24 hours (extended from 1 hour)
        }), 200
    
    @app.route("/api/auth/validate", methods=["GET"])
    @jwt_required
    def api_validate(user_id):
        """Validate JWT token and return user info."""
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'valid': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'created_at': user.created_at.isoformat() if user.created_at else None
                }
            }), 200
    
    @app.route("/api/notes", methods=["GET"])
    @jwt_required
    def api_list_notes(user_id):
        """List notes for authenticated user."""
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            view_type = request.args.get('view', 'all')
            query = request.args.get('q', '')
            tag_filter = request.args.get('tag', '')
            
            notes, _ = NoteService.get_notes_for_user(s, user, view_type, query, tag_filter)
            
            return jsonify({
                'notes': [{
                    'id': note.id,
                    'title': note.title,
                    'body': note.body,
                    'excerpt': note.excerpt,
                    'pinned': note.pinned,
                    'favorite': note.favorite,
                    'archived': note.archived,
                    'created_at': note.created_at.isoformat() if note.created_at else None,
                    'updated_at': note.updated_at.isoformat() if note.updated_at else None,
                    'tags': [{'id': tag.id, 'name': tag.name} for tag in note.tags]
                } for note in notes]
            }), 200
    
    @app.route("/api/notes/<int:note_id>", methods=["GET"])
    @jwt_required
    def api_get_note(user_id, note_id):
        """Get a specific note."""
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            note, has_access, can_edit = NoteService.check_note_access(s, note_id, user)
            
            if not note:
                return jsonify({'error': 'Note not found'}), 404
            
            if not has_access:
                return jsonify({'error': 'Access denied'}), 403
            
            return jsonify({
                'note': {
                    'id': note.id,
                    'title': note.title,
                    'body': note.body,
                    'pinned': note.pinned,
                    'favorite': note.favorite,
                    'archived': note.archived,
                    'created_at': note.created_at.isoformat() if note.created_at else None,
                    'updated_at': note.updated_at.isoformat() if note.updated_at else None,
                    'tags': [{'id': tag.id, 'name': tag.name} for tag in note.tags],
                    'can_edit': can_edit
                }
            }), 200
    
    @app.route("/api/notes", methods=["POST"])
    @jwt_required
    def api_create_note(user_id):
        """Create a new note."""
        data = request.get_json()
        
        if not data or 'title' not in data:
            return jsonify({'error': 'Title is required'}), 400
        
        try:
            with db() as s:
                user = s.get(User, user_id)
                if not user:
                    return jsonify({'error': 'User not found'}), 404
                
                note = NoteService.create_note(
                    s, user,
                    data['title'],
                    data.get('body', ''),
                    data.get('tags', ''),
                    data.get('pinned', False),
                    data.get('favorite', False),
                    data.get('archived', False)
                )
                s.commit()
                
                return jsonify({
                    'note': {
                        'id': note.id,
                        'title': note.title,
                        'body': note.body,
                        'pinned': note.pinned,
                        'favorite': note.favorite,
                        'archived': note.archived,
                        'created_at': note.created_at.isoformat() if note.created_at else None,
                        'tags': [{'id': tag.id, 'name': tag.name} for tag in note.tags]
                    }
                }), 201
        except IntegrityError as e:
            logger.error(f"Integrity error creating note via API: {e}")
            return jsonify({'error': 'Database constraint violation. Please check your data.'}), 400
        except SQLAlchemyError as e:
            logger.error(f"Database error creating note via API: {e}")
            return jsonify({'error': 'Database error occurred. Please try again.'}), 500
        except Exception as e:
            logger.error(f"Unexpected error creating note via API: {e}")
            return jsonify({'error': 'An unexpected error occurred. Please try again.'}), 500
    
    @app.route("/api/tasks", methods=["GET"])
    @jwt_required
    def api_list_tasks(user_id):
        """List tasks for authenticated user."""
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            filter_type = request.args.get('filter', 'all')
            tasks = TaskService.get_tasks_for_user(s, user, filter_type)
            
            return jsonify({
                'tasks': [{
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'completed': task.completed,
                    'priority': task.priority,
                    'due_date': task.due_date.isoformat() if task.due_date else None,
                    'created_at': task.created_at.isoformat() if task.created_at else None,
                    'is_overdue': task.is_overdue
                } for task in tasks]
            }), 200
    
    @app.route("/api/tasks", methods=["POST"])
    @jwt_required
    def api_create_task(user_id):
        """Create a new task."""
        data = request.get_json()
        
        if not data or 'title' not in data:
            return jsonify({'error': 'Title is required'}), 400
        
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            task = TaskService.create_task(
                s, user,
                data['title'],
                data.get('description'),
                data.get('due_date'),
                data.get('priority', 'medium')
            )
            s.commit()
            
            return jsonify({
                'task': {
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'completed': task.completed,
                    'priority': task.priority,
                    'due_date': task.due_date.isoformat() if task.due_date else None,
                    'created_at': task.created_at.isoformat() if task.created_at else None
                }
            }), 201
    
    @app.route("/api/notes/<int:note_id>", methods=["PUT", "PATCH"])
    @jwt_required
    def api_update_note(user_id, note_id):
        """Update an existing note."""
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            note, has_access, can_edit = NoteService.check_note_access(s, note_id, user)
            
            if not note:
                return jsonify({'error': 'Note not found'}), 404
            
            if not has_access:
                return jsonify({'error': 'Access denied'}), 403
            
            if not can_edit:
                return jsonify({'error': 'You do not have edit permissions for this note'}), 403
            
            # Update note using service
            updated_note = NoteService.update_note(
                s, note, user,
                data.get('title', note.title),
                data.get('body', note.body),
                data.get('tags', ','.join(tag.name for tag in note.tags)),
                data.get('pinned') if 'pinned' in data else None,
                data.get('favorite') if 'favorite' in data else None,
                data.get('archived') if 'archived' in data else None
            )
            s.commit()
            
            return jsonify({
                'note': {
                    'id': updated_note.id,
                    'title': updated_note.title,
                    'body': updated_note.body,
                    'pinned': updated_note.pinned,
                    'favorite': updated_note.favorite,
                    'archived': updated_note.archived,
                    'updated_at': updated_note.updated_at.isoformat() if updated_note.updated_at else None,
                    'tags': [{'id': tag.id, 'name': tag.name} for tag in updated_note.tags]
                }
            }), 200
    
    @app.route("/api/notes/<int:note_id>", methods=["DELETE"])
    @jwt_required
    def api_delete_note(user_id, note_id):
        """Delete a note."""
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            note = s.get(Note, note_id)
            if not note:
                return jsonify({'error': 'Note not found'}), 404
            
            # Only owner can delete
            if note.owner_id != user.id:
                return jsonify({'error': 'Only the note owner can delete it'}), 403
            
            s.delete(note)
            s.commit()
            
            return jsonify({'message': 'Note deleted successfully'}), 200
    
    @app.route("/api/tasks/<int:task_id>", methods=["GET"])
    @jwt_required
    def api_get_task(user_id, task_id):
        """Get a specific task."""
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            task = TaskService.check_task_access(s, task_id, user)
            
            if not task:
                return jsonify({'error': 'Task not found or access denied'}), 404
            
            return jsonify({
                'task': {
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'completed': task.completed,
                    'priority': task.priority,
                    'due_date': task.due_date.isoformat() if task.due_date else None,
                    'created_at': task.created_at.isoformat() if task.created_at else None,
                    'is_overdue': task.is_overdue
                }
            }), 200
    
    @app.route("/api/tasks/<int:task_id>", methods=["PUT", "PATCH"])
    @jwt_required
    def api_update_task(user_id, task_id):
        """Update an existing task."""
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            task = TaskService.check_task_access(s, task_id, user)
            
            if not task:
                return jsonify({'error': 'Task not found or access denied'}), 404
            
            # Handle completed toggle
            if 'completed' in data:
                task.completed = data['completed']
            
            # Update other fields if provided
            updated_task = TaskService.update_task(
                s, task,
                data.get('title', task.title),
                data.get('description', task.description),
                data.get('due_date', task.due_date),
                data.get('priority', task.priority)
            )
            s.commit()
            
            return jsonify({
                'task': {
                    'id': updated_task.id,
                    'title': updated_task.title,
                    'description': updated_task.description,
                    'completed': updated_task.completed,
                    'priority': updated_task.priority,
                    'due_date': updated_task.due_date.isoformat() if updated_task.due_date else None,
                    'is_overdue': updated_task.is_overdue
                }
            }), 200
    
    @app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
    @jwt_required
    def api_delete_task(user_id, task_id):
        """Delete a task."""
        with db() as s:
            user = s.get(User, user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            task = TaskService.check_task_access(s, task_id, user)
            
            if not task:
                return jsonify({'error': 'Task not found or access denied'}), 404
            
            s.delete(task)
            s.commit()
            
            return jsonify({'message': 'Task deleted successfully'}), 200
