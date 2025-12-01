"""Tests for disabling Two-Factor Authentication.

Note: These tests have been updated for the SPA architecture.
2FA disable is now handled via the React frontend and JWT API.
The legacy Flask template-based tests have been removed.
"""

import pytest
import pyotp

from src.notehub.models import User
from src.notehub.services.utils import db


class TestDisable2FA:
    """Test 2FA disable functionality."""
    
    def test_2fa_can_be_disabled_on_user(self, app, test_user):
        """Test that 2FA secret can be removed from user."""
        with app.app_context():
            secret = pyotp.random_base32()
            
            # First enable 2FA
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = secret
                s.commit()
            
            # Verify it's enabled
            with db() as s:
                user = s.get(User, test_user.id)
                assert user.totp_secret is not None
            
            # Now disable it
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = None
                s.commit()
            
            # Verify it's disabled
            with db() as s:
                user = s.get(User, test_user.id)
                assert user.totp_secret is None
    
    def test_verify_totp_returns_true_when_disabled(self, app, test_user):
        """Test TOTP verification returns True when 2FA is disabled.
        
        This behavior is by design: when 2FA is disabled, verify_totp
        returns True meaning "verification is not required".
        """
        with app.app_context():
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = None
                s.commit()
            
            with db() as s:
                user = s.get(User, test_user.id)
                # Returns True when 2FA is not enabled
                assert user.verify_totp('123456') is True
    
    def test_login_without_totp_after_disable(self, client, app, test_user):
        """Test API login works without TOTP after 2FA is disabled."""
        with app.app_context():
            # Ensure 2FA is disabled
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = None
                s.commit()
        
        # Login should work without TOTP
        response = client.post('/api/auth/login', 
            json={
                'username': 'testuser',
                'password': 'TestPassword123!@#'
            },
            content_type='application/json'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
        assert data.get('requires_2fa') is not True
