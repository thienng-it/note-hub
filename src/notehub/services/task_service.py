"""Business logic for task operations."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..models import Task, User


class TaskService:
    """Service class for task business logic."""
    
    @staticmethod
    def _convert_to_datetime(date_value: Optional[datetime]) -> Optional[datetime]:
        """Convert date to datetime with timezone if needed.
        
        Args:
            date_value: Date or datetime value
            
        Returns:
            Datetime with timezone or None
        """
        if not date_value:
            return None
        if not isinstance(date_value, datetime):
            return datetime.combine(date_value, datetime.min.time()).replace(tzinfo=timezone.utc)
        return date_value
    
    @staticmethod
    def get_tasks_for_user(
        session: Session,
        user: User,
        filter_type: str = 'all'
    ) -> List[Task]:
        """Get tasks for a user with filtering.
        
        Args:
            session: Database session
            user: Current user
            filter_type: Type of filter ('all', 'active', 'completed')
            
        Returns:
            List of filtered tasks
        """
        stmt = select(Task).where(Task.owner_id == user.id)
        
        if filter_type == 'active':
            stmt = stmt.where(Task.completed == False)
        elif filter_type == 'completed':
            stmt = stmt.where(Task.completed == True)
        
        # Order by completion status, priority, due date, and creation date
        priority_order = case(
            (Task.priority == 'high', 1),
            (Task.priority == 'medium', 2),
            (Task.priority == 'low', 3),
            else_=2
        )
        
        stmt = stmt.order_by(
            Task.completed.asc(),
            priority_order,
            Task.due_date.asc().nullslast(),
            Task.created_at.desc()
        )
        
        return session.execute(stmt).scalars().all()
    
    @staticmethod
    def get_task_counts(session: Session, user: User) -> dict:
        """Get task counts for a user.
        
        Args:
            session: Database session
            user: Current user
            
        Returns:
            Dictionary with total, completed, and active counts
        """
        total_tasks = session.execute(
            select(func.count(Task.id)).where(Task.owner_id == user.id)
        ).scalar() or 0
        
        completed_tasks = session.execute(
            select(func.count(Task.id)).where(
                Task.owner_id == user.id,
                Task.completed == True
            )
        ).scalar() or 0
        
        return {
            'total': total_tasks,
            'completed': completed_tasks,
            'active': total_tasks - completed_tasks
        }
    
    @staticmethod
    def create_task(
        session: Session,
        user: User,
        title: str,
        description: Optional[str] = None,
        due_date: Optional[datetime] = None,
        priority: str = 'medium'
    ) -> Task:
        """Create a new task.
        
        Args:
            session: Database session
            user: Owner of the task
            title: Task title
            description: Task description
            due_date: Due date (date only, will be converted to datetime)
            priority: Priority ('low', 'medium', 'high')
            
        Returns:
            Created task
        """
        task = Task(
            title=title.strip(),
            description=description or None,
            due_date=TaskService._convert_to_datetime(due_date),
            priority=priority,
            owner_id=user.id
        )
        
        session.add(task)
        return task
    
    @staticmethod
    def update_task(
        session: Session,
        task: Task,
        title: str,
        description: Optional[str] = None,
        due_date: Optional[datetime] = None,
        priority: str = 'medium'
    ) -> Task:
        """Update an existing task.
        
        Args:
            session: Database session
            task: Task to update
            title: New title
            description: New description
            due_date: New due date
            priority: New priority
            
        Returns:
            Updated task
        """
        task.title = title.strip()
        task.description = description or None
        task.due_date = TaskService._convert_to_datetime(due_date)
        task.priority = priority
        
        return task
    
    @staticmethod
    def toggle_task_completion(session: Session, task: Task) -> Tuple[Task, str]:
        """Toggle the completion status of a task.
        
        Args:
            session: Database session
            task: Task to toggle
            
        Returns:
            Tuple of (task, status_message)
        """
        task.completed = not task.completed
        status = "completed" if task.completed else "marked as active"
        return task, status
    
    @staticmethod
    def check_task_access(
        session: Session,
        task_id: int,
        user: User
    ) -> Optional[Task]:
        """Check if user has access to a task.
        
        Args:
            session: Database session
            task_id: ID of the task
            user: Current user
            
        Returns:
            Task if user has access, None otherwise
        """
        task = session.get(Task, task_id)
        
        if not task or task.owner_id != user.id:
            return None
        
        return task
