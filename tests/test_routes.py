"""Integration tests for Flask routes.

Note: These tests have been updated to reflect the new SPA architecture.
The frontend is now a React SPA served by Flask, with authentication via JWT API.
Tests for the legacy Flask template-based routes have been removed since
the frontend now uses the API endpoints tested in test_api.py.
"""

import pytest


class TestSPARoutes:
    """Test SPA routing - all non-API routes should serve the SPA."""
    
    def test_root_serves_spa_or_api_info(self, client):
        """Test root route serves SPA or API info."""
        response = client.get('/')
        assert response.status_code == 200
        # Either serves the React SPA index.html or the API info JSON
        # depending on whether the frontend is built
        assert response.content_type in ['text/html; charset=utf-8', 'application/json']
    
    def test_unknown_route_serves_spa(self, client):
        """Test unknown routes serve the SPA for client-side routing."""
        response = client.get('/some-unknown-route')
        assert response.status_code == 200
        # Should serve the SPA for client-side routing
    
    def test_api_404_returns_json(self, client):
        """Test API 404 returns JSON error."""
        response = client.get('/api/nonexistent-endpoint')
        assert response.status_code == 404
        assert response.content_type == 'application/json'


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check(self, client):
        """Test health check returns healthy status."""
        response = client.get('/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert data['service'] == 'notehub'


class TestStaticFiles:
    """Test static file serving."""
    
    def test_spa_returns_valid_response(self, client):
        """Test that SPA routes return valid responses."""
        # Test various frontend routes
        routes = ['/login', '/notes', '/tasks', '/profile']
        for route in routes:
            response = client.get(route)
            assert response.status_code == 200
            # Should serve either HTML or JSON (API info fallback)
            assert response.content_type in ['text/html; charset=utf-8', 'application/json']
