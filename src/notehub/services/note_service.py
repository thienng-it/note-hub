"""Business logic for note operations."""

from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased, joinedload, selectinload

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
        tag_names = parse_tags(tags_str)
        for tag_name in tag_names:
            tag = session.execute(
                select(Tag).where(Tag.name == tag_name)
            ).scalar_one_or_none()
            if not tag:
                tag = Tag(name=tag_name)
                session.add(tag)
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
        
        # Apply search filter
        if query:
            like_term = f"%{query}%"
            tag_alias = aliased(Tag)
            stmt = stmt.outerjoin(note_tag).outerjoin(tag_alias).where(
                (Note.title.ilike(like_term)) |
                (Note.body.ilike(like_term)) |
                (tag_alias.name.ilike(like_term))
            )
        
        # Apply tag filter
        if tag_filter:
            tag_alias2 = aliased(Tag)
            stmt = stmt.join(note_tag).join(tag_alias2).where(
                tag_alias2.name.ilike(f"%{tag_filter}%")
            )
        
        # Order and execute
        stmt = stmt.options(joinedload(Note.tags)).order_by(
            Note.pinned.desc(),
            Note.updated_at.desc()
        )
        notes = session.execute(stmt).scalars().unique().all()
        
        # Get all tags
        all_tags = session.execute(
            select(Tag).options(selectinload(Tag.notes)).order_by(Tag.name)
        ).scalars().all()
        
        return notes, all_tags
    
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
            select(Note).options(joinedload(Note.tags)).where(Note.id == note_id)
        ).unique().scalar_one_or_none()
        
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
        
        # Process tags
        NoteService._process_tags(session, note, tags)
        
        session.add(note)
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
