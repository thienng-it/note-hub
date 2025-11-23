"""Database helpers and session management."""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker


logger = logging.getLogger(__name__)
Base = declarative_base()
SessionLocal = scoped_session(sessionmaker())
_engine = None


def _log_user_insert(mapper, connection, target):
    """Enhanced logging for user creation with real-time audit trail."""
    logger.info(
        f"✅ USER CREATED IN REAL-TIME | "
        f"ID: {target.id} | "
        f"Username: {target.username} | "
        f"Email: {target.email or 'N/A'} | "
        f"Created: {target.created_at} | "
        f"2FA: {'Enabled' if target.totp_secret else 'Disabled'}"
    )


def _log_user_update(mapper, connection, target):
    """Enhanced logging for user updates with change detection."""
    changes = []
    if hasattr(target, '_sa_instance_state'):
        state = target._sa_instance_state
        if state.committed_state:
            for key in state.committed_state:
                old_val = state.committed_state[key]
                new_val = getattr(target, key)
                if old_val != new_val and key != 'password_hash':
                    changes.append(f"{key}: {old_val} → {new_val}")
    
    change_summary = ", ".join(changes) if changes else "No tracked changes"
    logger.info(
        f"🔄 USER UPDATED IN REAL-TIME | "
        f"ID: {target.id} | "
        f"Username: {target.username} | "
        f"Changes: {change_summary}"
    )


def init_database(database_uri: str):
    """Bind the SQLAlchemy session/metadata to the configured database."""
    global _engine
    
    # Log database connection information
    safe_uri = database_uri.split('@')[-1] if '@' in database_uri else database_uri
    logger.info(f"🗄️  Initializing database connection: {safe_uri}")
    
    # Database-specific configuration
    engine_args = {
        'echo': False,
    }
    
    if database_uri.startswith('mysql'):
        # MySQL-specific connection arguments and pooling settings
        engine_args.update({
            'pool_pre_ping': True,  # Verify connections before use
            'pool_recycle': 3600,   # Recycle connections after 1 hour
            'pool_size': 10,        # Connection pool size (good for MySQL)
            'max_overflow': 20,     # Allow up to 20 additional connections
            'connect_args': {
                'connect_timeout': 30,  # Increased timeout for cloud databases
                'charset': 'utf8mb4'
            }
        })
        # SSL configuration for cloud providers (PlanetScale, Railway, etc.)
        if 'ssl_disabled=false' in database_uri or 'psdb.cloud' in database_uri:
            engine_args['connect_args']['ssl'] = {'check_hostname': False}
            logger.info("🔒 SSL enabled for MySQL connection")
    elif database_uri.startswith('sqlite'):
        # SQLite-specific configuration (no pooling needed for single-file DB)
        engine_args.update({
            'connect_args': {'check_same_thread': False}  # Allow multi-threaded access
        })
    
    _engine = create_engine(database_uri, **engine_args)
    SessionLocal.remove()
    SessionLocal.configure(bind=_engine, expire_on_commit=False)
    
    # Create tables and indexes, handling existing ones gracefully
    try:
        Base.metadata.create_all(_engine, checkfirst=True)
    except Exception as e:
        # If index/table creation fails (e.g., already exists), log but continue
        # This handles edge cases where checkfirst doesn't catch everything
        logger.warning(f"Database creation warning (may be safe to ignore): {e}")
    
    # Set up enhanced event listeners for real-time audit logging
    from .models import User
    event.listen(User, 'after_insert', _log_user_insert)
    event.listen(User, 'after_update', _log_user_update)
    
    logger.info(f"✅ Database initialized successfully: {database_uri}")
    logger.info(f"✅ Real-time user creation monitoring ACTIVE")
    
    return _engine


@contextmanager
def get_session() -> Iterator[sessionmaker]:
    """Context manager for database sessions with automatic rollback on errors."""
    session = SessionLocal()
    try:
        yield session
        # Commit is called explicitly in routes, not here
    except Exception:
        session.rollback()
        logger.error("Session rolled back due to exception", exc_info=True)
        raise
    finally:
        session.close()


def session_factory():
    return SessionLocal
