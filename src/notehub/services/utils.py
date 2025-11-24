"""Generic helpers shared across views."""

from __future__ import annotations

from functools import wraps
from typing import Callable, List, Optional

from flask import flash, redirect, session, url_for

from ..database import get_session
from ..models import User


def db():
    return get_session()


def invalidate_user_cache():
    """Invalidate cached user data in session.
    
    Call this after updating user profile, theme, or other user attributes
    to ensure the cache is refreshed on next request.
    """
    session.pop("_cached_user_data", None)


def cache_user_in_session(user: User):
    """Cache user data in session for performance.
    
    Caches essential user attributes to avoid repeated database queries.
    Call this after login, 2FA verification, or when user data needs refreshing.
    
    Args:
        user: User object to cache
    """
    session["_cached_user_data"] = {
        "id": user.id,
        "username": user.username,
        "theme": user.theme,
        "email": user.email,
        "bio": user.bio,
        "totp_secret": user.totp_secret,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }
    session["theme"] = user.theme


def current_user() -> Optional[User]:
    """Get current user from session.
    
    Uses session caching to avoid repeated database queries.
    Returns a lightweight User object with essential attributes cached.
    """
    user_id = session.get("user_id")
    if not user_id:
        return None
    
    # Check if we have cached user data in the session
    cached_user_data = session.get("_cached_user_data")
    
    # If cache exists and user_id matches, return cached user
    if cached_user_data and cached_user_data.get("id") == user_id:
        # Create a minimal User object from cached data
        # This avoids DB queries for every request
        from datetime import datetime
        
        user = User()
        user.id = cached_user_data["id"]
        user.username = cached_user_data["username"]
        user.theme = cached_user_data.get("theme", "light")
        user.email = cached_user_data.get("email")
        user.bio = cached_user_data.get("bio")
        user.totp_secret = cached_user_data.get("totp_secret")
        # Restore datetime fields from cached ISO strings
        if cached_user_data.get("created_at"):
            user.created_at = datetime.fromisoformat(cached_user_data["created_at"])
        if cached_user_data.get("last_login"):
            user.last_login = datetime.fromisoformat(cached_user_data["last_login"])
        return user
    
    # If no cache or cache is stale, fetch from database
    with db() as s:
        user = s.get(User, user_id)
        if user:
            # Cache user data in session to avoid future DB queries
            cache_user_in_session(user)
        return user


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
