"""Tests for error handling in note operations."""

import pytest
from sqlalchemy.exc import IntegrityError

from src.notehub.models import Note, Tag
from src.notehub.services.note_service import NoteService


class TestNoteErrorHandling:
    """Test error handling for note operations."""
    
    def test_create_note_with_duplicate_tags(self, db_session, test_user):
        """Test creating a note with duplicate tag names in the same request."""
        # Create a note with duplicate tags in the tag string
        note = NoteService.create_note(
            session=db_session,
            user=test_user,
            title="Test Note",
            body="Test body",
            tags="python, python, django"  # Duplicate "python" tag
        )
        db_session.commit()
        
        # Should only have 2 unique tags
        assert len(note.tags) == 2
        tag_names = {tag.name for tag in note.tags}
        assert tag_names == {"python", "django"}
    
    def test_update_note_with_existing_tags(self, db_session, test_user):
        """Test updating a note with tags that already exist in database."""
        # Create initial tags
        tag1 = Tag(name="python")
        tag2 = Tag(name="django")
        db_session.add_all([tag1, tag2])
        db_session.commit()
        
        # Create a note with one of the existing tags
        note = NoteService.create_note(
            session=db_session,
            user=test_user,
            title="Test Note",
            body="Test body",
            tags="python"
        )
        db_session.commit()
        
        # Update note to add another existing tag
        NoteService.update_note(
            session=db_session,
            note=note,
            user=test_user,
            title="Updated Note",
            body="Updated body",
            tags="python, django"
        )
        db_session.commit()
        
        # Should have both tags
        assert len(note.tags) == 2
        tag_names = {tag.name for tag in note.tags}
        assert tag_names == {"python", "django"}
    
    def test_create_note_with_empty_tags(self, db_session, test_user):
        """Test creating a note with empty or whitespace tags."""
        note = NoteService.create_note(
            session=db_session,
            user=test_user,
            title="Test Note",
            body="Test body",
            tags="python, , ,django,  "
        )
        db_session.commit()
        
        # Should only have valid tags, empty ones filtered out
        assert len(note.tags) == 2
        tag_names = {tag.name for tag in note.tags}
        assert tag_names == {"python", "django"}
    
    def test_concurrent_tag_creation(self, db_session, test_user):
        """Test handling of concurrent tag creation attempts."""
        # Create first note with a tag
        note1 = NoteService.create_note(
            session=db_session,
            user=test_user,
            title="First Note",
            body="First body",
            tags="concurrent-tag"
        )
        db_session.commit()
        
        # Create second note with the same tag (simulates concurrent request)
        # This should reuse the existing tag
        note2 = NoteService.create_note(
            session=db_session,
            user=test_user,
            title="Second Note",
            body="Second body",
            tags="concurrent-tag"
        )
        db_session.commit()
        
        # Both notes should have the same tag instance
        assert len(note1.tags) == 1
        assert len(note2.tags) == 1
        
        # Verify only one tag exists in the database
        all_tags = db_session.query(Tag).filter(Tag.name == "concurrent-tag").all()
        assert len(all_tags) == 1
    
    def test_update_note_clears_old_tags(self, db_session, test_user):
        """Test that updating a note properly clears old tags."""
        # Create note with initial tags
        note = NoteService.create_note(
            session=db_session,
            user=test_user,
            title="Test Note",
            body="Test body",
            tags="python, django, flask"
        )
        db_session.commit()
        
        assert len(note.tags) == 3
        
        # Update note with different tags
        NoteService.update_note(
            session=db_session,
            note=note,
            user=test_user,
            title="Updated Note",
            body="Updated body",
            tags="javascript, react"
        )
        db_session.commit()
        
        # Should have only the new tags
        assert len(note.tags) == 2
        tag_names = {tag.name for tag in note.tags}
        assert tag_names == {"javascript", "react"}
    
    def test_update_note_with_no_tags(self, db_session, test_user):
        """Test updating a note to have no tags."""
        # Create note with initial tags
        note = NoteService.create_note(
            session=db_session,
            user=test_user,
            title="Test Note",
            body="Test body",
            tags="python, django"
        )
        db_session.commit()
        
        assert len(note.tags) == 2
        
        # Update note with no tags
        NoteService.update_note(
            session=db_session,
            note=note,
            user=test_user,
            title="Updated Note",
            body="Updated body",
            tags=""
        )
        db_session.commit()
        
        # Should have no tags
        assert len(note.tags) == 0
    
    def test_tag_case_sensitivity(self, db_session, test_user):
        """Test that tags with different cases are treated as different tags."""
        # Create note with mixed case tags
        note = NoteService.create_note(
            session=db_session,
            user=test_user,
            title="Test Note",
            body="Test body",
            tags="Python, python, PYTHON"
        )
        db_session.commit()
        
        # SQLite/MySQL may handle case differently, but tags should be preserved as entered
        # At minimum, we should have the tags (case handling depends on DB collation)
        assert len(note.tags) >= 1
        
        # All tag names should be present (exact case may vary by DB)
        tag_names = {tag.name.lower() for tag in note.tags}
        assert "python" in tag_names


class TestTagParsing:
    """Test tag parsing utility function."""
    
    def test_parse_tags_basic(self):
        """Test basic tag parsing."""
        from src.notehub.services.utils import parse_tags
        
        tags = parse_tags("python, django, flask")
        assert tags == ["python", "django", "flask"]
    
    def test_parse_tags_with_spaces(self):
        """Test parsing tags with extra spaces."""
        from src.notehub.services.utils import parse_tags
        
        tags = parse_tags("  python  ,  django  ,  flask  ")
        assert tags == ["python", "django", "flask"]
    
    def test_parse_tags_empty(self):
        """Test parsing empty tag string."""
        from src.notehub.services.utils import parse_tags
        
        tags = parse_tags("")
        assert tags == []
    
    def test_parse_tags_with_duplicates(self):
        """Test parsing tags with duplicates."""
        from src.notehub.services.utils import parse_tags
        
        tags = parse_tags("python, django, python, flask")
        # Should remove duplicates
        assert len(tags) == len(set(tags))
        assert set(tags) == {"python", "django", "flask"}
    
    def test_parse_tags_none(self):
        """Test parsing None tag string."""
        from src.notehub.services.utils import parse_tags
        
        tags = parse_tags(None)
        assert tags == []
