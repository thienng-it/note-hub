"""API routes with JWT authentication."""

from __future__ import annotations

from functools import wraps

from flask import jsonify, request
from sqlalchemy import select

from ..models import Note, Task, User
from ..services.auth_service import AuthService
from ..services.jwt_service import JWTService
from ..services.note_service import NoteService
from ..services.task_service import TaskService
from ..services.utils import db


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
    
    @app.route("/api/auth/login", methods=["POST"])
    def api_login():
        """API login endpoint - returns JWT tokens."""
        data = request.get_json()
        
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Username and password required'}), 400
        
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
                'expires_in': 3600,
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
            'expires_in': 3600
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
