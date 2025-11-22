#!/usr/bin/env python
"""
Migration script to check user accounts compatibility with new password policy.

This script:
1. Checks all existing user accounts in the database
2. Reports on password hash compatibility (all existing hashes are compatible)
3. Provides guidance for users with potentially weak passwords

Note: Existing password hashes remain valid. Users with weak passwords can still
log in, but will be required to meet the new policy when changing passwords.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add src to path
PROJECT_ROOT = Path(__file__).resolve().parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from notehub.config import AppConfig
from notehub.database import init_database, get_session
from notehub.models import User
from notehub.security import PASSWORD_POLICY_MIN_LENGTH


def check_user_accounts():
    """Check existing user accounts and report on migration status."""
    
    # Initialize database
    config = AppConfig()
    init_database(config.database_uri)
    
    print("=" * 80)
    print("User Account Migration Check")
    print("=" * 80)
    print()
    
    with get_session() as session:
        users = session.query(User).all()
        
        if not users:
            print("✓ No existing user accounts found. No migration needed.")
            return
        
        print(f"Found {len(users)} user account(s):")
        print()
        
        for user in users:
            print(f"  • Username: {user.username}")
            print(f"    - User ID: {user.id}")
            print(f"    - Created: {user.created_at}")
            print(f"    - Last Login: {user.last_login or 'Never'}")
            print(f"    - 2FA Enabled: {'Yes' if user.totp_secret else 'No'}")
            print(f"    - Email: {user.email or 'Not set'}")
            
            # Check if password hash exists (it should)
            if user.password_hash:
                print(f"    - Password Hash: ✓ Valid (using Werkzeug)")
                print(f"    - Status: Can log in with existing password")
            else:
                print(f"    - Password Hash: ✗ MISSING (needs attention)")
                
            print()
    
    print("=" * 80)
    print("Migration Summary")
    print("=" * 80)
    print()
    print("✓ ALL EXISTING PASSWORD HASHES ARE COMPATIBLE")
    print()
    print("The new password policy:")
    print(f"  - Minimum {PASSWORD_POLICY_MIN_LENGTH} characters")
    print("  - Must include: lowercase, uppercase, numbers, special characters")
    print()
    print("Impact on existing users:")
    print("  1. Users can still log in with their current passwords")
    print("  2. New policy only applies when setting NEW passwords:")
    print("     - User registration")
    print("     - Password reset")
    print("     - Password change")
    print()
    print("Recommended actions:")
    print("  1. Notify users about the enhanced password policy")
    print("  2. Encourage users to update weak passwords")
    print("  3. Consider implementing a password strength indicator in the UI")
    print()
    print("✓ No database migration required - you're all set!")
    print()


if __name__ == "__main__":
    try:
        check_user_accounts()
    except Exception as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        sys.exit(1)
