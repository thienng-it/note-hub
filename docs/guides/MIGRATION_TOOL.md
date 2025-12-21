# 🔧 Migration Tool Added!

## ✅ What's New

A simple, powerful migration tool for managing database schema changes.

## 🚀 Quick Start

### Create a Migration
```bash
npm run migrate:create "add user avatar"
```

Creates: `migrations/20251221_083000_add_user_avatar.sql`

### Run Migrations
```bash
npm run migrate
```

Runs all pending migrations automatically.

## 📝 Example Workflow

```bash
# 1. Create migration
npm run migrate:create "add chat reactions"

# 2. Edit the generated file
# migrations/20251221_083000_add_chat_reactions.sql

# 3. Add your SQL
CREATE TABLE IF NOT EXISTS chat_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  emoji VARCHAR(10) NOT NULL
);

# 4. Run migration
npm run migrate
```

## ✨ Features

- ✅ **Template generation** - Pre-filled with examples
- ✅ **Auto-conversion** - SQLite → MySQL syntax
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Ordered execution** - Timestamp-based
- ✅ **Error handling** - Skips existing changes

## 📚 Documentation

See `backend/MIGRATIONS.md` for full documentation.

## 🎯 Commands

| Command | Description |
|---------|-------------|
| `npm run migrate:create "name"` | Create new migration |
| `npm run migrate` | Run all migrations |
| `node scripts/migrate.js create "name"` | Direct create |
| `node scripts/migrate.js run` | Direct run |

## 💡 Pro Tips

1. **Descriptive names**: Use clear, action-based names
   ```bash
   npm run migrate:create "add user preferences table"
   ```

2. **One change per migration**: Keep focused
   ```sql
   -- Good: One table
   CREATE TABLE user_preferences (...);
   
   -- Avoid: Multiple unrelated changes
   ```

3. **Use IF NOT EXISTS**: Make idempotent
   ```sql
   CREATE TABLE IF NOT EXISTS ...
   CREATE INDEX IF NOT EXISTS ...
   ```

4. **Document rollback**: Add rollback SQL in comments
   ```sql
   -- Rollback:
   -- DROP TABLE IF EXISTS user_preferences;
   ```

## 🔄 Migration Flow

```
1. Create migration template
   ↓
2. Edit SQL in generated file
   ↓
3. Run migrations
   ↓
4. Changes applied to database
```

## 📁 File Structure

```
backend/
├── scripts/
│   └── migrate.js          # Migration tool
├── migrations/
│   ├── 20251221_add_chat_features.sql
│   └── 20251222_add_user_avatar.sql
├── package.json            # npm scripts
└── MIGRATIONS.md           # Full documentation
```

## 🎊 Ready to Use!

The migration tool is fully set up and ready. No manual SQL execution needed anymore!

```bash
# Create your first migration
npm run migrate:create "your feature name"
```
