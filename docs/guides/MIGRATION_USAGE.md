# 🔧 Migration Tool - Quick Reference

## ✅ Single Script for Everything

Use `run_chat_migration.js` for all migration tasks.

## 📝 Commands

### Create Migration
```bash
npm run migrate:create "feature name"
```

Example:
```bash
npm run migrate:create "add user avatar"
```

Creates: `migrations/20251221_091928_add_user_avatar.sql`

### Run Migrations
```bash
npm run migrate
```

Runs all migrations in `migrations/` directory.

## 🎯 Complete Workflow

```bash
# 1. Create migration
npm run migrate:create "add notifications"

# 2. Edit the generated file
# migrations/20251221_HHMMSS_add_notifications.sql

# 3. Add your SQL
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

# 4. Run migration
npm run migrate
```

## ✨ Features

- ✅ **One script** - `run_chat_migration.js` does it all
- ✅ **Auto-converts** - SQLite ↔ MySQL syntax
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Ordered** - Runs by timestamp
- ✅ **Template** - Pre-filled examples

## 📚 More Info

See `backend/MIGRATIONS.md` for detailed documentation.
