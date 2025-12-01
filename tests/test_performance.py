"""Performance and caching tests.

Note: These tests have been updated for the SPA architecture.
Session-based caching tests have been removed since the frontend
now uses JWT tokens instead of Flask sessions.
"""

import pytest

from src.notehub.models import User
from src.notehub.services.utils import db


class TestDatabasePerformance:
    """Test database performance optimizations."""
    
    def test_user_query_by_id(self, app, test_user):
        """Test direct user query by ID is efficient."""
        with app.app_context():
            with db() as s:
                user = s.get(User, test_user.id)
                assert user is not None
                assert user.username == 'testuser'
    
    def test_user_query_by_username(self, app, test_user):
        """Test user query by username."""
        with app.app_context():
            from sqlalchemy import select
            with db() as s:
                user = s.execute(
                    select(User).where(User.username == 'testuser')
                ).scalar_one_or_none()
                assert user is not None
                assert user.id == test_user.id


class TestAPIPerformance:
    """Test API response times."""
    
    def test_health_check_fast(self, client):
        """Test health check responds quickly."""
        import time
        start = time.time()
        response = client.get('/health')
        duration = time.time() - start
        
        assert response.status_code == 200
        # Health check should respond in under 1 second
        assert duration < 1.0
    
    def test_api_auth_responds(self, client):
        """Test API auth endpoints respond."""
        response = client.post('/api/auth/login',
            json={'username': 'wrong', 'password': 'wrong'},
            content_type='application/json'
        )
        # Should respond (with error) not hang
        assert response.status_code == 401
