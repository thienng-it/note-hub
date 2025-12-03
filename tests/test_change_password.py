"""Tests for change password functionality."""

import pytest
from werkzeug.datastructures import MultiDict
from src.notehub.forms import ChangePasswordForm


class TestChangePasswordForm:
    """Test ChangePasswordForm validation."""
    
    def test_change_password_form_valid(self, app):
        """Test that ChangePasswordForm accepts valid data."""
        with app.app_context():
            formdata = MultiDict([
                ('current_password', 'OldPassword123!@#'),
                ('new_password', 'NewPassword123!@#'),
                ('new_password_confirm', 'NewPassword123!@#')
            ])
            form = ChangePasswordForm(formdata=formdata)
            assert form.validate() is True
    
    def test_change_password_form_passwords_dont_match(self, app):
        """Test that ChangePasswordForm rejects mismatched passwords."""
        with app.app_context():
            formdata = MultiDict([
                ('current_password', 'OldPassword123!@#'),
                ('new_password', 'NewPassword123!@#'),
                ('new_password_confirm', 'DifferentPassword123!@#')
            ])
            form = ChangePasswordForm(formdata=formdata)
            assert form.validate() is False
            assert 'new_password_confirm' in form.errors
    
    def test_change_password_form_weak_password(self, app):
        """Test that ChangePasswordForm rejects weak passwords."""
        with app.app_context():
            formdata = MultiDict([
                ('current_password', 'OldPassword123!@#'),
                ('new_password', 'weak'),
                ('new_password_confirm', 'weak')
            ])
            form = ChangePasswordForm(formdata=formdata)
            assert form.validate() is False
            assert 'new_password' in form.errors
    
    def test_change_password_form_missing_current_password(self, app):
        """Test that ChangePasswordForm requires current password."""
        with app.app_context():
            formdata = MultiDict([
                ('new_password', 'NewPassword123!@#'),
                ('new_password_confirm', 'NewPassword123!@#')
            ])
            form = ChangePasswordForm(formdata=formdata)
            assert form.validate() is False
            assert 'current_password' in form.errors


class TestChangePasswordRoute:
    """Test change password route."""
    
    def test_change_password_page_loads(self, client, test_user):
        """Test that change password page loads for authenticated user."""
        # Login first
        client.post('/login', data={
            'username': 'testuser',
            'password': 'TestPassword123!@#'
        }, follow_redirects=True)
        
        response = client.get('/profile/change-password')
        assert response.status_code == 200
        assert b'Change Password' in response.data
    
    def test_change_password_requires_auth(self, client):
        """Test that change password page requires authentication."""
        response = client.get('/profile/change-password', follow_redirects=True)
        assert b'Login' in response.data
    
    def test_change_password_success(self, client, test_user):
        """Test successful password change."""
        # Login first
        client.post('/login', data={
            'username': 'testuser',
            'password': 'TestPassword123!@#'
        }, follow_redirects=True)
        
        # Change password
        response = client.post('/profile/change-password', data={
            'current_password': 'TestPassword123!@#',
            'new_password': 'NewPassword123!@#',
            'new_password_confirm': 'NewPassword123!@#'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'Password changed successfully!' in response.data
        
        # Logout and try to login with new password
        client.get('/logout', follow_redirects=True)
        
        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'NewPassword123!@#'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'testuser' in response.data
    
    def test_change_password_wrong_current_password(self, client, test_user):
        """Test that password change fails with wrong current password."""
        # Login first
        client.post('/login', data={
            'username': 'testuser',
            'password': 'TestPassword123!@#'
        }, follow_redirects=True)
        
        # Try to change password with wrong current password
        response = client.post('/profile/change-password', data={
            'current_password': 'WrongPassword123!@#',
            'new_password': 'NewPassword123!@#',
            'new_password_confirm': 'NewPassword123!@#'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'Current password is incorrect' in response.data
        
        # Verify old password still works
        client.get('/logout', follow_redirects=True)
        
        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'TestPassword123!@#'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'testuser' in response.data
    
    def test_change_password_passwords_dont_match(self, client, test_user):
        """Test that password change fails when new passwords don't match."""
        # Login first
        client.post('/login', data={
            'username': 'testuser',
            'password': 'TestPassword123!@#'
        }, follow_redirects=True)
        
        # Try to change password with mismatched new passwords
        response = client.post('/profile/change-password', data={
            'current_password': 'TestPassword123!@#',
            'new_password': 'NewPassword123!@#',
            'new_password_confirm': 'DifferentPassword123!@#'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'Passwords must match' in response.data or b'Change Password' in response.data
