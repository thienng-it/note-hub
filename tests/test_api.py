"""Tests for JWT API endpoints."""

import json
import pytest


class TestAPIAuth:
    """Test API authentication endpoints."""
    
    def test_api_login_success(self, client, test_user):
        """Test successful API login."""
        response = client.post('/api/auth/login', 
            data=json.dumps({
                'username': 'testuser',
                'password': 'TestPassword123!@#'
            }),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['token_type'] == 'Bearer'
    
    def test_api_login_invalid_credentials(self, client, test_user):
        """Test API login with invalid credentials."""
        response = client.post('/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'wrongpassword'
            }),
            content_type='application/json'
        )
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_api_login_missing_fields(self, client):
        """Test API login with missing fields."""
        response = client.post('/api/auth/login',
            data=json.dumps({'username': 'testuser'}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_api_refresh_token(self, client, test_user):
        """Test refreshing access token."""
        # First login
        response = client.post('/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'TestPassword123!@#'
            }),
            content_type='application/json'
        )
        data = json.loads(response.data)
        refresh_token = data['refresh_token']
        
        # Then refresh
        response = client.post('/api/auth/refresh',
            data=json.dumps({'refresh_token': refresh_token}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
    
    def test_api_validate_token(self, client, test_user):
        """Test token validation endpoint."""
        # First login
        response = client.post('/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'TestPassword123!@#'
            }),
            content_type='application/json'
        )
        data = json.loads(response.data)
        access_token = data['access_token']
        
        # Validate token
        response = client.get('/api/auth/validate',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['valid'] is True
        assert 'user' in data


class TestAPINotes:
    """Test API note endpoints."""
    
    def get_auth_token(self, client, test_user):
        """Helper to get auth token."""
        response = client.post('/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'TestPassword123!@#'
            }),
            content_type='application/json'
        )
        data = json.loads(response.data)
        return data['access_token']
    
    def test_api_list_notes(self, client, test_user):
        """Test listing notes via API."""
        token = self.get_auth_token(client, test_user)
        
        response = client.get('/api/notes',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'notes' in data
        assert isinstance(data['notes'], list)
    
    def test_api_create_note(self, client, test_user):
        """Test creating note via API."""
        token = self.get_auth_token(client, test_user)
        
        response = client.post('/api/notes',
            data=json.dumps({
                'title': 'API Test Note',
                'body': 'Created via API',
                'tags': 'api,test'
            }),
            content_type='application/json',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'note' in data
        assert data['note']['title'] == 'API Test Note'
    
    def test_api_get_note(self, client, test_user, db_session):
        """Test getting specific note via API."""
        token = self.get_auth_token(client, test_user)
        
        # Create a note first
        from src.notehub.models import Note
        note = Note(title='Test Note', body='Body', owner_id=test_user.id)
        db_session.add(note)
        db_session.commit()
        
        response = client.get(f'/api/notes/{note.id}',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'note' in data
        assert data['note']['title'] == 'Test Note'
    
    def test_api_unauthorized(self, client):
        """Test API without authorization."""
        response = client.get('/api/notes')
        assert response.status_code == 401


class TestAPITasks:
    """Test API task endpoints."""
    
    def get_auth_token(self, client, test_user):
        """Helper to get auth token."""
        response = client.post('/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'TestPassword123!@#'
            }),
            content_type='application/json'
        )
        data = json.loads(response.data)
        return data['access_token']
    
    def test_api_list_tasks(self, client, test_user):
        """Test listing tasks via API."""
        token = self.get_auth_token(client, test_user)
        
        response = client.get('/api/tasks',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'tasks' in data
        assert isinstance(data['tasks'], list)
    
    def test_api_create_task(self, client, test_user):
        """Test creating task via API."""
        token = self.get_auth_token(client, test_user)
        
        response = client.post('/api/tasks',
            data=json.dumps({
                'title': 'API Test Task',
                'description': 'Created via API',
                'priority': 'high'
            }),
            content_type='application/json',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'task' in data
        assert data['task']['title'] == 'API Test Task'


class TestAPIErrorHandling:
    """Test API error handling returns JSON responses."""
    
    def test_api_404_returns_json(self, client):
        """Test 404 errors on API routes return JSON."""
        response = client.get('/api/nonexistent')
        assert response.status_code == 404
        assert response.content_type == 'application/json'
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'Resource not found'
    
    def test_api_405_returns_json(self, client):
        """Test 405 errors on API routes return JSON."""
        # POST to GET-only endpoint
        response = client.post('/api/health')
        assert response.status_code == 405
        assert response.content_type == 'application/json'
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'Method not allowed'
    
    def test_non_api_routes_serve_spa(self, client):
        """Test non-API routes serve the SPA for client-side routing."""
        response = client.get('/nonexistent')
        # SPA architecture: non-API routes should serve the SPA or API info
        assert response.status_code == 200
        assert response.content_type in ['text/html; charset=utf-8', 'application/json']
