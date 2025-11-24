"""WTForms definitions for the Note Hub application."""

from __future__ import annotations

from flask import current_app
from flask_wtf import FlaskForm
from flask_wtf.recaptcha import RecaptchaField
from wtforms import (BooleanField, DateField, PasswordField, SelectField,
                     StringField, TextAreaField)
from wtforms.validators import (DataRequired, Email, EqualTo, Length,
                                Optional as OptionalValidator, ValidationError)

from .security import (PASSWORD_POLICY_MIN_LENGTH, PASSWORD_POLICY_MESSAGE,
                       password_policy_errors)


def validate_password_complexity(form, field):
    errors = password_policy_errors(field.data)
    if errors:
        raise ValidationError(errors[0])


class LoginForm(FlaskForm):
    username = StringField("Username or Email", validators=[DataRequired(), Length(min=3, max=255)])
    password = PasswordField("Password", validators=[DataRequired()])
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only add recaptcha field if CAPTCHA is enabled
        if current_app.config.get('RECAPTCHA_ENABLED', False):
            self.recaptcha = RecaptchaField()


class Verify2FAForm(FlaskForm):
    totp_code = StringField("2FA Code", validators=[DataRequired(), Length(min=6, max=6)])


class RegisterForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired(), Length(min=3, max=64)])
    email = StringField("Email (optional)", validators=[OptionalValidator(), Email(), Length(max=255)])
    password = PasswordField(
        "Password",
        validators=[
            DataRequired(),
            Length(min=PASSWORD_POLICY_MIN_LENGTH),
            validate_password_complexity,
        ],
        description=PASSWORD_POLICY_MESSAGE,
    )
    password_confirm = PasswordField(
        "Confirm Password",
        validators=[DataRequired(), EqualTo("password", message="Passwords must match")],
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only add recaptcha field if CAPTCHA is enabled
        if current_app.config.get('RECAPTCHA_ENABLED', False):
            self.recaptcha = RecaptchaField()


class NoteForm(FlaskForm):
    title = StringField("Title", validators=[DataRequired(), Length(min=1, max=200)])
    body = TextAreaField("Content", validators=[OptionalValidator()])
    tags = StringField("Tags (comma separated)", validators=[OptionalValidator()])
    pinned = BooleanField("Pin this note")
    favorite = BooleanField("Mark as favorite")
    archived = BooleanField("Archive this note")


class SearchForm(FlaskForm):
    query = StringField("Search notes...", validators=[OptionalValidator()])
    tag_filter = StringField("Filter by tag", validators=[OptionalValidator()])


class ForgotPasswordForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired(), Length(min=3, max=64)])
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only add recaptcha field if CAPTCHA is enabled
        if current_app.config.get('RECAPTCHA_ENABLED', False):
            self.recaptcha = RecaptchaField()


class ResetPasswordForm(FlaskForm):
    password = PasswordField(
        "New Password",
        validators=[
            DataRequired(),
            Length(min=PASSWORD_POLICY_MIN_LENGTH),
            validate_password_complexity,
        ],
        description=PASSWORD_POLICY_MESSAGE,
    )
    password_confirm = PasswordField(
        "Confirm Password",
        validators=[DataRequired(), EqualTo("password", message="Passwords must match")],
    )


class ShareNoteForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired(), Length(min=3, max=64)])
    can_edit = BooleanField("Allow editing")


class InviteForm(FlaskForm):
    email = StringField("Email (optional)", validators=[OptionalValidator(), Email()])
    message = TextAreaField("Message (optional)", validators=[OptionalValidator()])


class TaskForm(FlaskForm):
    title = StringField("Title", validators=[DataRequired(), Length(min=1, max=200)])
    description = TextAreaField("Description", validators=[OptionalValidator()])
    due_date = DateField("Due Date (optional)", validators=[OptionalValidator()], format="%Y-%m-%d")
    priority = SelectField(
        "Priority",
        choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")],
        default="medium",
        validators=[DataRequired()],
    )


class ProfileEditForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired(), Length(min=3, max=64)])
    bio = TextAreaField("Bio", validators=[OptionalValidator(), Length(max=500)])
    email = StringField("Email", validators=[OptionalValidator(), Email(), Length(max=255)])


class Setup2FAForm(FlaskForm):
    totp_code = StringField("Verification Code", validators=[DataRequired(), Length(min=6, max=6)])
    secret = StringField("Secret", validators=[DataRequired()])
