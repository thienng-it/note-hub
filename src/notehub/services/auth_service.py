"""Business logic for authentication operations."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from ..models import Invitation, PasswordResetToken, User
from ..security import password_policy_errors


class AuthService:
    """Service class for authentication business logic."""
    
    @staticmethod
    def authenticate_user(
        session: Session,
        username_or_email: str,
        password: str
    ) -> Optional[User]:
        """Authenticate a user with username/email and password.
        
        Args:
            session: Database session
            username_or_email: Username or email address
            password: Password to check
            
        Returns:
            User if authentication successful, None otherwise
        """
        # Try to find user by username first, then by email
        user = session.execute(
            select(User).where(
                (User.username == username_or_email) | (User.email == username_or_email)
            )
        ).scalar_one_or_none()
        
        if user and user.check_password(password):
            return user
        
        return None
    
    @staticmethod
    def register_user(
        session: Session,
        username: str,
        password: str,
        invitation_token: Optional[str] = None,
        email: Optional[str] = None
    ) -> Tuple[bool, str, Optional[User]]:
        """Register a new user.
        
        Args:
            session: Database session
            username: Desired username
            password: Password
            invitation_token: Optional invitation token
            email: Optional email address
            
        Returns:
            Tuple of (success, message, user)
        """
        # Validate and sanitize input
        username = username.strip()
        if email:
            email = email.strip().lower()
        
        # Validate password policy
        policy_errors = password_policy_errors(password)
        if policy_errors:
            return False, f"Password policy violation: {policy_errors[0]}", None
        
        try:
            # Check username uniqueness within transaction
            existing_user = session.execute(
                select(User).where(User.username == username)
            ).scalar_one_or_none()
            
            if existing_user:
                return False, "Username already exists.", None
            
            # Check email uniqueness if provided
            if email:
                existing_email = session.execute(
                    select(User).where(User.email == email)
                ).scalar_one_or_none()
                
                if existing_email:
                    return False, "Email already in use.", None
            
            # Create new user
            new_user = User(username=username, email=email)
            try:
                new_user.set_password(password)
            except ValueError as e:
                return False, f"Password error: {str(e)}", None
            
            session.add(new_user)
            session.flush()  # Get user ID
            
            # Handle invitation if present
            if invitation_token:
                invitation = session.execute(
                    select(Invitation).where(Invitation.token == invitation_token)
                ).scalar_one_or_none()
                
                if invitation and invitation.is_valid():
                    invitation.used = True
                    invitation.used_by_id = new_user.id
                    session.add(invitation)
            
            return True, "Account created successfully! Please log in.", new_user
            
        except IntegrityError:
            return False, "Username already exists. Please choose a different username.", None
        except SQLAlchemyError as e:
            return False, "An error occurred during registration. Please try again.", None
        except Exception as e:
            return False, "An unexpected error occurred. Please try again.", None
    
    @staticmethod
    def create_password_reset_token(
        session: Session,
        username: str
    ) -> Tuple[bool, Optional[str], Optional[User]]:
        """Create a password reset token for a user.
        
        Args:
            session: Database session
            username: Username
            
        Returns:
            Tuple of (success, token, user)
        """
        user = session.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()
        
        if not user:
            return False, None, None
        
        # Invalidate existing tokens
        session.execute(
            text("UPDATE password_reset_tokens SET used = 1 WHERE user_id = :user_id AND used = 0"),
            {"user_id": user.id}
        )
        
        # Create new token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        session.add(reset_token)
        
        return True, token, user
    
    @staticmethod
    def reset_password(
        session: Session,
        token: str,
        new_password: str
    ) -> Tuple[bool, str]:
        """Reset a user's password using a reset token.
        
        Args:
            session: Database session
            token: Reset token
            new_password: New password
            
        Returns:
            Tuple of (success, message)
        """
        reset_token = session.execute(
            select(PasswordResetToken).where(PasswordResetToken.token == token)
        ).scalar_one_or_none()
        
        if not reset_token or not reset_token.is_valid():
            return False, "Invalid or expired reset token."
        
        user = session.get(User, reset_token.user_id)
        if not user:
            return False, "User not found."
        
        try:
            user.set_password(new_password)
            reset_token.used = True
            return True, "Password reset successfully!"
        except ValueError as e:
            return False, str(e)
    
    @staticmethod
    def update_last_login(session: Session, user: User) -> None:
        """Update the user's last login timestamp.
        
        Args:
            session: Database session
            user: User to update
        """
        user.last_login = datetime.now(timezone.utc)
