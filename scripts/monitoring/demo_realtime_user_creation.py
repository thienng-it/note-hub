#!/usr/bin/env python
"""
Interactive real-time user creation demonstration.

This script provides a visual demonstration of real-time database updates
by showing the database state before and after creating test users.

Usage:
    python scripts/demo_realtime_user_creation.py
"""

from __future__ import annotations

import sys
import time
from datetime import datetime
from pathlib import Path

# Add src to path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from notehub.config import AppConfig
from notehub.database import init_database, get_session
from notehub.models import User
from sqlalchemy import select


def print_banner(title):
    """Print a decorative banner."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def get_user_count():
    """Get current user count from database."""
    with get_session() as session:
        return session.query(User).count()


def get_all_users():
    """Get all users from database."""
    with get_session() as session:
        users = session.query(User).order_by(User.created_at.desc()).limit(10).all()
        return [(u.id, u.username, u.email, u.created_at, u.last_login) for u in users]


def display_users(title="Current Users"):
    """Display current users in database."""
    users = get_all_users()
    
    print(f"\n📊 {title}")
    print("-" * 80)
    
    if not users:
        print("  No users found in database")
        return
    
    print(f"  {'ID':<6} {'Username':<20} {'Email':<25} {'Created At':<20}")
    print("-" * 80)
    
    for user_id, username, email, created_at, last_login in users:
        email_display = email if email else "Not set"
        created_display = created_at.strftime("%Y-%m-%d %H:%M:%S") if created_at else "N/A"
        print(f"  {user_id:<6} {username:<20} {email_display:<25} {created_display:<20}")
    
    print("-" * 80)
    print(f"  Total users in database: {get_user_count()}")


def create_user_with_feedback(username, password, email=None):
    """Create a user and show real-time feedback."""
    
    print(f"\n🔄 Creating user: {username}")
    print(f"   Password: {'*' * len(password)}")
    if email:
        print(f"   Email: {email}")
    
    with get_session() as session:
        # Check if user exists
        existing = session.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()
        
        if existing:
            print(f"   ⚠️  User '{username}' already exists (ID: {existing.id})")
            return False
        
        try:
            # Create user
            new_user = User(username=username)
            if email:
                new_user.email = email
            new_user.set_password(password)
            
            session.add(new_user)
            session.commit()
            session.refresh(new_user)
            
            print(f"   ✅ User created successfully!")
            print(f"   📝 User ID: {new_user.id}")
            print(f"   ⏰ Created at: {new_user.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"   ⚡ DATABASE UPDATED IN REAL-TIME!")
            
            return True
            
        except ValueError as e:
            print(f"   ❌ Password policy violation: {e}")
            return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False


def run_demo():
    """Run the interactive demonstration."""
    
    print_banner("🎬 Real-Time Database Update Demonstration")
    
    print("\n📌 This demo will show you how user accounts are created")
    print("   and immediately reflected in the database.")
    
    # Initialize database
    config = AppConfig()
    init_database(config.database_uri)
    print(f"\n📁 Database: {config.db_path}")
    
    # Show initial state
    print_banner("STEP 1: Initial Database State")
    initial_count = get_user_count()
    display_users("Users Before Creation")
    
    # Create test users
    print_banner("STEP 2: Creating Test Users")
    
    test_users = [
        ("testuser1", "SecurePass123!@#", "test1@example.com"),
        ("testuser2", "AnotherSecure456!@#", "test2@example.com"),
        ("testuser3", "StrongPassword789!@#", "test3@example.com"),
    ]
    
    created_count = 0
    for username, password, email in test_users:
        if create_user_with_feedback(username, password, email):
            created_count += 1
        time.sleep(0.5)  # Small delay for visual effect
    
    # Show final state
    print_banner("STEP 3: Updated Database State")
    final_count = get_user_count()
    display_users("Users After Creation")
    
    # Summary
    print_banner("📈 Summary")
    print(f"\n  Initial user count:  {initial_count}")
    print(f"  Users created:       {created_count}")
    print(f"  Final user count:    {final_count}")
    print(f"  Database delta:      +{final_count - initial_count}")
    
    print("\n  ✅ All database updates happened in REAL-TIME!")
    print("  ⚡ Each user was immediately visible after commit()")
    
    print_banner("🎉 Demo Complete!")
    
    print("\n💡 Try these commands to explore further:")
    print("   • python scripts/check_users.py - View all users")
    print("   • python scripts/monitor_db_realtime.py - Watch for new users")
    print("   • python scripts/test_create_user.py <username> <password> - Create a user")
    print()


def main():
    """Main entry point."""
    try:
        run_demo()
    except KeyboardInterrupt:
        print("\n\n⏸️  Demo interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
