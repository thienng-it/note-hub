"""Tests for 2FA setup functionality."""

import base64
import re

import pyotp
import pytest


class TestSetup2FA:
    """Test 2FA setup routes and functionality."""
    
    def test_setup_2fa_requires_login(self, client):
        """Test that setup-2fa requires authentication."""
        response = client.get('/profile/setup-2fa', follow_redirects=False)
        assert response.status_code == 302  # Redirect to login
        assert '/login' in response.location
    
    def test_setup_2fa_page_loads(self, auth_client):
        """Test setup-2fa page loads successfully for authenticated user."""
        response = auth_client.get('/profile/setup-2fa')
        assert response.status_code == 200
        # Check for the page heading
        assert b'Setup' in response.data and (b'2FA' in response.data or b'Two-Factor' in response.data)
    
    def test_setup_2fa_contains_qr_code(self, auth_client):
        """Test that setup-2fa page contains QR code."""
        response = auth_client.get('/profile/setup-2fa')
        assert response.status_code == 200
        assert b'data:image/png;base64,' in response.data
        assert b'qr' in response.data.lower()
    
    def test_setup_2fa_contains_secret_key(self, auth_client):
        """Test that setup-2fa page contains secret key."""
        response = auth_client.get('/profile/setup-2fa')
        assert response.status_code == 200
        
        # Check for secret key in the response
        html = response.data.decode('utf-8')
        # Secret should be in a code or input field
        assert 'secret' in html.lower()
        
        # Try to extract the secret from hidden input
        secret_match = re.search(r'name="secret"\s+value="([A-Z0-9]+)"', html)
        assert secret_match is not None, "Secret not found in hidden input"
        secret = secret_match.group(1)
        assert len(secret) >= 16, "Secret is too short"
    
    def test_setup_2fa_contains_toggle_buttons(self, auth_client):
        """Test that setup-2fa page contains toggle buttons for QR/Secret view."""
        response = auth_client.get('/profile/setup-2fa')
        assert response.status_code == 200
        
        html = response.data.decode('utf-8')
        assert 'showQRCode' in html or 'qrBtn' in html
        assert 'showSecret' in html or 'secretBtn' in html
        assert 'QR Code' in html
        assert 'Secret Key' in html
    
    def test_setup_2fa_contains_copy_button(self, auth_client):
        """Test that setup-2fa page contains copy button for secret."""
        response = auth_client.get('/profile/setup-2fa')
        assert response.status_code == 200
        
        html = response.data.decode('utf-8')
        assert 'copySecret' in html or 'Copy' in html
    
    def test_setup_2fa_contains_refresh_button(self, auth_client):
        """Test that setup-2fa page contains refresh button."""
        response = auth_client.get('/profile/setup-2fa')
        assert response.status_code == 200
        
        html = response.data.decode('utf-8')
        assert 'refreshSecret' in html or 'fa-sync' in html
    
    def test_setup_2fa_verification_with_valid_code(self, auth_client, app, test_user):
        """Test 2FA setup with valid verification code."""
        # First, get the setup page to get a secret
        response = auth_client.get('/profile/setup-2fa')
        assert response.status_code == 200
        
        html = response.data.decode('utf-8')
        secret_match = re.search(r'name="secret"\s+value="([A-Z0-9]+)"', html)
        assert secret_match is not None
        secret = secret_match.group(1)
        
        # Generate a valid TOTP code
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()
        
        # Submit the form with valid code
        response = auth_client.post('/profile/setup-2fa', data={
            'secret': secret,
            'totp_code': valid_code
        }, follow_redirects=True)
        
        assert response.status_code == 200
        # Check for success message
        assert b'2FA enabled successfully' in response.data
        
        # Verify that the user's totp_secret was saved using a new session
        from src.notehub.database import SessionLocal
        from src.notehub.models import User
        with app.app_context():
            session = SessionLocal()
            user = session.get(User, test_user.id)
            assert user.totp_secret == secret
            session.close()
    
    def test_setup_2fa_verification_with_invalid_code(self, auth_client, app, test_user):
        """Test 2FA setup with invalid verification code."""
        # First, get the setup page to get a secret
        response = auth_client.get('/profile/setup-2fa')
        assert response.status_code == 200
        
        html = response.data.decode('utf-8')
        secret_match = re.search(r'name="secret"\s+value="([A-Z0-9]+)"', html)
        assert secret_match is not None
        secret = secret_match.group(1)
        
        # Submit the form with invalid code
        response = auth_client.post('/profile/setup-2fa', data={
            'secret': secret,
            'totp_code': '000000'  # Invalid code
        }, follow_redirects=True)
        
        assert response.status_code == 200
        # Check for specific error message
        assert b'Invalid verification code' in response.data
        
        # Verify that the user's totp_secret was NOT saved using a new session
        from src.notehub.database import SessionLocal
        from src.notehub.models import User
        with app.app_context():
            session = SessionLocal()
            user = session.get(User, test_user.id)
            assert user.totp_secret is None
            session.close()
    
    def test_setup_2fa_generates_new_secret_on_failure(self, auth_client):
        """Test that a new secret is generated after verification failure."""
        # First request - get initial secret
        response1 = auth_client.get('/profile/setup-2fa')
        html1 = response1.data.decode('utf-8')
        secret_match1 = re.search(r'name="secret"\s+value="([A-Z0-9]+)"', html1)
        assert secret_match1 is not None
        secret1 = secret_match1.group(1)
        
        # Submit with invalid code
        response2 = auth_client.post('/profile/setup-2fa', data={
            'secret': secret1,
            'totp_code': '000000'
        }, follow_redirects=False)
        
        # Check that a new secret was generated in the response
        html2 = response2.data.decode('utf-8')
        secret_match2 = re.search(r'name="secret"\s+value="([A-Z0-9]+)"', html2)
        assert secret_match2 is not None
        secret2 = secret_match2.group(1)
        
        # Secrets should be different after failure
        assert secret1 != secret2, "Secret should be regenerated after verification failure"
    
    def test_setup_2fa_page_has_help_text(self, auth_client):
        """Test that setup-2fa page contains helpful instructions."""
        response = auth_client.get('/profile/setup-2fa')
        assert response.status_code == 200
        
        html = response.data.decode('utf-8')
        # Check for helpful text
        assert 'authenticator' in html.lower()
        assert 'scan' in html.lower() or 'enter' in html.lower()
