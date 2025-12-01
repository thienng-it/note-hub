"""Configuration helpers for the Note Hub application."""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(slots=True)
class AppConfig:
    """Simple configuration container with sane defaults."""

    # SQLite configuration (default, used when NOTES_DB_PATH is set)
    sqlite_path: str = field(default_factory=lambda: os.getenv("NOTES_DB_PATH", ""))
    
    # MySQL configuration (used when MYSQL_HOST is explicitly set)
    db_host: str = field(default_factory=lambda: os.getenv("MYSQL_HOST", ""))
    db_port: int = field(default_factory=lambda: int(os.getenv("MYSQL_PORT", "3306")))
    db_user: str = field(default_factory=lambda: os.getenv("MYSQL_USER", "notehub"))
    db_password: str = field(default_factory=lambda: os.getenv("MYSQL_PASSWORD", ""))
    db_name: str = field(default_factory=lambda: os.getenv("MYSQL_DATABASE", "notehub"))
    
    admin_username: str = field(default_factory=lambda: os.getenv("NOTES_ADMIN_USERNAME", "admin"))
    admin_password: str = field(default_factory=lambda: os.getenv("NOTES_ADMIN_PASSWORD", "ChangeMeNow!42"))
    secret_key: str = field(default_factory=lambda: os.getenv("SECRET_KEY") or os.getenv("FLASK_SECRET") or secrets.token_hex(32))
    max_content_length: int = 16 * 1024 * 1024
    recaptcha_site_key: str = field(default_factory=lambda: os.getenv("RECAPTCHA_SITE_KEY", ""))
    recaptcha_secret_key: str = field(default_factory=lambda: os.getenv("RECAPTCHA_SECRET_KEY", ""))
    captcha_type: str = field(default_factory=lambda: os.getenv("CAPTCHA_TYPE", "simple"))
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        import logging
        logger = logging.getLogger(__name__)
        
        # Determine database type
        if self.sqlite_path:
            logger.info(f"📊 Database configured: SQLite at {self.sqlite_path}")
        elif self.db_host:
            logger.info(f"📊 Database configured: MySQL {self.db_user}@{self.db_host}:{self.db_port}/{self.db_name}")
        else:
            # Default to SQLite
            logger.info("📊 Database configured: SQLite (default notes.db)")
        
        # Check if running in production (Render sets PORT env var)
        is_production = bool(os.getenv("PORT"))
        
        # Warn about missing MySQL configuration in production when using MySQL
        if is_production and self.db_host:
            if not self.db_password:
                logger.error(
                    "❌ MYSQL_PASSWORD not set! Your app will fail to start.\n"
                    "   Set up external MySQL: See docs/guides/EXTERNAL_MYSQL_SETUP.md"
                )
            if self.db_host == "localhost":
                logger.error(
                    "❌ MYSQL_HOST is 'localhost'! This won't work on Render.\n"
                    "   Set MYSQL_HOST to your external database host."
                )

    @property
    def flask_settings(self) -> dict[str, object]:
        # Ensure we have a valid secret key
        secret = self.secret_key
        if not secret or len(secret) < 16:
            secret = secrets.token_hex(32)
        
        # Determine CAPTCHA configuration
        # CAPTCHA_TYPE can be: "simple", "recaptcha", or "none"
        captcha_type = self.captcha_type.lower()
        use_recaptcha = (captcha_type == "recaptcha" and 
                        bool(self.recaptcha_site_key and self.recaptcha_secret_key))
        use_simple_captcha = (captcha_type == "simple")
        captcha_enabled = use_recaptcha or use_simple_captcha
            
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
            "PERMANENT_SESSION_LIFETIME": 86400,  # 24 hours (extended from 1 hour)
            "MAX_CONTENT_LENGTH": self.max_content_length,
            "CAPTCHA_ENABLED": captcha_enabled,
            "CAPTCHA_TYPE": captcha_type,
            "RECAPTCHA_ENABLED": use_recaptcha,
            "RECAPTCHA_SITE_KEY": self.recaptcha_site_key,
            "RECAPTCHA_SECRET_KEY": self.recaptcha_secret_key,
            "RECAPTCHA_THEME": "light",
            "RECAPTCHA_TYPE": "image",
            "RECAPTCHA_SIZE": "normal",
        }

    @property
    def database_uri(self) -> str:
        """Build database connection URI.
        
        Priority:
        1. SQLite if NOTES_DB_PATH is set (Docker default)
        2. MySQL if MYSQL_HOST is set and NOTES_DB_PATH is not set
        3. SQLite (notes.db) as fallback
        
        This ensures Docker SQLite deployment works even if MySQL vars exist in .env
        """
        from urllib.parse import quote_plus
        import logging
        logger = logging.getLogger(__name__)
        
        # Priority 1: Use SQLite if NOTES_DB_PATH is explicitly set
        # This takes precedence over MYSQL_HOST to support Docker SQLite deployment
        if self.sqlite_path:
            # Handle both relative and absolute paths
            db_path = self.sqlite_path
            if not db_path.startswith('/'):
                # For relative paths, make sure parent directory exists
                parent = Path(db_path).parent
                if parent != Path('.') and not parent.exists():
                    parent.mkdir(parents=True, exist_ok=True)
            uri = f"sqlite:///{db_path}"
            logger.info(f"📊 Using SQLite database: {db_path}")
            return uri
        
        # Priority 2: Use MySQL if MYSQL_HOST is set
        if self.db_host:
            # Build MySQL URI with pymysql driver
            encoded_password = quote_plus(self.db_password) if self.db_password else ""
            
            # Disable SSL for local/Docker containers (configurable via MYSQL_SSL_DISABLED)
            # Default: disable SSL for common Docker network hostnames and local IPs
            ssl_disabled_env = os.getenv("MYSQL_SSL_DISABLED", "").lower()
            if ssl_disabled_env == "true":
                is_local = True
            elif ssl_disabled_env == "false":
                is_local = False
            else:
                # Auto-detect: disable SSL for common Docker/local hostnames
                is_local = (
                    self.db_host in ('mysql', 'db', 'database', 'localhost', '127.0.0.1') or
                    self.db_host.startswith('10.') or
                    self.db_host.startswith('172.') or
                    self.db_host.startswith('192.168.')
                )
            
            ssl_args = "charset=utf8mb4" if is_local else "charset=utf8mb4&ssl_disabled=false"
            
            if encoded_password:
                uri = f"mysql+pymysql://{self.db_user}:{encoded_password}@{self.db_host}:{self.db_port}/{self.db_name}?{ssl_args}"
            else:
                uri = f"mysql+pymysql://{self.db_user}@{self.db_host}:{self.db_port}/{self.db_name}?{ssl_args}"
            
            logger.info(f"📊 Using MySQL database: {self.db_user}@{self.db_host}:{self.db_port}/{self.db_name}")
            return uri
        
        # Priority 3: Default to SQLite in current directory
        uri = "sqlite:///notes.db"
        logger.info("📊 Using SQLite database: notes.db (default)")
        return uri
