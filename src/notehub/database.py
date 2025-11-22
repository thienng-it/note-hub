"""Database helpers and session management."""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker


logger = logging.getLogger(__name__)
Base = declarative_base()
SessionLocal = scoped_session(sessionmaker())
_engine = None


def _log_database_changes(mapper, connection, target):
    """Log when model instances are inserted/updated."""
    logger.info(f"Database change: {target.__class__.__name__} - {target.__dict__}")


def init_database(database_uri: str):
    """Bind the SQLAlchemy session/metadata to the configured database."""
    global _engine
    _engine = create_engine(database_uri, echo=False)
    SessionLocal.remove()
    SessionLocal.configure(bind=_engine)
    Base.metadata.create_all(_engine)
    
    # Set up event listeners for audit logging
    from .models import User
    event.listen(User, 'after_insert', _log_database_changes)
    event.listen(User, 'after_update', _log_database_changes)
    
    logger.info(f"Database initialized: {database_uri}")
    
    return _engine


@contextmanager
def get_session() -> Iterator[sessionmaker]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def session_factory():
    return SessionLocal
