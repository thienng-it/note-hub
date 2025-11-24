"""Tests for email validation in forms."""

import pytest
from werkzeug.datastructures import MultiDict
from src.notehub.forms import ProfileEditForm, RegisterForm, InviteForm


class TestEmailValidation:
    """Test email validation in forms."""
    
    def test_profile_edit_form_valid_email(self, app):
        """Test that ProfileEditForm accepts valid email."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', 'test@example.com'),
                ('bio', 'Test bio')
            ])
            form = ProfileEditForm(formdata=formdata)
            assert form.validate() is True
    
    def test_profile_edit_form_invalid_email(self, app):
        """Test that ProfileEditForm rejects invalid email."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', 'invalid-email'),
                ('bio', 'Test bio')
            ])
            form = ProfileEditForm(formdata=formdata)
            assert form.validate() is False
            assert 'email' in form.errors
    
    def test_profile_edit_form_empty_email(self, app):
        """Test that ProfileEditForm accepts empty email (optional field)."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', ''),
                ('bio', 'Test bio')
            ])
            form = ProfileEditForm(formdata=formdata)
            assert form.validate() is True
    
    def test_profile_edit_form_no_email(self, app):
        """Test that ProfileEditForm accepts no email field."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('bio', 'Test bio')
            ])
            form = ProfileEditForm(formdata=formdata)
            assert form.validate() is True
    
    def test_register_form_valid_email(self, app):
        """Test that RegisterForm accepts valid email."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', 'test@example.com'),
                ('password', 'TestPassword123!@#'),
                ('password_confirm', 'TestPassword123!@#')
            ])
            form = RegisterForm(formdata=formdata)
            assert form.validate() is True
    
    def test_register_form_invalid_email(self, app):
        """Test that RegisterForm rejects invalid email."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', 'not-an-email'),
                ('password', 'TestPassword123!@#'),
                ('password_confirm', 'TestPassword123!@#')
            ])
            form = RegisterForm(formdata=formdata)
            assert form.validate() is False
            assert 'email' in form.errors
    
    def test_register_form_empty_email(self, app):
        """Test that RegisterForm accepts empty email (optional field)."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', ''),
                ('password', 'TestPassword123!@#'),
                ('password_confirm', 'TestPassword123!@#')
            ])
            form = RegisterForm(formdata=formdata)
            assert form.validate() is True
    
    def test_invite_form_valid_email(self, app):
        """Test that InviteForm accepts valid email."""
        with app.app_context():
            formdata = MultiDict([
                ('email', 'test@example.com'),
                ('message', 'Test message')
            ])
            form = InviteForm(formdata=formdata)
            assert form.validate() is True
    
    def test_invite_form_invalid_email(self, app):
        """Test that InviteForm rejects invalid email."""
        with app.app_context():
            formdata = MultiDict([
                ('email', 'invalid@'),
                ('message', 'Test message')
            ])
            form = InviteForm(formdata=formdata)
            assert form.validate() is False
            assert 'email' in form.errors
    
    def test_invite_form_empty_email(self, app):
        """Test that InviteForm accepts empty email (optional field)."""
        with app.app_context():
            formdata = MultiDict([
                ('email', ''),
                ('message', 'Test message')
            ])
            form = InviteForm(formdata=formdata)
            assert form.validate() is True


class TestEmailValidationEdgeCases:
    """Test edge cases for email validation."""
    
    def test_email_with_plus_sign(self, app):
        """Test that emails with plus signs are accepted."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', 'test+tag@example.com'),
                ('bio', 'Test bio')
            ])
            form = ProfileEditForm(formdata=formdata)
            assert form.validate() is True
    
    def test_email_with_subdomain(self, app):
        """Test that emails with subdomains are accepted."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', 'test@mail.example.com'),
                ('bio', 'Test bio')
            ])
            form = ProfileEditForm(formdata=formdata)
            assert form.validate() is True
    
    def test_email_without_at_sign(self, app):
        """Test that emails without @ sign are rejected."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', 'testexample.com'),
                ('bio', 'Test bio')
            ])
            form = ProfileEditForm(formdata=formdata)
            assert form.validate() is False
            assert 'email' in form.errors
    
    def test_email_with_spaces(self, app):
        """Test that emails with spaces are rejected."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', 'test @example.com'),
                ('bio', 'Test bio')
            ])
            form = ProfileEditForm(formdata=formdata)
            assert form.validate() is False
            assert 'email' in form.errors
    
    def test_email_without_domain(self, app):
        """Test that emails without domain are rejected."""
        with app.app_context():
            formdata = MultiDict([
                ('username', 'testuser'),
                ('email', 'test@'),
                ('bio', 'Test bio')
            ])
            form = ProfileEditForm(formdata=formdata)
            assert form.validate() is False
            assert 'email' in form.errors
