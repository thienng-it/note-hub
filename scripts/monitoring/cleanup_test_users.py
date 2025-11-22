#!/usr/bin/env python
"""
Clean up test users from the database.

This script helps remove test users created during development/testing.

Usage:
    python scripts/cleanup_test_users.py           # Interactive mode
    python scripts/cleanup_test_users.py --all     # Remove all test users
    python scripts/cleanup_test_users.py --pattern "test*"  # Remove by pattern
"""

from __future__ import annotations

import sys
import argparse
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


def list_test_users(pattern="test%"):
    """List users matching the test pattern."""
    with get_session() as session:
        users = session.query(User).filter(User.username.like(pattern)).all()
        return [(u.id, u.username, u.email, u.created_at) for u in users]


def delete_users(user_ids):
    """Delete users by their IDs."""
    with get_session() as session:
        deleted = 0
        for user_id in user_ids:
            user = session.get(User, user_id)
            if user:
                username = user.username
                session.delete(user)
                deleted += 1
                print(f"  ✅ Deleted: {username} (ID: {user_id})")
            else:
                print(f"  ⚠️  User ID {user_id} not found")
        
        session.commit()
        return deleted


def confirm_deletion(users):
    """Ask user to confirm deletion."""
    if not users:
        return False
    
    print("\n📋 Users to be deleted:")
    print("-" * 70)
    for user_id, username, email, created_at in users:
        email_display = email if email else "No email"
        created_display = created_at.strftime("%Y-%m-%d %H:%M:%S") if created_at else "Unknown"
        print(f"  [{user_id}] {username:20} | {email_display:25} | {created_display}")
    print("-" * 70)
    print(f"  Total: {len(users)} user(s)")
    
    response = input("\n⚠️  Confirm deletion? (yes/no): ").strip().lower()
    return response in ('yes', 'y')


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Clean up test users from the database"
    )
    parser.add_argument(
        "--pattern",
        default="test%",
        help="SQL LIKE pattern to match usernames (default: test%%)"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Delete all matching users without confirmation"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting"
    )
    
    args = parser.parse_args()
    
    # Initialize database
    config = AppConfig()
    init_database(config.database_uri)
    
    print("=" * 70)
    print("  🧹 Test User Cleanup")
    print("=" * 70)
    print(f"\n  Database: {config.db_path}")
    print(f"  Pattern:  {args.pattern}")
    
    # Find matching users
    test_users = list_test_users(args.pattern)
    
    if not test_users:
        print(f"\n  ℹ️  No users found matching pattern '{args.pattern}'")
        return 0
    
    # Show users
    print(f"\n  Found {len(test_users)} user(s) matching '{args.pattern}':")
    for user_id, username, email, created_at in test_users:
        created_display = created_at.strftime("%Y-%m-%d %H:%M") if created_at else "Unknown"
        print(f"    • {username} (ID: {user_id}) - Created: {created_display}")
    
    # Dry run mode
    if args.dry_run:
        print("\n  🔍 Dry run mode - no users will be deleted")
        return 0
    
    # Confirm deletion
    if args.all:
        confirmed = True
    else:
        confirmed = confirm_deletion(test_users)
    
    if not confirmed:
        print("\n  ❌ Deletion cancelled")
        return 1
    
    # Delete users
    print("\n  🗑️  Deleting users...")
    user_ids = [u[0] for u in test_users]
    deleted = delete_users(user_ids)
    
    print(f"\n  ✅ Successfully deleted {deleted} user(s)")
    print("=" * 70)
    
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n  ⏸️  Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
