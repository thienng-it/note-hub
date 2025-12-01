"""Tests for Two-Factor Authentication setup.

Note: These tests have been updated for the SPA architecture.
2FA setup is now handled via the React frontend and JWT API.
The legacy Flask template-based tests have been removed.
"""

import pytest
import pyotp

from src.notehub.models import User
from src.notehub.services.utils import db


class TestSetup2FA:
    """Test 2FA setup functionality via API."""
    
    def test_2fa_can_be_enabled_on_user(self, app, test_user):
        """Test that 2FA secret can be set on user."""
        with app.app_context():
            secret = pyotp.random_base32()
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = secret
                s.commit()
                
            with db() as s:
                user = s.get(User, test_user.id)
                assert user.totp_secret is not None
                assert user.totp_secret == secret
    
    def test_totp_verification_with_valid_code(self, app, test_user):
        """Test TOTP verification with valid code."""
        with app.app_context():
            secret = pyotp.random_base32()
            totp = pyotp.TOTP(secret)
            
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = secret
                s.commit()
            
            with db() as s:
                user = s.get(User, test_user.id)
                assert user.verify_totp(totp.now()) is True
    
    def test_totp_verification_with_invalid_code(self, app, test_user):
        """Test TOTP verification with invalid code."""
        with app.app_context():
            secret = pyotp.random_base32()
            
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = secret
                s.commit()
            
            with db() as s:
                user = s.get(User, test_user.id)
                assert user.verify_totp('000000') is False
    
    def test_totp_verification_when_disabled(self, app, test_user):
        """Test TOTP verification when 2FA is disabled (no secret set).
        
        When 2FA is disabled, verify_totp returns True, meaning
        "TOTP verification is not required".
        """
        with app.app_context():
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = None
                s.commit()
            
            with db() as s:
                user = s.get(User, test_user.id)
                # verify_totp returns True when 2FA is disabled
                # (meaning verification is not needed)
                result = user.verify_totp('123456')
                assert result is True
    
    def test_api_login_with_2fa_requires_code(self, client, app, test_user):
        """Test API login with 2FA enabled requires TOTP code."""
        with app.app_context():
            secret = pyotp.random_base32()
            
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = secret
                s.commit()
        
        # Try to login without TOTP code
        response = client.post('/api/auth/login', 
            json={
                'username': 'testuser',
                'password': 'TestPassword123!@#'
            },
            content_type='application/json'
        )
        assert response.status_code == 401
        data = response.get_json()
        assert data.get('requires_2fa') is True
    
    def test_api_login_with_2fa_and_valid_code(self, client, app, test_user):
        """Test API login with 2FA and valid TOTP code."""
        with app.app_context():
            secret = pyotp.random_base32()
            totp = pyotp.TOTP(secret)
            
            with db() as s:
                user = s.get(User, test_user.id)
                user.totp_secret = secret
                s.commit()
        
        # Login with TOTP code
        response = client.post('/api/auth/login', 
            json={
                'username': 'testuser',
                'password': 'TestPassword123!@#',
                'totp_code': totp.now()
            },
            content_type='application/json'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
