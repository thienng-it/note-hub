#!/usr/bin/env python
"""
Real-time database monitor for user account creation.

This script watches the database for new user accounts and displays
them as they're created. Useful for verifying that registration 
updates the database correctly.

Usage:
    python scripts/monitor_db_realtime.py
    
Then in another terminal/browser, create a new account and watch
the output here.
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


def format_datetime(dt):
    """Format datetime for display."""
    if dt is None:
        return "Never"
    if hasattr(dt, 'strftime'):
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    return str(dt)


def get_all_users():
    """Fetch all users from the database."""
    with get_session() as session:
        users = session.query(User).order_by(User.id).all()
        # Detach from session to avoid lazy loading issues
        return [(u.id, u.username, u.email, u.created_at, u.last_login, u.totp_secret) 
                for u in users]


def display_user(user_data, is_new=False):
    """Display user information."""
    user_id, username, email, created_at, last_login, totp_secret = user_data
    
    prefix = "🆕 NEW USER" if is_new else "   User"
    print(f"\n{prefix} DETECTED:")
    print(f"  {'='*60}")
    print(f"  ID:         {user_id}")
    print(f"  Username:   {username}")
    print(f"  Email:      {email or 'Not set'}")
    print(f"  Created:    {format_datetime(created_at)}")
    print(f"  Last Login: {format_datetime(last_login)}")
    print(f"  2FA:        {'Enabled' if totp_secret else 'Disabled'}")
    print(f"  {'='*60}")


def monitor_database(interval=2):
    """Monitor the database for new user accounts."""
    
    print("=" * 70)
    print("Real-Time Database Monitor - User Accounts")
    print("=" * 70)
    print(f"\nDatabase: {AppConfig().db_path}")
    print(f"Checking every {interval} seconds...")
    print("\nPress Ctrl+C to stop monitoring\n")
    
    # Initialize database
    init_database(AppConfig().database_uri)
    
    # Get initial user list
    known_users = set()
    try:
        initial_users = get_all_users()
        for user_data in initial_users:
            known_users.add(user_data[0])  # Add user ID
        
        print(f"Initial state: {len(known_users)} user(s) in database")
        if initial_users:
            print("\nExisting users:")
            for user_data in initial_users:
                display_user(user_data, is_new=False)
    except Exception as e:
        print(f"Error reading initial state: {e}")
        return
    
    print("\n" + "=" * 70)
    print("👀 Monitoring for new accounts... (create an account now!)")
    print("=" * 70)
    
    check_count = 0
    try:
        while True:
            time.sleep(interval)
            check_count += 1
            
            try:
                current_users = get_all_users()
                current_ids = {u[0] for u in current_users}
                
                # Find new users
                new_user_ids = current_ids - known_users
                
                if new_user_ids:
                    for user_data in current_users:
                        if user_data[0] in new_user_ids:
                            print(f"\n⚡ [Check #{check_count}] {datetime.now().strftime('%H:%M:%S')}")
                            display_user(user_data, is_new=True)
                            print("\n✅ DATABASE UPDATED IN REAL-TIME!")
                            known_users.add(user_data[0])
                else:
                    # Show periodic heartbeat
                    if check_count % 10 == 0:
                        print(f"  [{datetime.now().strftime('%H:%M:%S')}] Still monitoring... (check #{check_count})")
                        
            except Exception as e:
                print(f"\n❌ Error checking database: {e}")
                
    except KeyboardInterrupt:
        print("\n\n" + "=" * 70)
        print("Monitoring stopped by user")
        print("=" * 70)
        
        # Show final count
        final_users = get_all_users()
        print(f"\nFinal count: {len(final_users)} user(s) in database")
        print(f"Total checks performed: {check_count}")


if __name__ == "__main__":
    try:
        monitor_database(interval=2)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
