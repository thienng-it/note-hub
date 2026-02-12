# Database Storage on Fly.io - Complete Guide

## 📍 Where Your Data is Stored

Your NoteHub backend on Fly.io stores all user data in a **SQLite database** located on a persistent volume.

### Database Location

**Volume Name**: `notehub_data`  
**Mount Point**: `/app/data/`  
**Database File**: `/app/data/notes.db`  
**Size**: 1 GB (free tier limit)

### What's Stored

All your application data is stored in the SQLite database:
- ✅ **User accounts** (username, email, password hash)
- ✅ **Notes** (title, content, tags, favorites, pins)
- ✅ **Tasks** (todo lists, task items)
- ✅ **Chat messages** (encrypted conversations)
- ✅ **Folders** (note organization)
- ✅ **Audit logs** (user activity tracking)
- ✅ **Sessions** (JWT refresh tokens)
- ✅ **Settings** (user preferences, theme, etc.)

## 🔍 Viewing Your Database

### Method 1: Via API Health Endpoint

Quick check of user count:
```bash
curl https://notehub-backend.fly.dev/api/health | jq .
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "user_count": 0
}
```

### Method 2: Download Database File (for local inspection)

```bash
# Download the database to your local machine
flyctl ssh sftp get /app/data/notes.db ./notes-backup.db -a notehub-backend

# Query locally with SQLite
sqlite3 notes-backup.db "SELECT * FROM users;"
sqlite3 notes-backup.db "SELECT COUNT(*) FROM notes;"
sqlite3 notes-backup.db ".schema users"
```

### Method 3: SSH Into Machine and Inspect

```bash
# Start machine if stopped
flyctl machine start <machine-id> -a notehub-backend

# SSH into the machine
flyctl ssh console -a notehub-backend

# Inside the container
ls -lh /app/data/
# You'll see:
# notes.db      - Main database file
# notes.db-shm  - Shared memory file (SQLite)
# notes.db-wal  - Write-ahead log (SQLite)
```

### Method 4: Query via Backend API (Recommended)

Use the admin endpoints to view data:

```bash
# Login as admin
curl -X POST https://notehub-backend.fly.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"NoteHub2026Admin!"}'

# Get access token from response, then:
curl https://notehub-backend.fly.dev/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📊 Database Schema

### Main Tables

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT,
  theme TEXT DEFAULT 'light',
  is_admin BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notes table
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT 0,
  is_pinned BOOLEAN DEFAULT 0,
  folder_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tasks table
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 💾 Backup & Restore

### Automatic Backups

Fly.io provides **automatic volume snapshots**:
- ✅ Retention: 5 days (default)
- ✅ Scheduled daily
- ✅ Included in free tier

View snapshots:
```bash
flyctl volumes list -a notehub-backend
flyctl volumes snapshots list <volume-id> -a notehub-backend
```

### Manual Backup

```bash
# Download database file
flyctl ssh sftp get /app/data/notes.db ./backup-$(date +%Y%m%d).db -a notehub-backend

# Or use SFTP interactively
flyctl ssh sftp shell -a notehub-backend
# sftp> get /app/data/notes.db ./local-backup.db
# sftp> quit
```

### Restore from Backup

```bash
# Upload database file to replace current one
flyctl ssh sftp shell -a notehub-backend
# sftp> put ./backup-20260212.db /app/data/notes.db
# sftp> quit

# Restart app to use new database
flyctl apps restart -a notehub-backend
```

## 🔄 Database Persistence

### How Persistence Works

1. **Persistent Volume**: Created with `flyctl volumes create notehub_data`
2. **Mounted at**: `/app/data/` in the container
3. **Survives**: Machine restarts, deployments, updates
4. **Lost only if**: Volume is explicitly deleted

### Data Survival Scenarios

| Scenario | Data Persists? |
|----------|----------------|
| App restart | ✅ Yes |
| New deployment | ✅ Yes |
| Machine stop/start | ✅ Yes |
| Code update | ✅ Yes |
| Volume deletion | ❌ No - PERMANENT DATA LOSS |

## 📈 Monitoring Database Size

```bash
# Check volume usage
flyctl volumes list -a notehub-backend

# SSH and check file size
flyctl ssh console -a notehub-backend -C "ls -lh /app/data/notes.db"

# Example output:
# -rw-r--r-- 1 appuser appuser 432K Feb 12 03:11 /app/data/notes.db
```

## 🚨 Important Notes

### Free Tier Limits
- **Maximum volume size**: 3 GB total across all volumes
- **Current allocation**: 1 GB for `notehub_data`
- **Remaining**: 2 GB available for other volumes

### Data Safety
⚠️ **CRITICAL**: Always backup before:
- Deleting volumes
- Major schema changes
- Testing destructive operations

### Performance
- SQLite is **excellent** for small-medium workloads
- Current free tier handles ~1000s of users efficiently
- For larger scale, consider upgrading to Fly Postgres

## 🔧 Common Operations

### Check Database File Integrity

```bash
flyctl ssh console -a notehub-backend

# Inside container
# Note: sqlite3 is not installed in the Alpine image
# Use Node.js to check integrity
node -e "
const db = require('better-sqlite3')('/app/data/notes.db');
const result = db.pragma('integrity_check');
console.log('Integrity:', result);
db.close();
"
```

### Vacuum Database (Optimize Space)

```bash
curl -X POST https://notehub-backend.fly.dev/api/v1/admin/database/vacuum \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### View Database Statistics

```bash
flyctl ssh console -a notehub-backend -C "node -e \"
const db = require('better-sqlite3')('/app/data/notes.db');
const stats = {
  users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
  notes: db.prepare('SELECT COUNT(*) as c FROM notes').get().c,
  tasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
  size: require('fs').statSync('/app/data/notes.db').size
};
console.log(JSON.stringify(stats, null, 2));
db.close();
\""
```

## 🌐 Access from Anywhere

Your database is accessible through the Fly.io backend API from:
- ✅ **Frontend**: https://notehub-484714.web.app (Firebase)
- ✅ **API**: https://notehub-backend.fly.dev
- ✅ **Local dev**: Connect via API endpoints
- ✅ **Mobile apps**: Use API endpoints

All secured with JWT authentication! 🔒

## 📝 Next Steps

1. **Register your first account** at https://notehub-484714.web.app
2. **Create some notes** to populate the database
3. **Set up regular backups** (weekly recommended)
4. **Monitor volume usage** monthly

---

**Your data is safe, persistent, and completely free on Fly.io!** 🎉
