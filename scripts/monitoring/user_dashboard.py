#!/usr/bin/env python
"""
User account dashboard - View statistics and recent activity.

Shows comprehensive information about user accounts including:
- Total user count
- Recent registrations
- Login activity
- 2FA adoption
- Account age distribution

Usage:
    python scripts/user_dashboard.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from collections import Counter

# Add src to path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from notehub.config import AppConfig
from notehub.database import init_database, get_session
from notehub.models import User, Note
from sqlalchemy import func


def print_section(title):
    """Print a section header."""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}")


def get_user_stats():
    """Get comprehensive user statistics."""
    with get_session() as session:
        total_users = session.query(User).count()
        users_with_2fa = session.query(User).filter(User.totp_secret.isnot(None)).count()
        users_with_email = session.query(User).filter(User.email.isnot(None)).count()
        users_logged_in = session.query(User).filter(User.last_login.isnot(None)).count()
        
        return {
            'total': total_users,
            'with_2fa': users_with_2fa,
            'with_email': users_with_email,
            'logged_in': users_logged_in,
        }


def get_recent_users(limit=10):
    """Get most recently created users."""
    with get_session() as session:
        users = session.query(User).order_by(User.created_at.desc()).limit(limit).all()
        return [(u.id, u.username, u.email, u.created_at, u.last_login, u.totp_secret) 
                for u in users]


def get_active_users(days=7, limit=10):
    """Get users who logged in recently."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    with get_session() as session:
        users = (session.query(User)
                .filter(User.last_login >= cutoff)
                .order_by(User.last_login.desc())
                .limit(limit)
                .all())
        
        return [(u.id, u.username, u.last_login) for u in users]


def get_user_growth():
    """Get user registration timeline."""
    with get_session() as session:
        users = session.query(User.created_at).all()
        
        if not users:
            return {}
        
        now = datetime.now(timezone.utc)
        today = 0
        this_week = 0
        this_month = 0
        
        for (created_at,) in users:
            if not created_at:
                continue
                
            # Make created_at timezone-aware if it isn't
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            
            age = now - created_at
            
            if age.days == 0:
                today += 1
            if age.days < 7:
                this_week += 1
            if age.days < 30:
                this_month += 1
        
        return {
            'today': today,
            'this_week': this_week,
            'this_month': this_month,
        }


def display_overview():
    """Display overview statistics."""
    print_section("📊 User Account Overview")
    
    stats = get_user_stats()
    growth = get_user_growth()
    
    print(f"\n  Total Users:              {stats['total']}")
    print(f"  Users with Email:         {stats['with_email']} ({stats['with_email']/max(stats['total'],1)*100:.1f}%)")
    print(f"  Users with 2FA Enabled:   {stats['with_2fa']} ({stats['with_2fa']/max(stats['total'],1)*100:.1f}%)")
    print(f"  Users Ever Logged In:     {stats['logged_in']} ({stats['logged_in']/max(stats['total'],1)*100:.1f}%)")
    
    if growth:
        print(f"\n  📈 Growth Metrics:")
        print(f"     Registered Today:      {growth['today']}")
        print(f"     This Week:             {growth['this_week']}")
        print(f"     This Month:            {growth['this_month']}")


def display_recent_users():
    """Display recently registered users."""
    print_section("👥 Recent Registrations")
    
    users = get_recent_users(10)
    
    if not users:
        print("\n  No users found")
        return
    
    print(f"\n  {'ID':<6} {'Username':<20} {'Email':<25} {'Created':<20} {'2FA':<6}")
    print(f"  {'-'*80}")
    
    for user_id, username, email, created_at, last_login, totp_secret in users:
        email_display = (email[:22] + "...") if email and len(email) > 25 else (email or "—")
        created_display = created_at.strftime("%Y-%m-%d %H:%M:%S") if created_at else "—"
        tfa_display = "Yes" if totp_secret else "No"
        
        print(f"  {user_id:<6} {username:<20} {email_display:<25} {created_display:<20} {tfa_display:<6}")


def display_active_users():
    """Display recently active users."""
    print_section("⚡ Recent Activity (Last 7 Days)")
    
    users = get_active_users(days=7, limit=10)
    
    if not users:
        print("\n  No recent activity")
        return
    
    print(f"\n  {'ID':<6} {'Username':<20} {'Last Login':<20} {'Time Ago':<20}")
    print(f"  {'-'*80}")
    
    now = datetime.now(timezone.utc)
    
    for user_id, username, last_login in users:
        login_display = last_login.strftime("%Y-%m-%d %H:%M:%S") if last_login else "—"
        
        if last_login:
            # Make last_login timezone-aware if needed
            if last_login.tzinfo is None:
                last_login = last_login.replace(tzinfo=timezone.utc)
            
            delta = now - last_login
            
            if delta.days > 0:
                ago = f"{delta.days}d ago"
            elif delta.seconds >= 3600:
                ago = f"{delta.seconds // 3600}h ago"
            elif delta.seconds >= 60:
                ago = f"{delta.seconds // 60}m ago"
            else:
                ago = "just now"
        else:
            ago = "—"
        
        print(f"  {user_id:<6} {username:<20} {login_display:<20} {ago:<20}")


def display_security_status():
    """Display security-related statistics."""
    print_section("🔒 Security Status")
    
    stats = get_user_stats()
    
    print(f"\n  2FA Adoption Rate:        {stats['with_2fa']}/{stats['total']} users ({stats['with_2fa']/max(stats['total'],1)*100:.1f}%)")
    
    if stats['with_2fa'] < stats['total']:
        print(f"  ⚠️  {stats['total'] - stats['with_2fa']} users without 2FA protection")
    else:
        print(f"  ✅ All users have 2FA enabled!")
    
    if stats['with_email'] < stats['total']:
        print(f"  ⚠️  {stats['total'] - stats['with_email']} users without email (can't reset password)")


def main():
    """Main entry point."""
    
    # Initialize database
    config = AppConfig()
    init_database(config.database_uri)
    
    print("=" * 80)
    print("  🎯 User Account Dashboard")
    print("=" * 80)
    print(f"\n  Database: {config.db_path}")
    print(f"  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    display_overview()
    display_recent_users()
    display_active_users()
    display_security_status()
    
    print("\n" + "=" * 80)
    print("  💡 Run 'python scripts/monitor_db_realtime.py' to watch for new users")
    print("=" * 80)
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
