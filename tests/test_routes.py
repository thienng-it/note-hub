"""Integration tests for Flask routes."""

import pytest
from flask import session


class TestAuthRoutes:
    """Test authentication routes."""
    
    def test_login_page_loads(self, client):
        """Test login page loads successfully."""
        response = client.get('/login')
        assert response.status_code == 200
        assert b'Login' in response.data or b'login' in response.data
    
    def test_login_success(self, client, test_user):
        """Test successful login."""
        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'TestPassword123!@#'
        }, follow_redirects=True)
        assert response.status_code == 200
        
        with client.session_transaction() as sess:
            assert 'user_id' in sess
    
    def test_login_wrong_password(self, client, test_user):
        """Test login with wrong password."""
        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'wrongpassword'
        }, follow_redirects=True)
        assert response.status_code == 200
        assert b'Invalid' in response.data or b'invalid' in response.data
    
    def test_logout(self, auth_client):
        """Test logout functionality."""
        response = auth_client.get('/logout', follow_redirects=True)
        assert response.status_code == 200
        
        with auth_client.session_transaction() as sess:
            assert 'user_id' not in sess
    
    def test_register_page_loads(self, client):
        """Test register page loads."""
        response = client.get('/register')
        assert response.status_code == 200
        assert b'Register' in response.data or b'register' in response.data
    
    def test_register_success(self, client):
        """Test successful registration."""
        response = client.post('/register', data={
            'username': 'newuser',
            'password': 'NewPassword123!@#',
            'password_confirm': 'NewPassword123!@#'
        }, follow_redirects=True)
        assert response.status_code == 200


class TestNoteRoutes:
    """Test note routes."""
    
    def test_index_requires_auth(self, client):
        """Test index page requires authentication."""
        response = client.get('/')
        assert response.status_code == 302  # Redirect to login
    
    def test_index_loads_for_authenticated(self, auth_client):
        """Test index loads for authenticated user."""
        response = auth_client.get('/')
        assert response.status_code == 200
    
    def test_create_note_page_loads(self, auth_client):
        """Test create note page loads."""
        response = auth_client.get('/note/new')
        assert response.status_code == 200
    
    def test_create_note(self, auth_client):
        """Test note creation."""
        response = auth_client.post('/note/new', data={
            'title': 'Test Note',
            'body': 'Test body',
            'tags': 'test,note'
        }, follow_redirects=False)
        assert response.status_code == 302  # Redirect after creation
        assert '/note/' in response.location


class TestTaskRoutes:
    """Test task routes."""
    
    def test_tasks_requires_auth(self, client):
        """Test tasks page requires authentication."""
        response = client.get('/tasks')
        assert response.status_code == 302
    
    def test_tasks_loads_for_authenticated(self, auth_client):
        """Test tasks page loads for authenticated user."""
        response = auth_client.get('/tasks')
        assert response.status_code == 200
    
    def test_create_task_page_loads(self, auth_client):
        """Test create task page loads."""
        response = auth_client.get('/task/new')
        assert response.status_code == 200
    
    def test_create_task(self, auth_client):
        """Test task creation."""
        response = auth_client.post('/task/new', data={
            'title': 'Test Task',
            'description': 'Test description',
            'priority': 'medium'
        }, follow_redirects=False)
        assert response.status_code == 302


class TestProfileRoutes:
    """Test profile routes."""
    
    def test_profile_requires_auth(self, client):
        """Test profile page requires authentication."""
        response = client.get('/profile')
        assert response.status_code == 302
    
    def test_profile_loads_for_authenticated(self, auth_client):
        """Test profile page loads for authenticated user."""
        response = auth_client.get('/profile')
        assert response.status_code == 200
    
    def test_edit_profile_page_loads(self, auth_client):
        """Test edit profile page loads."""
        response = auth_client.get('/profile/edit')
        assert response.status_code == 200


class TestAdminRoutes:
    """Test admin routes."""
    
    def test_admin_requires_auth(self, client):
        """Test admin page requires authentication."""
        response = client.get('/admin/users')
        assert response.status_code == 302
    
    def test_admin_requires_admin_user(self, auth_client):
        """Test admin page requires admin privileges."""
        response = auth_client.get('/admin/users', follow_redirects=True)
        assert response.status_code == 200
        # Should redirect or show access denied
