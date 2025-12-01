#!/usr/bin/env python3
"""
Database seed script for NoteHub.
Creates sample users, notes, and tasks for testing.
"""

import os
import sys

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import random


def seed_database():
    """Seed the database with sample data."""
    from src.notehub import create_app, db
    from src.notehub.models import User, Note, Tag, Task

    app = create_app()

    with app.app_context():
        print("🌱 Starting database seeding...")

        # Create tables if they don't exist
        db.create_all()

        # Check if admin user already exists
        admin = User.query.filter_by(username='admin').first()
        if admin:
            print("⚠️  Admin user already exists. Skipping user creation.")
        else:
            # Create admin user
            admin_password = os.environ.get('NOTES_ADMIN_PASSWORD', 'admin123456789')
            admin = User(
                username='admin',
                email='admin@notehub.local',
                password=generate_password_hash(admin_password)
            )
            db.session.add(admin)
            print(f"✅ Created admin user (password: {admin_password})")

        # Create demo user
        demo = User.query.filter_by(username='demo').first()
        if demo:
            print("⚠️  Demo user already exists.")
        else:
            demo = User(
                username='demo',
                email='demo@notehub.local',
                password=generate_password_hash('demo123456789')
            )
            db.session.add(demo)
            print("✅ Created demo user (password: demo123456789)")

        db.session.commit()

        # Get the admin user for notes/tasks
        admin = User.query.filter_by(username='admin').first()

        # Create sample tags
        tag_names = ['Work', 'Personal', 'Ideas', 'Important', 'Todo', 'Reference']
        tags = {}
        for tag_name in tag_names:
            existing_tag = Tag.query.filter_by(name=tag_name, user_id=admin.id).first()
            if existing_tag:
                tags[tag_name] = existing_tag
            else:
                tag = Tag(name=tag_name, user_id=admin.id)
                db.session.add(tag)
                tags[tag_name] = tag
        
        db.session.commit()
        print(f"✅ Created {len(tag_names)} tags")

        # Sample notes data
        sample_notes = [
            {
                'title': 'Welcome to NoteHub! 🎉',
                'content': '''# Welcome to NoteHub!

This is your personal note-taking application. Here are some features you can explore:

## Features
- 📝 **Rich Markdown Support** - Write notes with full Markdown formatting
- 🏷️ **Tags** - Organize your notes with custom tags
- ⭐ **Favorites** - Mark important notes as favorites
- 📌 **Pin Notes** - Keep important notes at the top
- 🗂️ **Archive** - Archive old notes without deleting them
- 🔍 **Search** - Quickly find notes by title or content
- 📱 **Mobile Friendly** - Works great on all devices

## Getting Started
1. Click "New Note" to create your first note
2. Use Markdown for formatting
3. Add tags to organize your notes
4. Star your favorite notes

Enjoy using NoteHub!''',
                'tags': ['Important', 'Reference'],
                'pinned': True,
                'favorite': True,
            },
            {
                'title': 'Meeting Notes - Project Kickoff',
                'content': '''# Project Kickoff Meeting

**Date:** Today
**Attendees:** Team Alpha

## Agenda
1. Project overview
2. Timeline discussion
3. Resource allocation
4. Next steps

## Key Decisions
- Sprint duration: 2 weeks
- Daily standups at 9 AM
- Code reviews required for all PRs

## Action Items
- [ ] Set up project repository
- [ ] Create initial backlog
- [ ] Schedule sprint planning''',
                'tags': ['Work', 'Important'],
                'pinned': False,
                'favorite': True,
            },
            {
                'title': 'Book Recommendations 📚',
                'content': '''# Books to Read

## Currently Reading
- "Clean Code" by Robert C. Martin

## Up Next
1. "The Pragmatic Programmer"
2. "Design Patterns"
3. "Refactoring"

## Completed
- ✅ "JavaScript: The Good Parts"
- ✅ "You Don't Know JS"''',
                'tags': ['Personal', 'Reference'],
                'pinned': False,
                'favorite': False,
            },
            {
                'title': 'API Design Notes',
                'content': '''# REST API Design Best Practices

## Naming Conventions
- Use nouns for resources: `/users`, `/notes`
- Use plural forms
- Use hyphens for multi-word paths

## HTTP Methods
| Method | Usage |
|--------|-------|
| GET | Retrieve resources |
| POST | Create resources |
| PUT | Update resources |
| DELETE | Remove resources |

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error''',
                'tags': ['Work', 'Reference'],
                'pinned': False,
                'favorite': False,
            },
            {
                'title': 'Weekend Plans',
                'content': '''# Weekend Todo

## Saturday
- [ ] Morning run
- [ ] Grocery shopping
- [ ] Call mom

## Sunday
- [ ] Meal prep
- [ ] Read book
- [ ] Movie night

## Notes
Don't forget to water the plants!''',
                'tags': ['Personal', 'Todo'],
                'pinned': False,
                'favorite': False,
            },
            {
                'title': 'Code Snippets Collection',
                'content': '''# Useful Code Snippets

## Python - Read JSON File
```python
import json

with open('data.json') as f:
    data = json.load(f)
```

## JavaScript - Fetch API
```javascript
const response = await fetch('/api/data');
const data = await response.json();
```

## SQL - Common Queries
```sql
SELECT * FROM users WHERE active = true;
```''',
                'tags': ['Work', 'Reference'],
                'pinned': False,
                'favorite': True,
            },
        ]

        # Create notes
        notes_created = 0
        for note_data in sample_notes:
            existing_note = Note.query.filter_by(
                title=note_data['title'],
                user_id=admin.id
            ).first()
            
            if not existing_note:
                note = Note(
                    title=note_data['title'],
                    content=note_data['content'],
                    user_id=admin.id,
                    pinned=note_data['pinned'],
                    favorite=note_data['favorite'],
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
                )
                
                # Add tags
                for tag_name in note_data['tags']:
                    if tag_name in tags:
                        note.tags.append(tags[tag_name])
                
                db.session.add(note)
                notes_created += 1

        db.session.commit()
        print(f"✅ Created {notes_created} sample notes")

        # Sample tasks
        sample_tasks = [
            {'title': 'Review pull requests', 'description': 'Check pending PRs on GitHub', 'priority': 'high', 'completed': False},
            {'title': 'Update documentation', 'description': 'Add API docs for new endpoints', 'priority': 'medium', 'completed': False},
            {'title': 'Fix login bug', 'description': 'Users report intermittent login issues', 'priority': 'high', 'completed': True},
            {'title': 'Setup CI/CD', 'description': 'Configure GitHub Actions for automated testing', 'priority': 'medium', 'completed': True},
            {'title': 'Design review meeting', 'description': 'Discuss new UI mockups with team', 'priority': 'low', 'completed': False},
            {'title': 'Database optimization', 'description': 'Add indexes to improve query performance', 'priority': 'medium', 'completed': False},
            {'title': 'Security audit', 'description': 'Review authentication and authorization', 'priority': 'high', 'completed': False},
            {'title': 'Write unit tests', 'description': 'Increase code coverage to 80%', 'priority': 'medium', 'completed': False},
        ]

        # Create tasks
        tasks_created = 0
        for task_data in sample_tasks:
            existing_task = Task.query.filter_by(
                title=task_data['title'],
                user_id=admin.id
            ).first()
            
            if not existing_task:
                due_date = datetime.utcnow() + timedelta(days=random.randint(1, 14))
                task = Task(
                    title=task_data['title'],
                    description=task_data['description'],
                    priority=task_data['priority'],
                    completed=task_data['completed'],
                    due_date=due_date if not task_data['completed'] else None,
                    user_id=admin.id,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 7))
                )
                db.session.add(task)
                tasks_created += 1

        db.session.commit()
        print(f"✅ Created {tasks_created} sample tasks")

        print("\n🎉 Database seeding completed successfully!")
        print("\n📋 Login credentials:")
        print(f"   Admin: admin / {os.environ.get('NOTES_ADMIN_PASSWORD', 'admin123456789')}")
        print("   Demo:  demo / demo123456789")


if __name__ == '__main__':
    seed_database()
