"""Pytest configuration and fixtures for testing."""

import os
import tempfile
from datetime import datetime, timezone

import pytest

from src.notehub import create_app
from src.notehub.config import AppConfig
from src.notehub.database import Base, SessionLocal, init_database
from src.notehub.models import User


class TestConfig(AppConfig):
    """Test configuration that uses SQLite instead of MySQL."""
    
    @property
    def database_uri(self) -> str:
        """Return SQLite in-memory database URI for testing."""
        return "sqlite:///:memory:"


@pytest.fixture(scope='session')
def test_config():
    """Create test configuration."""
    config = TestConfig()
    config.admin_username = 'testadmin'
    config.admin_password = 'TestPassword123!@#'
    
    yield config


@pytest.fixture(scope='function')
def app(test_config):
    """Create Flask application for testing."""
    app = create_app(test_config)
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False  # Disable CSRF for testing
    
    with app.app_context():
        # Clear all tables before each test
        from src.notehub.database import SessionLocal
        from sqlalchemy import text, inspect
        session = SessionLocal()
        inspector = inspect(session.bind)
        for table_name in inspector.get_table_names():
            if table_name != 'sqlite_sequence':
                session.execute(text(f'DELETE FROM {table_name}'))
        session.commit()
        session.close()
    
    yield app


@pytest.fixture(scope='function')
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture(scope='function')
def runner(app):
    """Create CLI runner."""
    return app.test_cli_runner()


@pytest.fixture(scope='function')
def db_session(app):
    """Create database session for testing."""
    with app.app_context():
        session = SessionLocal()
        yield session
        session.rollback()  # Rollback any uncommitted changes
        session.close()


@pytest.fixture(scope='function')
def test_user(db_session):
    """Create a test user."""
    user = User(username='testuser')
    user.set_password('TestPassword123!@#')
    user.created_at = datetime.now(timezone.utc)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope='function')
def auth_client(client, test_user):
    """Create an authenticated client."""
    with client.session_transaction() as sess:
        sess['user_id'] = test_user.id
    return client
