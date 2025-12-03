"""Startup helpers such as lightweight migrations and admin seeding."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select, text

from ..database import SessionLocal
from ..models import User


def migrate_database():
    """Ensure legacy databases gain the newer columns and performance indexes."""
    session = SessionLocal()
    try:
        migrations_applied = []
        
        # Check if we're using MySQL or SQLite
        # MySQL uses INFORMATION_SCHEMA, SQLite uses PRAGMA
        try:
            # Try MySQL first
            result = session.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'users'
            """))
            user_columns = {row[0] for row in result.fetchall()}
            is_mysql = True
        except:
            # Fall back to SQLite
            result = session.execute(text("PRAGMA table_info(users)"))
            user_columns = {row[1]: row for row in result.fetchall()}
            is_mysql = False

        def ensure(column: str, ddl: str, patch: str | None = None):
            if column not in user_columns:
                session.execute(text(ddl))
                if patch:
                    session.execute(text(patch))
                migrations_applied.append(f"users.{column}")

        # Apply migrations based on database type
        if is_mysql:
            ensure("theme", "ALTER TABLE users ADD COLUMN theme VARCHAR(20) DEFAULT 'light'")
            ensure("created_at", "ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
            ensure("last_login", "ALTER TABLE users ADD COLUMN last_login DATETIME")
            ensure("bio", "ALTER TABLE users ADD COLUMN bio TEXT")
            ensure("email", "ALTER TABLE users ADD COLUMN email VARCHAR(255)")
            ensure("totp_secret", "ALTER TABLE users ADD COLUMN totp_secret VARCHAR(32)")
        else:
            ensure("theme", "ALTER TABLE users ADD COLUMN theme VARCHAR(20) DEFAULT 'light'",
                   "UPDATE users SET theme = 'light' WHERE theme IS NULL")
            ensure("created_at", "ALTER TABLE users ADD COLUMN created_at DATETIME",
                   "UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")
            ensure("last_login", "ALTER TABLE users ADD COLUMN last_login DATETIME")
            ensure("bio", "ALTER TABLE users ADD COLUMN bio TEXT")
            ensure("email", "ALTER TABLE users ADD COLUMN email VARCHAR(255)")
            ensure("totp_secret", "ALTER TABLE users ADD COLUMN totp_secret VARCHAR(32)")

        # Add performance indexes for MySQL
        if is_mysql:
            _ensure_performance_indexes(session, migrations_applied)

        if migrations_applied:
            session.commit()
            print(f"✅ Added columns/indexes: {', '.join(migrations_applied)}")
    except Exception as exc:  # pragma: no cover - defensive logging
        print(f"⚠️  Migration error: {exc}")
        session.rollback()
    finally:
        session.close()


def _ensure_performance_indexes(session, migrations_applied):
    """Ensure critical performance indexes exist for MySQL.
    
    This is called during migrate_database() for MySQL databases only.
    Creates FULLTEXT index for body search performance.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Check if FULLTEXT index exists on notes.body and notes.title
        result = session.execute(text("""
            SELECT DISTINCT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'notes'
            AND INDEX_TYPE = 'FULLTEXT'
        """))
        fulltext_indexes = {row[0] for row in result.fetchall()}
        
        # Create FULLTEXT index if it doesn't exist
        # FULLTEXT indexes dramatically improve search performance on TEXT columns
        if 'idx_notes_fulltext_search' not in fulltext_indexes:
            try:
                session.execute(text("""
                    ALTER TABLE notes 
                    ADD FULLTEXT INDEX idx_notes_fulltext_search (title, body)
                """))
                migrations_applied.append("notes.fulltext_index")
                print("✅ Created FULLTEXT index for notes search")
                logger.info("Created FULLTEXT index for notes search")
            except Exception as e:
                # If index creation fails (e.g., InnoDB doesn't support FULLTEXT in old MySQL),
                # continue without it - search will still work, just slower
                print(f"⚠️  Could not create FULLTEXT index: {e}")
                logger.warning(f"Could not create FULLTEXT index: {e}")
                
    except Exception as e:
        print(f"⚠️  Could not check FULLTEXT indexes: {e}")
        logger.warning(f"Could not check FULLTEXT indexes: {e}")


def ensure_admin(username: str, password: str):
    """Ensure admin user exists in database.
    
    Creates admin user only if no users exist in the database.
    This function is called on every app startup.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    session = SessionLocal()
    try:
        # Count total users in database
        user_count = session.execute(select(User.id)).first()
        
        if not user_count:
            logger.info("🆕 No users found in database. Creating admin user...")
            admin = User(username=username)
            try:
                admin.set_password(password)
            except ValueError as exc:
                raise ValueError(
                    "Default admin password does not satisfy the password policy. "
                    "Set NOTES_ADMIN_PASSWORD to a compliant value."
                ) from exc
            admin.created_at = datetime.now(timezone.utc)
            session.add(admin)
            session.commit()
            logger.info(f"✅ Created admin user: {username} / {password}")
            print(f"Created admin user: {username} / {password}")
        else:
            logger.info(f"✅ Database already has users. Admin user already exists.")
            logger.info(f"💡 To log in, use existing credentials. Reset password via 'Forgot Password' if needed.")
    except Exception as e:
        logger.error(f"❌ Error during admin user check/creation: {e}")
        session.rollback()
        raise
    finally:
        session.close()
