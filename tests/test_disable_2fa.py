"""Tests for disable 2FA with OTP verification."""

import pyotp
import pytest


def get_csrf_token(client):
    """Helper to get CSRF token for testing."""
    # When CSRF is disabled in tests, return a dummy token
    if not client.application.config.get('WTF_CSRF_ENABLED', False):
        return 'test'
    # Otherwise, fetch a real CSRF token from the app
    return client.application.config.get('WTF_CSRF_SECRET_KEY', 'test')


class TestDisable2FA:
    """Test cases for disabling 2FA with verification."""
    
    def test_disable_2fa_requires_login(self, client):
        """Test that disable 2FA page requires authentication."""
        response = client.get('/profile/disable-2fa', follow_redirects=True)
        assert response.status_code == 200
        assert b'login' in response.data.lower() or b'log in' in response.data.lower()
    
    def test_disable_2fa_requires_2fa_enabled(self, client, auth_client):
        """Test that disable 2FA redirects if 2FA is not enabled."""
        response = auth_client.get('/profile/disable-2fa', follow_redirects=True)
        assert response.status_code == 200
        # Should redirect to profile with message about 2FA not being enabled
        assert b'Profile' in response.data or b'not enabled' in response.data
    
    def test_disable_2fa_page_loads(self, client, logged_in_user_with_2fa):
        """Test that disable 2FA page loads for users with 2FA enabled."""
        response = client.get('/profile/disable-2fa')
        assert response.status_code == 200
        assert b'Disable Two-Factor Authentication' in response.data
        assert b'totp_code' in response.data
    
    def test_disable_2fa_with_valid_code(self, client, logged_in_user_with_2fa):
        """Test disabling 2FA with a valid OTP code."""
        user, secret = logged_in_user_with_2fa
        totp = pyotp.TOTP(secret)
        code = totp.now()
        
        response = client.post('/profile/disable-2fa', data={
            'totp_code': code,
            'csrf_token': get_csrf_token(client)
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'disabled' in response.data.lower()
    
    def test_disable_2fa_with_invalid_code(self, client, logged_in_user_with_2fa):
        """Test that disabling 2FA fails with invalid OTP code."""
        response = client.post('/profile/disable-2fa', data={
            'totp_code': '000000',
            'csrf_token': get_csrf_token(client)
        }, follow_redirects=False)
        
        assert response.status_code == 200
        assert b'Invalid 2FA code' in response.data or b'invalid' in response.data.lower()
    
    def test_disable_2fa_form_validation(self, client, logged_in_user_with_2fa):
        """Test that disable 2FA form requires all fields."""
        response = client.post('/profile/disable-2fa', data={
            'csrf_token': get_csrf_token(client)
        }, follow_redirects=False)
        
        assert response.status_code == 200
        # Form should not be valid without totp_code
        assert b'This field is required' in response.data or b'2FA Code' in response.data


@pytest.fixture
def logged_in_user_with_2fa(client, app):
    """Fixture for a logged-in user with 2FA enabled."""
    from src.notehub.models import User
    from src.notehub.services.utils import db
    
    # Create a test user with 2FA
    secret = pyotp.random_base32()
    
    with db() as s:
        user = User(username='test2fa', email='test2fa@example.com')
        user.set_password('SecurePass123!')
        user.totp_secret = secret
        s.add(user)
        s.commit()
        user_id = user.id
    
    # Log in the user
    with client.session_transaction() as sess:
        sess['user_id'] = user_id
    
    yield user, secret
    
    # Cleanup
    with db() as s:
        user = s.get(User, user_id)
        if user:
            s.delete(user)
            s.commit()
