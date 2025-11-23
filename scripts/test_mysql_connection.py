#!/usr/bin/env python3
"""
Test MySQL connection with your credentials.
Run this locally to verify your MySQL setup before deploying to Render.

Usage:
    python scripts/test_mysql_connection.py

The script will:
1. Read MySQL credentials from environment variables
2. Test the connection
3. Show detailed error messages if connection fails
"""

import os
import sys
from urllib.parse import quote_plus

def test_mysql_connection():
    """Test MySQL connection with environment variables."""
    
    print("=" * 60)
    print("MySQL Connection Test")
    print("=" * 60)
    
    # Read environment variables
    db_host = os.getenv("MYSQL_HOST", "localhost")
    db_port = int(os.getenv("MYSQL_PORT", "3306"))
    db_user = os.getenv("MYSQL_USER", "notehub")
    db_password = os.getenv("MYSQL_PASSWORD", "")
    db_name = os.getenv("MYSQL_DATABASE", "notehub")
    
    print(f"\n📋 Configuration:")
    print(f"   Host:     {db_host}")
    print(f"   Port:     {db_port}")
    print(f"   User:     {db_user}")
    print(f"   Password: {'*' * len(db_password) if db_password else '(empty)'}")
    print(f"   Database: {db_name}")
    print()
    
    # Check for common issues
    warnings = []
    if db_host == "localhost":
        warnings.append("⚠️  Host is 'localhost' - this won't work on Render!")
    if not db_password:
        warnings.append("⚠️  Password is empty!")
    if db_host.startswith("http://") or db_host.startswith("https://"):
        warnings.append("⚠️  Host should not include http:// or https://")
    
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"   {warning}")
        print()
    
    # Build connection string
    encoded_password = quote_plus(db_password) if db_password else ""
    if encoded_password:
        connection_string = f"mysql+pymysql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"
    else:
        connection_string = f"mysql+pymysql://{db_user}@{db_host}:{db_port}/{db_name}"
    
    print("🔌 Testing connection...")
    print()
    
    try:
        # Import SQLAlchemy
        try:
            from sqlalchemy import create_engine, text
        except ImportError:
            print("❌ SQLAlchemy not installed!")
            print("   Run: pip install sqlalchemy pymysql")
            return False
        
        # Try to connect
        connect_args = {
            'connect_timeout': 10,
            'charset': 'utf8mb4'
        }
        
        # Add SSL for cloud providers
        if 'psdb.cloud' in db_host or 'railway' in db_host:
            connect_args['ssl'] = {'check_hostname': False}
            print("🔒 SSL enabled for cloud database")
            print()
        
        engine = create_engine(
            connection_string,
            connect_args=connect_args,
            pool_pre_ping=True
        )
        
        # Test query
        with engine.connect() as conn:
            result = conn.execute(text("SELECT VERSION()"))
            version = result.scalar()
            
            print("✅ Connection successful!")
            print(f"   MySQL Version: {version}")
            
            # Test database access
            result = conn.execute(text("SELECT DATABASE()"))
            current_db = result.scalar()
            print(f"   Current Database: {current_db}")
            
            # List tables
            result = conn.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result.fetchall()]
            if tables:
                print(f"   Tables: {', '.join(tables)}")
            else:
                print("   Tables: (none - fresh database)")
            
            print()
            print("🎉 Your MySQL connection is working!")
            print("   You can now deploy to Render with these credentials.")
            return True
            
    except Exception as e:
        print("❌ Connection failed!")
        print(f"   Error: {str(e)}")
        print()
        
        # Provide helpful troubleshooting tips
        error_str = str(e).lower()
        print("💡 Troubleshooting tips:")
        
        if "can't connect" in error_str or "connection refused" in error_str:
            print("   - Check if MYSQL_HOST is correct")
            print("   - Verify the database server is running")
            print("   - Check if port 3306 is open")
            print("   - For PlanetScale, make sure you copied the host correctly")
        elif "access denied" in error_str:
            print("   - Check MYSQL_USER and MYSQL_PASSWORD")
            print("   - Verify credentials are correct (case-sensitive)")
            print("   - For PlanetScale, regenerate the password if needed")
        elif "unknown database" in error_str:
            print("   - Check MYSQL_DATABASE name")
            print("   - Verify the database exists on the server")
            print("   - For PlanetScale, use the exact database name from their dashboard")
        elif "ssl" in error_str or "certificate" in error_str:
            print("   - Your database might require SSL")
            print("   - This is normal for PlanetScale and other cloud providers")
            print("   - The app handles this automatically")
        else:
            print("   - Double-check all environment variables")
            print("   - See docs/guides/EXTERNAL_MYSQL_SETUP.md for detailed help")
        
        return False

if __name__ == "__main__":
    print()
    success = test_mysql_connection()
    print()
    
    if not success:
        print("Set environment variables and try again:")
        print("  export MYSQL_HOST=your-host")
        print("  export MYSQL_PORT=3306")
        print("  export MYSQL_USER=your-user")
        print("  export MYSQL_PASSWORD=your-password")
        print("  export MYSQL_DATABASE=your-database")
        print()
        sys.exit(1)
    
    sys.exit(0)
