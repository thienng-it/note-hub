"""JWT token service for API authentication."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import jwt
from flask import current_app


class JWTService:
    """Service for JWT token generation and validation."""
    
    @staticmethod
    def generate_token(user_id: int, expires_in: int = 86400) -> str:
        """Generate a JWT token for a user.
        
        Args:
            user_id: User ID to encode in token
            expires_in: Token expiration time in seconds (default 24 hours, extended from 1 hour)
            
        Returns:
            JWT token string
        """
        payload = {
            'user_id': user_id,
            'exp': datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            'iat': datetime.now(timezone.utc),
            'type': 'access'
        }
        
        secret_key = current_app.config['SECRET_KEY']
        return jwt.encode(payload, secret_key, algorithm='HS256')
    
    @staticmethod
    def generate_refresh_token(user_id: int, expires_in: int = 86400 * 30) -> str:
        """Generate a refresh token for a user.
        
        Args:
            user_id: User ID to encode in token
            expires_in: Token expiration time in seconds (default 30 days)
            
        Returns:
            JWT refresh token string
        """
        payload = {
            'user_id': user_id,
            'exp': datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            'iat': datetime.now(timezone.utc),
            'type': 'refresh'
        }
        
        secret_key = current_app.config['SECRET_KEY']
        return jwt.encode(payload, secret_key, algorithm='HS256')
    
    @staticmethod
    def validate_token(token: str) -> Tuple[bool, Optional[int], Optional[str]]:
        """Validate a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Tuple of (is_valid, user_id, error_message)
        """
        try:
            secret_key = current_app.config['SECRET_KEY']
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            # Check token type (expiration already handled by PyJWT)
            token_type = payload.get('type', 'access')
            if token_type not in ['access', 'refresh']:
                return False, None, 'Invalid token type'
            
            user_id = payload.get('user_id')
            if not user_id:
                return False, None, 'Invalid token payload'
            
            return True, user_id, None
            
        except jwt.ExpiredSignatureError:
            return False, None, 'Token has expired'
        except jwt.InvalidTokenError as e:
            return False, None, f'Invalid token: {str(e)}'
        except Exception as e:
            return False, None, f'Token validation error: {str(e)}'
    
    @staticmethod
    def refresh_access_token(refresh_token: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Refresh an access token using a refresh token.
        
        Args:
            refresh_token: JWT refresh token string
            
        Returns:
            Tuple of (success, new_access_token, error_message)
        """
        is_valid, user_id, error = JWTService.validate_token(refresh_token)
        
        if not is_valid:
            return False, None, error
        
        # Verify it's a refresh token
        try:
            secret_key = current_app.config['SECRET_KEY']
            payload = jwt.decode(refresh_token, secret_key, algorithms=['HS256'])
            if payload.get('type') != 'refresh':
                return False, None, 'Token is not a refresh token'
        except Exception as e:
            return False, None, f'Invalid refresh token: {str(e)}'
        
        # Generate new access token
        new_token = JWTService.generate_token(user_id)
        return True, new_token, None
