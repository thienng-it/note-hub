"""Authentication related routes (login, register, 2FA, password reset)."""

from __future__ import annotations

import base64
import secrets
from datetime import datetime, timedelta, timezone
from io import BytesIO

import pyotp
import qrcode
from flask import flash, redirect, render_template, request, session, url_for
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..extensions import limiter
from ..forms import (ForgotPasswordForm, LoginForm, RegisterForm,
                     ResetPasswordForm, Setup2FAForm, Verify2FAForm)
from ..models import Invitation, PasswordResetToken, User
from ..services.auth_service import AuthService
from ..services.utils import current_user, db, login_required


def register_auth_routes(app):
    """Register authentication-related routes."""
    
    @app.route("/login", methods=["GET", "POST"])
    @limiter.limit("10 per minute")
    def login():
        if current_user():
            return redirect(url_for("index"))

        form = LoginForm()
        if form.validate_on_submit():
            with db() as s:
                user = AuthService.authenticate_user(s, form.username.data, form.password.data)
                if user:
                    if user.totp_secret:
                        session['pre_2fa_user_id'] = user.id
                        return redirect(url_for('verify_2fa'))

                    session["user_id"] = user.id
                    AuthService.update_last_login(s, user)
                    s.commit()
                    flash(f"Welcome back, {user.username}!", "success")
                    return redirect(url_for("index"))

            flash("Invalid username or password.", "error")

        return render_template("login.html", form=form)

    @app.route("/verify-2fa", methods=["GET", "POST"])
    @limiter.limit("5 per minute")
    def verify_2fa():
        if current_user():
            return redirect(url_for("index"))

        user_id = session.get('pre_2fa_user_id')
        if not user_id:
            return redirect(url_for("login"))

        form = Verify2FAForm()
        if form.validate_on_submit():
            with db() as s:
                user = s.get(User, user_id)
                if user and user.verify_totp(form.totp_code.data):
                    session.pop('pre_2fa_user_id', None)
                    session['user_id'] = user.id
                    user.last_login = datetime.now(timezone.utc)
                    s.commit()
                    flash(f"Welcome back, {user.username}!", "success")
                    return redirect(url_for("index"))
                else:
                    flash("Invalid 2FA code.", "error")

        return render_template("verify_2fa.html", form=form)

    @app.route("/register", methods=["GET", "POST"])
    @limiter.limit("5 per hour")
    def register():
        """User registration with enhanced transaction handling and real-time DB save."""
        if current_user():
            return redirect(url_for("index"))

        token = request.args.get('token')
        invitation = None
        if token:
            with db() as s:
                invitation = s.execute(select(Invitation).where(Invitation.token == token)).scalar_one_or_none()
                if invitation and not invitation.is_valid():
                    flash("Invitation expired or used.", "error")
                    invitation = None

        form = RegisterForm()
        if form.validate_on_submit():
            with db() as s:
                success, message, new_user = AuthService.register_user(
                    s,
                    form.username.data,
                    form.password.data,
                    token,
                    form.email.data if form.email.data else None
                )
                
                if success:
                    s.commit()
                    app.logger.info(
                        f"✅ User registration successful | "
                        f"Username: {new_user.username} | "
                        f"Email: {new_user.email or 'N/A'} | "
                        f"ID: {new_user.id} | "
                        f"Saved to DB: Real-time"
                    )
                    flash(message, "success")
                    return redirect(url_for("login"))
                else:
                    flash(message, "error")

        return render_template("register.html", form=form, invitation=invitation)

    @app.route("/logout")
    @login_required
    def logout():
        session.clear()
        flash("Logged out", "success")
        return redirect(url_for("login"))

    @app.route("/profile/setup-2fa", methods=["GET", "POST"])
    @login_required
    def setup_2fa():
        user = current_user()
        form = Setup2FAForm()

        if form.validate_on_submit():
            secret = form.secret.data
            totp = pyotp.TOTP(secret)
            if totp.verify(form.totp_code.data):
                with db() as s:
                    db_user = s.get(User, user.id)
                    db_user.totp_secret = secret
                    s.commit()
                flash("2FA enabled successfully!", "success")
                return redirect(url_for("profile"))
            else:
                flash("Invalid code. Please scan the QR code and try again.", "error")

        secret = pyotp.random_base32()
        uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.username, issuer_name="Beautiful Notes")
        img = qrcode.make(uri)
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        form.secret.data = secret

        return render_template("setup_2fa.html", form=form, qr_code=qr_base64, secret=secret)

    @app.route("/profile/disable-2fa", methods=["POST"])
    @login_required
    def disable_2fa():
        user = current_user()
        with db() as s:
            db_user = s.get(User, user.id)
            db_user.totp_secret = None
            s.commit()
        flash("2FA has been disabled.", "warning")
        return redirect(url_for("profile"))

    @app.route("/forgot-password", methods=["GET", "POST"])
    @limiter.limit("3 per hour")
    def forgot_password():
        if current_user():
            return redirect(url_for("index"))

        form = ForgotPasswordForm()
        if form.validate_on_submit():
            with db() as s:
                user = s.execute(select(User).where(User.username == form.username.data)).scalar_one_or_none()

                if user:
                    if user.totp_secret:
                        session['reset_2fa_user_id'] = user.id
                        return redirect(url_for('verify_2fa_reset'))

                    token = secrets.token_urlsafe(32)
                    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

                    s.execute(text("UPDATE password_reset_tokens SET used = 1 WHERE user_id = :user_id AND used = 0"), {"user_id": user.id})

                    reset_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
                    s.add(reset_token)
                    s.commit()

                    print(f"\n[SECURITY] Password reset token for '{user.username}': {token}\n")

                    return render_template("forgot_password.html", form=form, token=None, token_generated=True)
                else:
                    flash("If that username exists, a password reset token has been generated.", "success")
                    return redirect(url_for("login"))

        return render_template("forgot_password.html", form=form, token=None, token_generated=False)

    @app.route("/verify-2fa-reset", methods=["GET", "POST"])
    def verify_2fa_reset():
        user_id = session.get('reset_2fa_user_id')
        if not user_id:
            return redirect(url_for("forgot_password"))

        form = Verify2FAForm()
        if form.validate_on_submit():
            with db() as s:
                user = s.get(User, user_id)
                if user and user.verify_totp(form.totp_code.data):
                    session.pop('reset_2fa_user_id', None)

                    token = secrets.token_urlsafe(32)
                    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

                    s.execute(text("UPDATE password_reset_tokens SET used = 1 WHERE user_id = :user_id AND used = 0"), {"user_id": user.id})
                    reset_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
                    s.add(reset_token)
                    s.commit()

                    flash("Identity verified! Please set your new password.", "success")
                    return redirect(url_for('reset_password', token=token))
                else:
                    flash("Invalid 2FA code.", "error")

        return render_template("verify_2fa_reset.html", form=form)

    @app.route("/reset-password/<token>", methods=["GET", "POST"])
    @limiter.limit("5 per hour")
    def reset_password(token: str):
        if current_user():
            return redirect(url_for("index"))
        form = ResetPasswordForm()

        if form.validate_on_submit():
            with db() as s:
                success, message = AuthService.reset_password(s, token, form.password.data)
                if success:
                    s.commit()
                    flash(message, "success")
                    return redirect(url_for("login"))
                else:
                    flash(message, "error")
                    return redirect(url_for("forgot_password"))

        # Check if token is valid for GET request
        with db() as s:
            reset_token = s.execute(select(PasswordResetToken).where(PasswordResetToken.token == token)).scalar_one_or_none()
            if not reset_token or not reset_token.is_valid():
                flash("Invalid or expired reset token.", "error")
                return redirect(url_for("forgot_password"))

        return render_template("reset_password.html", form=form, token=token)
