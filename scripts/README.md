# Real-Time Database Monitoring & User Management Tools

This directory contains powerful scripts for monitoring, testing, and managing user accounts in real-time.

## 📁 Directory Structure

```
scripts/
├── monitoring/               # Real-time monitoring and user management tools
│   ├── demo_realtime_user_creation.py
│   ├── monitor_db_realtime.py
│   ├── user_dashboard.py
│   ├── cleanup_test_users.py
│   └── test_create_user.py
├── verify_password_policy.py # Password policy verification
├── quick_test.sh            # Quick testing script
└── README.md                # This file
```

## 🚀 Quick Start

### Setup

```bash
# Install dependencies (only needed once)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Test Real-Time Updates

```bash
# Run the interactive demo
python scripts/monitoring/demo_realtime_user_creation.py
```

## 📋 Available Scripts

### 1. **demo_realtime_user_creation.py** 🎬

Interactive demonstration that shows real-time database updates.

**Usage:**

```bash
python scripts/monitoring/demo_realtime_user_creation.py
```

**What it does:**

- Shows initial database state
- Creates 3 test users with real-time feedback
- Displays updated database state
- Provides before/after comparison

**Perfect for:** Understanding how user creation works and verifying real-time updates.

---

### 2. **monitor_db_realtime.py** 👀

Continuously watches the database for new user accounts.

**Usage:**

```bash
python scripts/monitoring/monitor_db_realtime.py
```

**Features:**

- Checks database every 2 seconds
- Instantly displays new users with full details
- Shows periodic heartbeat (every 10 checks)
- Displays final statistics on exit

**Use case:** Run this in one terminal, then create users in another terminal or via the web interface. Watch the monitor detect them instantly!

---

### 3. **user_dashboard.py** 📊

Comprehensive user account statistics and activity dashboard.

**Usage:**

```bash
python scripts/monitoring/user_dashboard.py
```

**Shows:**

- Total user count and percentages
- Email and 2FA adoption rates
- Recent registrations (last 10)
- Active users (last 7 days)
- Growth metrics (today/week/month)
- Security status warnings

**Perfect for:** Getting a quick overview of your user base.

---

### 4. **test_create_user.py** ✨

Create a single test user account.

**Usage:**

```bash
python scripts/monitoring/test_create_user.py <username> <password>
```

**Example:**

```bash
python scripts/monitoring/test_create_user.py newuser "SecurePassword123!@#"
```

**Features:**

- Enforces password policy
- Checks for duplicate usernames
- Shows immediate confirmation
- Perfect for testing with the monitor

---

### 5. **cleanup_test_users.py** 🧹

Clean up test users from the database.

**Usage:**

```bash
# Dry run to see what would be deleted
python scripts/monitoring/cleanup_test_users.py --dry-run

# Interactive cleanup
python scripts/monitoring/cleanup_test_users.py

# Remove all test* users
python scripts/monitoring/cleanup_test_users.py --all
```

---

### 6. **verify_password_policy.py** 🔒

Verify password policy enforcement.

**Usage:**

```bash
python scripts/verify_password_policy.py
```

---

### 7. **quick_test.sh** ⚡

Quick testing script for the entire workflow.

**Usage:**

```bash
bash scripts/quick_test.sh
```

---

## 🎯 Real-Time Monitoring Demo

### Two-Terminal Method

**Terminal 1 - Monitor:**

```bash
python scripts/monitoring/monitor_db_realtime.py
```

**Terminal 2 - Create Users:**

```bash
# Method A: Use the test script
python scripts/monitoring/test_create_user.py alice "AlicePassword123!@#"
python scripts/monitoring/test_create_user.py bob "BobSecure456!@#"

# Method B: Run the automated demo
python scripts/monitoring/demo_realtime_user_creation.py

# Method C: Start your Flask app and register via browser
python wsgi.py
```

Watch Terminal 1 instantly detect each new user! ⚡

---

## 🔧 Enhanced Features

### Audit Logging

The system now includes comprehensive audit logging:

- **User Creation Logging**: Every password set operation is logged
- **Database Event Tracking**: SQLAlchemy events capture all user inserts/updates
- **Timestamps**: All operations include precise timestamps

Check the application logs to see detailed audit trails.

---

## 📊 Use Cases

### For Development

- **Verify Registration Flow**: Ensure user creation works correctly
- **Test Database Transactions**: Confirm commits happen properly
- **Debug Issues**: Watch database state change in real-time

### For Production Monitoring

- **User Growth Tracking**: See registration patterns
- **Security Audits**: Check 2FA adoption rates
- **Activity Monitoring**: Track login patterns

### For Testing

- **Create Test Data**: Quickly populate database with users
- **Verify Real-Time Updates**: Confirm application responsiveness
- **Performance Testing**: Watch database performance under load

---

## 🛡️ Password Policy Requirements

All scripts enforce these password requirements:

- Minimum 12 characters
- At least 1 lowercase letter
- At least 1 uppercase letter
- At least 1 digit
- At least 1 special character (!@#$%^&\*)

**Valid Example:** `"SecurePassword123!@#"`

---

## 💡 Tips & Tricks

### Quick Health Check

```bash
# See current state
python scripts/monitoring/user_dashboard.py

# Create a test user
python scripts/monitoring/test_create_user.py healthcheck "HealthCheck123!@#"

# Verify it appears
python scripts/monitoring/user_dashboard.py
```

### Continuous Monitoring

```bash
# Keep monitor running in background
python scripts/monitoring/monitor_db_realtime.py &

# Or use tmux/screen for persistent sessions
tmux new -s dbmonitor
python scripts/monitoring/monitor_db_realtime.py
# Detach with Ctrl+B, D
```

### Database Location

All scripts automatically use the database configured in your `.env` file or default to `notes.db`.

---

## 🎉 Summary

You now have a complete suite of tools to:

1. ✅ Monitor database in real-time
2. ✅ Create test users easily
3. ✅ View comprehensive statistics
4. ✅ Audit user activity
5. ✅ Verify real-time updates work perfectly

**The database updates happen instantly after each `session.commit()` - no delays, no caching issues!**

Enjoy your enhanced NoteHub application! 🚀
