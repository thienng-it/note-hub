"""SQLAlchemy models for the Note Hub application."""

from __future__ import annotations

from datetime import datetime, timezone

import bleach
import markdown as md
from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Integer, String,
                        Table, Text, Index, UniqueConstraint)
from sqlalchemy.orm import relationship

from .database import Base
from .security import enforce_password_policy


note_tag = Table(
    "note_tag",
    Base.metadata,
    Column("note_id", Integer, ForeignKey("notes.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    
    # Add table arguments for additional constraints and indexes
    __table_args__ = (
        Index('ix_users_username', 'username', unique=True),  # Explicit unique index
        Index('ix_users_email', 'email'),  # Index for email lookups
        Index('ix_users_created_at', 'created_at'),  # Index for time-based queries
    )

    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False)  # Removed index=True to avoid duplication
    password_hash = Column(String(255), nullable=False)
    theme = Column(String(20), default="light", nullable=False)
    bio = Column(Text, nullable=True)
    email = Column(String(255), nullable=True)  # Removed index=True to avoid duplication
    totp_secret = Column(String(32), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)  # Removed index=True
    last_login = Column(DateTime, nullable=True)

    def set_password(self, password: str):
        from werkzeug.security import generate_password_hash
        import logging

        logger = logging.getLogger(__name__)
        
        enforce_password_policy(password)
        self.password_hash = generate_password_hash(password)
        
        # Enhanced logging for audit trail
        logger.info(
            f"🔐 Password set for user: {self.username} | "
            f"ID: {self.id if self.id else 'new'} | "
            f"Action: {'Update' if self.id else 'Create'}"
        )

    def check_password(self, password: str) -> bool:
        from werkzeug.security import check_password_hash

        return check_password_hash(self.password_hash, password)

    def get_totp_uri(self, app_name: str = "Beautiful Notes"):
        import pyotp

        if not self.totp_secret:
            return None
        return pyotp.totp.TOTP(self.totp_secret).provisioning_uri(
            name=self.username, issuer_name=app_name
        )

    def verify_totp(self, token: str) -> bool:
        import pyotp

        if not self.totp_secret:
            return True
        totp = pyotp.TOTP(self.totp_secret)
        return totp.verify(token)
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="reset_tokens")

    def is_valid(self) -> bool:
        if self.used:
            return False
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return now < expires


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(64), unique=True, nullable=False, index=True)
    color = Column(String(7), default="#3B82F6")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    notes = relationship("Note", secondary=note_tag, back_populates="tags")

    @property
    def note_count(self):
        """Return cached note count if available, otherwise compute from relationship."""
        if hasattr(self, '_cached_note_count'):
            return self._cached_note_count
        return len(self.notes)


class Note(Base):
    __tablename__ = "notes"
    
    # Add table arguments for performance indexes
    __table_args__ = (
        Index('ix_notes_owner_archived', 'owner_id', 'archived'),  # Composite index for common queries
        Index('ix_notes_favorite', 'favorite'),  # Index for favorite queries
        Index('ix_notes_pinned', 'pinned'),  # Index for pinned notes
        Index('ix_notes_created_at', 'created_at'),  # Index for sorting by date
        Index('ix_notes_updated_at', 'updated_at'),  # Index for sorting by updated date
        Index('ix_notes_title', 'title'),  # Index for title searches
    )

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False, default="Untitled")
    body = Column(Text, nullable=False, default="")
    pinned = Column(Boolean, default=False, nullable=False)
    archived = Column(Boolean, default=False, nullable=False)
    favorite = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    tags = relationship("Tag", secondary=note_tag, back_populates="notes")
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_notes")
    shares = relationship("ShareNote", back_populates="note", cascade="all, delete-orphan")

    @property
    def excerpt(self) -> str:
        """Generate excerpt with caching to avoid repeated bleach.clean() calls."""
        if not hasattr(self, '_cached_excerpt') or self._cached_excerpt is None:
            plain_text = bleach.clean(self.body or "", tags=[], strip=True)
            self._cached_excerpt = plain_text[:150] + "..." if len(plain_text) > 150 else plain_text
        return self._cached_excerpt

    @property
    def reading_time(self) -> int:
        """Calculate reading time with caching to avoid repeated text splitting."""
        if not hasattr(self, '_cached_reading_time') or self._cached_reading_time is None:
            word_count = len((self.body or "").split())
            self._cached_reading_time = max(1, word_count // 200)
        return self._cached_reading_time

    def render_markdown(self) -> str:
        if not self.body:
            return ""
        try:
            html = md.markdown(
                self.body,
                extensions=["extra", "fenced_code", "tables", "toc", "nl2br", "sane_lists"],
            )
        except Exception:
            html = md.markdown(self.body, extensions=["extra", "fenced_code"])

        allowed_tags = {
            "p",
            "br",
            "strong",
            "em",
            "code",
            "pre",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "blockquote",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
            "a",
            "hr",
            "div",
            "span",
            "img",
            "del",
            "ins",
            "sub",
            "sup",
        }
        allowed_attrs = {
            "a": ["href", "title", "target", "rel"],
            "img": ["src", "alt", "title", "width", "height"],
            "code": ["class"],
            "pre": ["class"],
            "div": ["class"],
            "span": ["class"],
        }
        clean_html = bleach.clean(html, tags=allowed_tags, attributes=allowed_attrs)
        return bleach.linkify(clean_html)


class ShareNote(Base):
    __tablename__ = "share_notes"
    
    # Add table arguments for performance indexes
    __table_args__ = (
        Index('ix_share_notes_shared_with', 'shared_with_id'),  # Index for shared with queries
        Index('ix_share_notes_note', 'note_id'),  # Index for note lookups
        Index('ix_share_notes_shared_by', 'shared_by_id'),  # Index for shared by queries
    )

    id = Column(Integer, primary_key=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    shared_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_with_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    can_edit = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    note = relationship("Note", back_populates="shares")
    shared_by = relationship("User", foreign_keys=[shared_by_id], backref="notes_shared")
    shared_with = relationship(
        "User", foreign_keys=[shared_with_id], backref="notes_shared_with_me"
    )


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    used = Column(Boolean, default=False, nullable=False)
    used_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    inviter = relationship("User", foreign_keys=[inviter_id], backref="sent_invitations")
    used_by = relationship("User", foreign_keys=[used_by_id], backref="received_invitations")

    def is_valid(self) -> bool:
        if self.used:
            return False
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return now < expires


class Task(Base):
    __tablename__ = "tasks"
    
    # Add table arguments for performance indexes
    __table_args__ = (
        Index('ix_tasks_owner_completed', 'owner_id', 'completed'),  # Composite index for common queries
        Index('ix_tasks_due_date', 'due_date'),  # Index for due date queries
        Index('ix_tasks_priority', 'priority'),  # Index for priority filtering
        Index('ix_tasks_created_at', 'created_at'),  # Index for sorting by date
    )

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String(20), default="medium", nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", foreign_keys=[owner_id], backref="tasks")

    @property
    def is_overdue(self) -> bool:
        if not self.due_date or self.completed:
            return False
        now = datetime.now(timezone.utc)
        due = self.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return now > due
