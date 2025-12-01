"""Tests for password change functionality.

Note: These tests have been updated for the SPA architecture.
Password change is now primarily tested at the form validation level
since the route is handled by the React frontend.
"""

import pytest

from src.notehub.forms import ChangePasswordForm


class TestChangePasswordForm:
    """Test password change form validation."""
    
    def test_change_password_form_valid(self, app):
        """Test change password form with valid data."""
        with app.app_context():
            form = ChangePasswordForm(data={
                'current_password': 'OldPassword123!@#',
                'new_password': 'NewPassword456!@#',
                'new_password_confirm': 'NewPassword456!@#'
            })
            assert form.validate() is True
    
    def test_change_password_form_passwords_dont_match(self, app):
        """Test change password form with mismatched passwords."""
        with app.app_context():
            form = ChangePasswordForm(data={
                'current_password': 'OldPassword123!@#',
                'new_password': 'NewPassword456!@#',
                'new_password_confirm': 'DifferentPassword789!@#'
            })
            assert form.validate() is False
    
    def test_change_password_form_weak_password(self, app):
        """Test change password form with weak password."""
        with app.app_context():
            form = ChangePasswordForm(data={
                'current_password': 'OldPassword123!@#',
                'new_password': 'weak',
                'new_password_confirm': 'weak'
            })
            assert form.validate() is False
    
    def test_change_password_form_missing_current_password(self, app):
        """Test change password form with missing current password."""
        with app.app_context():
            form = ChangePasswordForm(data={
                'current_password': '',
                'new_password': 'NewPassword456!@#',
                'new_password_confirm': 'NewPassword456!@#'
            })
            assert form.validate() is False
