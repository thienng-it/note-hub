"""Unit tests for service layer."""

import pytest
from datetime import datetime, timezone

from src.notehub.models import Note, Task, User, Tag
from src.notehub.services.auth_service import AuthService
from src.notehub.services.note_service import NoteService
from src.notehub.services.task_service import TaskService


class TestAuthService:
    """Test authentication service."""
    
    def test_authenticate_user_success(self, db_session, test_user):
        """Test successful authentication."""
        user = AuthService.authenticate_user(db_session, 'testuser', 'TestPassword123!@#')
        assert user is not None
        assert user.username == 'testuser'
    
    def test_authenticate_user_wrong_password(self, db_session, test_user):
        """Test authentication with wrong password."""
        user = AuthService.authenticate_user(db_session, 'testuser', 'wrongpassword')
        assert user is None
    
    def test_authenticate_user_nonexistent(self, db_session):
        """Test authentication with non-existent user."""
        user = AuthService.authenticate_user(db_session, 'nonexistent', 'password')
        assert user is None
    
    def test_register_user_success(self, db_session):
        """Test successful user registration."""
        success, message, user = AuthService.register_user(
            db_session,
            'newuser',
            'NewPassword123!@#'
        )
        assert success is True
        assert user is not None
        assert user.username == 'newuser'
        assert 'success' in message.lower() or 'created' in message.lower()
    
    def test_register_user_duplicate(self, db_session, test_user):
        """Test registration with duplicate username."""
        success, message, user = AuthService.register_user(
            db_session,
            'testuser',
            'Password123!@#'
        )
        assert success is False
        assert user is None
        assert 'exists' in message.lower() or 'already' in message.lower()
    
    def test_register_user_weak_password(self, db_session):
        """Test registration with weak password."""
        success, message, user = AuthService.register_user(
            db_session,
            'newuser2',
            'weak'
        )
        assert success is False
        assert user is None
        assert 'password' in message.lower()
    
    def test_update_last_login(self, db_session, test_user):
        """Test updating last login timestamp."""
        old_login = test_user.last_login
        AuthService.update_last_login(db_session, test_user)
        assert test_user.last_login is not None
        assert test_user.last_login != old_login


class TestNoteService:
    """Test note service."""
    
    def test_create_note(self, db_session, test_user):
        """Test creating a note."""
        note = NoteService.create_note(
            db_session,
            test_user,
            'Test Note',
            'Test body',
            'tag1,tag2'
        )
        assert note.title == 'Test Note'
        assert note.body == 'Test body'
        assert note.owner_id == test_user.id
        assert len(note.tags) == 2
    
    def test_check_note_access_owner(self, db_session, test_user):
        """Test access check for note owner."""
        note = Note(title='Test', body='Body', owner_id=test_user.id)
        db_session.add(note)
        db_session.commit()
        
        result_note, has_access, can_edit = NoteService.check_note_access(
            db_session, note.id, test_user
        )
        assert result_note is not None
        assert has_access is True
        assert can_edit is True
    
    def test_check_note_access_nonexistent(self, db_session, test_user):
        """Test access check for non-existent note."""
        result_note, has_access, can_edit = NoteService.check_note_access(
            db_session, 9999, test_user
        )
        assert result_note is None
        assert has_access is False
        assert can_edit is False
    
    def test_update_note(self, db_session, test_user):
        """Test updating a note."""
        note = Note(title='Original', body='Original body', owner_id=test_user.id)
        db_session.add(note)
        db_session.commit()
        
        updated = NoteService.update_note(
            db_session,
            note,
            test_user,
            'Updated Title',
            'Updated body',
            'newtag'
        )
        assert updated.title == 'Updated Title'
        assert updated.body == 'Updated body'
        assert len(updated.tags) == 1


class TestTaskService:
    """Test task service."""
    
    def test_create_task(self, db_session, test_user):
        """Test creating a task."""
        task = TaskService.create_task(
            db_session,
            test_user,
            'Test Task',
            'Test description',
            priority='high'
        )
        db_session.commit()  # Ensure defaults are applied
        assert task.title == 'Test Task'
        assert task.description == 'Test description'
        assert task.priority == 'high'
        assert task.owner_id == test_user.id
        assert task.completed is False  # Default value from model
    
    def test_get_tasks_for_user(self, db_session, test_user):
        """Test getting tasks for a user."""
        # Create test tasks
        task1 = Task(title='Task 1', owner_id=test_user.id, completed=False)
        task2 = Task(title='Task 2', owner_id=test_user.id, completed=True)
        db_session.add_all([task1, task2])
        db_session.commit()
        
        # Get all tasks
        all_tasks = TaskService.get_tasks_for_user(db_session, test_user, 'all')
        assert len(all_tasks) == 2
        
        # Get active tasks
        active_tasks = TaskService.get_tasks_for_user(db_session, test_user, 'active')
        assert len(active_tasks) == 1
        assert active_tasks[0].title == 'Task 1'
        
        # Get completed tasks
        completed_tasks = TaskService.get_tasks_for_user(db_session, test_user, 'completed')
        assert len(completed_tasks) == 1
        assert completed_tasks[0].title == 'Task 2'
    
    def test_get_task_counts(self, db_session, test_user):
        """Test getting task counts."""
        # Create test tasks
        task1 = Task(title='Task 1', owner_id=test_user.id, completed=False)
        task2 = Task(title='Task 2', owner_id=test_user.id, completed=True)
        task3 = Task(title='Task 3', owner_id=test_user.id, completed=False)
        db_session.add_all([task1, task2, task3])
        db_session.commit()
        
        counts = TaskService.get_task_counts(db_session, test_user)
        assert counts['total'] == 3
        assert counts['completed'] == 1
        assert counts['active'] == 2
    
    def test_toggle_task_completion(self, db_session, test_user):
        """Test toggling task completion."""
        task = Task(title='Test Task', owner_id=test_user.id, completed=False)
        db_session.add(task)
        db_session.commit()
        
        updated_task, status = TaskService.toggle_task_completion(db_session, task)
        assert updated_task.completed is True
        assert 'completed' in status
        
        updated_task, status = TaskService.toggle_task_completion(db_session, task)
        assert updated_task.completed is False
        assert 'active' in status
    
    def test_check_task_access(self, db_session, test_user):
        """Test task access checking."""
        task = Task(title='Test Task', owner_id=test_user.id)
        db_session.add(task)
        db_session.commit()
        
        # Owner should have access
        accessed_task = TaskService.check_task_access(db_session, task.id, test_user)
        assert accessed_task is not None
        
        # Create another user
        other_user = User(username='otheruser')
        other_user.set_password('OtherPass123!@#')
        db_session.add(other_user)
        db_session.commit()
        
        # Other user should not have access
        accessed_task = TaskService.check_task_access(db_session, task.id, other_user)
        assert accessed_task is None
