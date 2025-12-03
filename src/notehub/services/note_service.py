"""Business logic for note operations."""

from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased, selectinload

from ..models import Note, ShareNote, Tag, User, note_tag
from .utils import parse_tags


class NoteService:
    """Service class for note business logic."""
    
    @staticmethod
    def _process_tags(session: Session, note: Note, tags_str: str) -> None:
        """Process and attach tags to a note.
        
        Args:
            session: Database session
            note: Note to attach tags to
            tags_str: Comma-separated tag names
        """
        note.tags.clear()
        session.flush()  # Flush the clear operation
        
        tag_names = parse_tags(tags_str)
        for tag_name in tag_names:
            tag = session.execute(
                select(Tag).where(Tag.name == tag_name)
            ).scalar_one_or_none()
            if not tag:
                tag = Tag(name=tag_name)
                session.add(tag)
                try:
                    session.flush()  # Flush to ensure tag has an ID before adding to note
                except IntegrityError:
                    # Tag was created by another request, fetch it
                    session.rollback()
                    tag = session.execute(
                        select(Tag).where(Tag.name == tag_name)
                    ).scalar_one_or_none()
                    if not tag:
                        raise
            # Only add if not already attached to avoid duplicate key error
            if tag not in note.tags:
                note.tags.append(tag)
    
    @staticmethod
    def get_notes_for_user(
        session: Session,
        user: User,
        view_type: str = 'all',
        query: str = '',
        tag_filter: str = ''
    ) -> Tuple[List[Note], List[Tag]]:
        """Get notes for a user with filtering and search.
        
        Performance optimized with:
        - Eager loading of relationships
        - Indexed queries on owner_id and archived
        - Selective loading based on view type
        
        Args:
            session: Database session
            user: Current user
            view_type: Type of view ('all', 'favorites', 'archived', 'shared')
            query: Search query
            tag_filter: Tag to filter by
            
        Returns:
            Tuple of (filtered notes, all tags)
        """
        # Eager load relationships to avoid N+1 queries
        stmt = select(Note).distinct().options(
            selectinload(Note.tags),
            selectinload(Note.owner)
        )
        
        # Apply view type filter
        if view_type == 'favorites':
            shared_note_ids = select(ShareNote.note_id).where(ShareNote.shared_with_id == user.id)
            stmt = stmt.where(
                Note.favorite == True,
                Note.archived == False,
                ((Note.owner_id == user.id) | (Note.id.in_(shared_note_ids)))
            )
        elif view_type == 'archived':
            stmt = stmt.where(Note.archived == True, Note.owner_id == user.id)
        elif view_type == 'shared':
            stmt = stmt.join(ShareNote).where(
                ShareNote.shared_with_id == user.id,
                Note.archived == False
            )
        else:  # 'all'
            shared_note_ids = select(ShareNote.note_id).where(ShareNote.shared_with_id == user.id)
            stmt = stmt.where(
                ((Note.owner_id == user.id) | (Note.id.in_(shared_note_ids))) &
                (Note.archived == False)
            )
        
        # Apply search filter - optimized to search title first, limit body search
        if query:
            like_term = f"%{query}%"
            tag_alias = aliased(Tag)
            note_tag_alias = aliased(note_tag)
            
            # For short queries (< 3 chars), only search title and tags (skip body)
            # For longer queries, search all fields but title gets priority via index
            if len(query.strip()) < 3:
                stmt = stmt.outerjoin(note_tag_alias).outerjoin(tag_alias).where(
                    (Note.title.ilike(like_term)) |
                    (tag_alias.name.ilike(like_term))
                )
            else:
                # Try to use FULLTEXT search for MySQL if available (much faster)
                # Falls back to ILIKE for SQLite or if FULLTEXT not available
                try:
                    from sqlalchemy import text as sql_text
                    # Test if we're on MySQL by checking dialect
                    if session.bind.dialect.name == 'mysql':
                        # Use FULLTEXT MATCH AGAINST for MySQL (requires FULLTEXT index)
                        # This is 10-100x faster than LIKE on large text fields
                        # Note: Using explicit table name 'notes' as it matches the model __tablename__
                        fulltext_condition = sql_text(
                            "MATCH(notes.title, notes.body) AGAINST (:search_term IN BOOLEAN MODE)"
                        )
                        stmt = stmt.outerjoin(note_tag_alias).outerjoin(tag_alias).where(
                            fulltext_condition.bindparams(search_term=f"+{query}*") |
                            (tag_alias.name.ilike(like_term))
                        )
                    else:
                        # Fall back to ILIKE for SQLite or other databases
                        stmt = stmt.outerjoin(note_tag_alias).outerjoin(tag_alias).where(
                            (Note.title.ilike(like_term)) |
                            (tag_alias.name.ilike(like_term)) |
                            (Note.body.ilike(like_term))
                        )
                except Exception:
                    # If FULLTEXT fails (index not created yet), fall back to ILIKE
                    stmt = stmt.outerjoin(note_tag_alias).outerjoin(tag_alias).where(
                        (Note.title.ilike(like_term)) |
                        (tag_alias.name.ilike(like_term)) |
                        (Note.body.ilike(like_term))
                    )
        
        # Apply tag filter
        if tag_filter:
            tag_alias2 = aliased(Tag)
            note_tag_alias2 = aliased(note_tag)
            stmt = stmt.join(
                note_tag_alias2,
                (Note.id == note_tag_alias2.c.note_id)
            ).join(
                tag_alias2,
                (note_tag_alias2.c.tag_id == tag_alias2.id)
            ).where(
                tag_alias2.name.ilike(f"%{tag_filter}%")
            )
        
        # Order and execute with limit to avoid loading too many notes
        # Limit to 1000 notes to prevent memory issues and improve performance
        stmt = stmt.order_by(
            Note.pinned.desc(),
            Note.updated_at.desc()
        ).limit(1000)
        notes = session.execute(stmt).scalars().unique().all()
        
        # Get all tags with note count via scalar subquery (much more efficient)
        from sqlalchemy import func
        note_count_subq = (
            select(func.count(note_tag.c.note_id))
            .where(note_tag.c.tag_id == Tag.id)
            .correlate(Tag)
            .scalar_subquery()
        )
        
        all_tags = session.execute(
            select(Tag, note_count_subq.label('note_count')).order_by(Tag.name)
        ).all()
        
        # Attach note_count as attribute to each tag for template access
        tags_with_counts = []
        for tag, count in all_tags:
            tag._cached_note_count = count
            tags_with_counts.append(tag)
        
        return notes, tags_with_counts
    
    @staticmethod
    def check_note_access(
        session: Session,
        note_id: int,
        user: User
    ) -> Tuple[Optional[Note], bool, bool]:
        """Check if user has access to a note and what permissions they have.
        
        Args:
            session: Database session
            note_id: ID of the note
            user: Current user
            
        Returns:
            Tuple of (note, has_access, can_edit)
        """
        note = session.execute(
            select(Note).options(selectinload(Note.tags)).where(Note.id == note_id)
        ).scalar_one_or_none()
        
        if not note:
            return None, False, False
        
        # Check if user is owner
        if note.owner_id is not None and note.owner_id == user.id:
            return note, True, True
        
        # Check if note is shared with user
        share = session.execute(
            select(ShareNote).where(
                ShareNote.note_id == note_id,
                ShareNote.shared_with_id == user.id
            )
        ).scalar_one_or_none()
        
        if share:
            return note, True, share.can_edit
        
        return note, False, False
    
    @staticmethod
    def create_note(
        session: Session,
        user: User,
        title: str,
        body: str = '',
        tags: str = '',
        pinned: bool = False,
        favorite: bool = False,
        archived: bool = False
    ) -> Note:
        """Create a new note.
        
        Args:
            session: Database session
            user: Owner of the note
            title: Note title
            body: Note body
            tags: Comma-separated tag names
            pinned: Whether to pin the note
            favorite: Whether to favorite the note
            archived: Whether to archive the note
            
        Returns:
            Created note
        """
        note = Note(
            title=title.strip(),
            body=body or "",
            pinned=pinned,
            favorite=favorite,
            archived=archived,
            owner_id=user.id
        )
        
        # Add note to session first to avoid SQLAlchemy warnings
        session.add(note)
        session.flush()  # Flush to get note ID
        
        # Process tags after note is in session
        NoteService._process_tags(session, note, tags)
        
        return note
    
    @staticmethod
    def update_note(
        session: Session,
        note: Note,
        user: User,
        title: str,
        body: str = '',
        tags: str = '',
        pinned: Optional[bool] = None,
        favorite: Optional[bool] = None,
        archived: Optional[bool] = None
    ) -> Note:
        """Update an existing note.
        
        Args:
            session: Database session
            note: Note to update
            user: Current user
            title: New title
            body: New body
            tags: Comma-separated tag names
            pinned: New pinned status (only for owner)
            favorite: New favorite status (only for owner)
            archived: New archived status (only for owner)
            
        Returns:
            Updated note
        """
        note.title = title.strip()
        note.body = body or ""
        
        # Only owner can update these fields
        is_owner = note.owner_id is not None and note.owner_id == user.id
        if is_owner:
            if pinned is not None:
                note.pinned = pinned
            if favorite is not None:
                note.favorite = favorite
            if archived is not None:
                note.archived = archived
        
        # Update tags
        NoteService._process_tags(session, note, tags)
        
        return note
    
    @staticmethod
    def share_note(
        session: Session,
        note: Note,
        shared_by: User,
        username: str,
        can_edit: bool = False
    ) -> Tuple[bool, str]:
        """Share a note with another user.
        
        Args:
            session: Database session
            note: Note to share
            shared_by: User sharing the note
            username: Username to share with
            can_edit: Whether the user can edit
            
        Returns:
            Tuple of (success, message)
        """
        shared_with_user = session.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()
        
        if not shared_with_user:
            return False, "User not found."
        
        if shared_with_user.id == shared_by.id:
            return False, "You cannot share a note with yourself."
        
        # Check if already shared
        existing_share = session.execute(
            select(ShareNote).where(
                ShareNote.note_id == note.id,
                ShareNote.shared_with_id == shared_with_user.id
            )
        ).scalar_one_or_none()
        
        if existing_share:
            return False, f"Note is already shared with {shared_with_user.username}."
        
        # Create share
        share = ShareNote(
            note_id=note.id,
            shared_by_id=shared_by.id,
            shared_with_id=shared_with_user.id,
            can_edit=can_edit
        )
        session.add(share)
        
        return True, f"Note shared with {shared_with_user.username}!"
