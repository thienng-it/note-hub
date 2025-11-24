"""Generic helpers shared across views."""

from __future__ import annotations

from functools import wraps
from typing import Callable, List, Optional

from flask import flash, redirect, session, url_for

from ..database import get_session
from ..models import User


def db():
    return get_session()


def current_user() -> Optional[User]:
    user_id = session.get("user_id")
    if not user_id:
        return None
    with db() as s:
        return s.get(User, user_id)


def login_required(view: Callable):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not current_user():
            flash("Please log in first.", "warning")
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapper


def normalize_tag(name: str) -> str:
    if not name:
        return ""
    normalized = "".join(c for c in name.lower().strip() if c.isalnum() or c in "_-")
    return normalized[:64]


def parse_tags(tag_string: str) -> List[str]:
    """Parse comma-separated tags and return unique list.
    
    Args:
        tag_string: Comma-separated tag names
        
    Returns:
        List of unique, normalized tag names
    """
    if not tag_string:
        return []
    # Use dict.fromkeys to preserve order while removing duplicates
    seen = {}
    for tag in tag_string.split(","):
        normalized = normalize_tag(tag.strip())
        if normalized and normalized not in seen:
            seen[normalized] = None
    return list(seen.keys())


def cleanup_orphaned_tags(session):
    """Remove tags that are not associated with any notes.
    
    This is called after updating or deleting notes to keep the tags table clean.
    Only tags with no notes are deleted.
    
    Args:
        session: Database session
    """
    from sqlalchemy import delete, exists, select
    from ..models import Tag, note_tag
    
    # Delete tags that are not associated with any notes using a single SQL query
    # This is more efficient than loading all tags into memory
    stmt = delete(Tag).where(
        ~exists().where(note_tag.c.tag_id == Tag.id)
    )
    session.execute(stmt)
