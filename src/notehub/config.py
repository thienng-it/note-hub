"""Configuration helpers for the Note Hub application."""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field


@dataclass(slots=True)
class AppConfig:
    """Simple configuration container with sane defaults."""

    db_path: str = field(default_factory=lambda: os.getenv("NOTES_DB_PATH", "notes.db"))
    admin_username: str = field(default_factory=lambda: os.getenv("NOTES_ADMIN_USERNAME", "admin"))
    admin_password: str = field(default_factory=lambda: os.getenv("NOTES_ADMIN_PASSWORD", "change-me"))
    secret_key: str = field(default_factory=lambda: os.getenv("FLASK_SECRET") or secrets.token_hex(32))
    max_content_length: int = 16 * 1024 * 1024

    @property
    def flask_settings(self) -> dict[str, object]:
        # Ensure we have a valid secret key
        secret = self.secret_key
        if not secret or len(secret) < 16:
            secret = secrets.token_hex(32)
            
        return {
            "SECRET_KEY": secret,
            "WTF_CSRF_ENABLED": True,
            "WTF_CSRF_TIME_LIMIT": None,  # No time limit for CSRF tokens
            "WTF_CSRF_SSL_STRICT": False,  # Allow both HTTP and HTTPS
            "WTF_CSRF_CHECK_DEFAULT": True,
            "SESSION_COOKIE_SECURE": False,  # Allow cookies over HTTP (Render uses proxy)
            "SESSION_COOKIE_HTTPONLY": True,
            "SESSION_COOKIE_SAMESITE": "Lax",
            "SESSION_COOKIE_NAME": "notehub_session",
            "SESSION_COOKIE_DOMAIN": None,  # Let Flask handle domain automatically
            "PERMANENT_SESSION_LIFETIME": 3600,  # 1 hour
            "MAX_CONTENT_LENGTH": self.max_content_length,
        }

    @property
    def database_uri(self) -> str:
        return f"sqlite:///{self.db_path}"
