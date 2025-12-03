#!/usr/bin/env python
"""
Test script to create a test user account directly in the database.

This simulates what happens when someone registers via the web interface.
Use this to test database monitoring without starting the web app.

Usage:
    python scripts/test_create_user.py testuser "TestPassword123!"
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add src to path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from notehub.config import AppConfig
from notehub.database import init_database, get_session
from notehub.models import User
from sqlalchemy import select


def create_test_user(username, password):
    """Create a test user account."""
    
    config = AppConfig()
    init_database(config.database_uri)
    
    print("=" * 70)
    print("Test User Creation")
    print("=" * 70)
    print()
    
    with get_session() as session:
        # Check if user already exists
        existing = session.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()
        
        if existing:
            print(f"❌ User '{username}' already exists!")
            print(f"   User ID: {existing.id}")
            print(f"   Created: {existing.created_at}")
            return False
        
        # Create new user
        print(f"Creating user: {username}")
        print(f"Password: {password}")
        print()
        
        try:
            new_user = User(username=username)
            new_user.set_password(password)  # This enforces password policy
            
            session.add(new_user)
            session.commit()
            
            # Refresh to get the ID
            session.refresh(new_user)
            
            print("✅ User created successfully!")
            print()
            print(f"User Details:")
            print(f"  ID:         {new_user.id}")
            print(f"  Username:   {new_user.username}")
            print(f"  Created:    {new_user.created_at}")
            print(f"  Password:   {new_user.password_hash[:30]}... (hashed)")
            print()
            print("✅ DATABASE UPDATED IN REAL-TIME!")
            
            return True
            
        except ValueError as e:
            print(f"❌ Password policy violation: {e}")
            return False
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            return False


def main():
    """Main entry point."""
    
    if len(sys.argv) < 3:
        print("Usage: python scripts/test_create_user.py <username> <password>")
        print()
        print("Example:")
        print('  python scripts/test_create_user.py testuser "TestPassword123!"')
        print()
        print("Note: Password must meet policy requirements:")
        print("  - At least 12 characters")
        print("  - Lowercase, uppercase, numbers, special characters")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    success = create_test_user(username, password)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
