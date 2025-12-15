# Database Migration Guide

## Overview

NoteHub uses a centralized, automated migration system that handles database schema updates for both SQLite and MySQL. The system is designed to be:

- **Idempotent**: Safe to run multiple times
- **Automatic**: Runs on server startup
- **Versioned**: Tracks which migrations have been applied
- **Developer-friendly**: Easy to add new migrations

## Architecture

### Components

1. **Migration Registry** (`backend/src/config/migrations.js`)
   - Central list of all migrations
   - Each migration has a unique ID and description
   - Separate implementations for SQLite and MySQL

2. **Schema Verification** (`backend/src/config/schemaVerification.js`)
   - Validates database schema completeness
   - Reports missing tables, columns, and indexes
   - Provides schema statistics

3. **Migration CLI** (`backend/scripts/migrate.js`)
   - Command-line tool for managing migrations
   - Check status, run migrations, verify schema
   - Generate migration templates

4. **Database Integration** (`backend/src/config/database.js`)
   - Automatically runs migrations on startup
   - Integrates with existing initialization process

## How It Works

### Automatic Migration on Startup

When the server starts:

1. Database connection is established
2. Tables are created (if they don't exist)
3. Migration history table is initialized
4. All pending migrations are executed
5. Schema is verified

```javascript
// From backend/src/index.js
await db.connect();
await db.initSchema(); // Runs migrations automatically
```

### Migration History Tracking

The system creates a `migration_history` table to track applied migrations:

```sql
CREATE TABLE migration_history (
  id VARCHAR(255) PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

Each migration is recorded when successfully applied, preventing duplicate execution.

## Adding a New Migration

### Step 1: Create Migration Template

Use the CLI to generate a template:

```bash
cd backend
node scripts/migrate.js create "add user timezone column"
```

This generates a migration template with a unique ID.

### Step 2: Implement Migration Logic

Add the migration to `backend/src/config/migrations.js` in the `MIGRATIONS` array:

```javascript
{
  id: '009_add_user_timezone',
  description: 'Add timezone column to users table',
  
  async sqlite(db) {
    const columns = db.prepare('PRAGMA table_info(users)').all();
    const hasTimezone = columns.some((col) => col.name === 'timezone');

    if (!hasTimezone) {
      logger.info('  🔄 Adding timezone column to users table...');
      db.exec("ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC'");
      logger.info('  ✅ timezone column added');
    }
  },
  
  async mysql(db) {
    const database = process.env.MYSQL_DATABASE || 'notehub';
    
    const [timezoneColumn] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'timezone'`,
      [database],
    );

    if (timezoneColumn.length === 0) {
      logger.info('  🔄 Adding timezone column to users table...');
      await db.query("ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'");
      logger.info('  ✅ timezone column added');
    }
  },
}
```

### Step 3: Update Schema Definition

Update the expected schema in `backend/src/config/schemaVerification.js`:

```javascript
const EXPECTED_SCHEMA = {
  users: {
    columns: [
      'id', 'username', 'password_hash', 'email', 'bio', 'theme',
      'hidden_notes', 'preferred_language', 'totp_secret', 'is_admin',
      'is_locked', 'created_at', 'updated_at', 'last_login', 'status', 
      'avatar_url', 'timezone' // Add new column here
    ],
    indexes: ['ix_users_username', 'ix_users_email'],
  },
  // ... other tables
};
```

### Step 4: Test the Migration

Test on a development database:

```bash
# Check current status
node scripts/migrate.js status

# Run migration
node scripts/migrate.js run

# Verify schema
node scripts/migrate.js verify
```

### Step 5: Test on Both Databases

Test the migration on both SQLite and MySQL:

```bash
# Test with SQLite (default)
NOTES_DB_PATH=./data/test.db node scripts/migrate.js run

# Test with MySQL
MYSQL_HOST=localhost \
MYSQL_USER=root \
MYSQL_PASSWORD=password \
MYSQL_DATABASE=notehub_test \
node scripts/migrate.js run
```

## Migration Best Practices

### 1. Always Check Before Altering

**✅ Good:**
```javascript
const columns = db.prepare('PRAGMA table_info(users)').all();
const hasColumn = columns.some((col) => col.name === 'new_column');

if (!hasColumn) {
  db.exec('ALTER TABLE users ADD COLUMN new_column TEXT');
}
```

**❌ Bad:**
```javascript
// This will fail if column already exists
db.exec('ALTER TABLE users ADD COLUMN new_column TEXT');
```

### 2. Use Appropriate Data Types

Match data types between SQLite and MySQL:

| SQLite | MySQL | Use Case |
|--------|-------|----------|
| `INTEGER` | `INT` or `TINYINT` | Numbers, booleans |
| `TEXT` | `VARCHAR(n)` or `TEXT` | Strings |
| `DATETIME` | `DATETIME` | Timestamps |
| `REAL` | `DECIMAL` or `FLOAT` | Decimals |

### 3. Set Appropriate Defaults

```javascript
// SQLite
db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");

// MySQL
await db.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
```

### 4. Handle Existing Data

If adding a NOT NULL column, provide a default or update existing rows:

```javascript
// Add column with default
db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');

// Or update existing rows first
db.exec('UPDATE users SET role = "user" WHERE role IS NULL');
```

### 5. Add Indexes for Performance

```javascript
async sqlite(db) {
  // Add column
  db.exec('ALTER TABLE notes ADD COLUMN category TEXT');
  
  // Add index for better query performance
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category)');
  } catch (error) {
    logger.debug('Index already exists or could not be created');
  }
}
```

### 6. Group Related Changes

Group related schema changes in a single migration:

```javascript
{
  id: '010_user_profile_enhancements',
  description: 'Add profile fields: avatar_url, bio, location',
  async sqlite(db) {
    const columns = db.prepare('PRAGMA table_info(users)').all();
    
    if (!columns.some(col => col.name === 'avatar_url')) {
      db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
    }
    if (!columns.some(col => col.name === 'bio')) {
      db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
    }
    if (!columns.some(col => col.name === 'location')) {
      db.exec('ALTER TABLE users ADD COLUMN location TEXT');
    }
  },
  // ... mysql implementation
}
```

## Migration CLI Commands

### Check Migration Status

```bash
node scripts/migrate.js status
```

Output:
```
📊 Migration Status

Applied migrations: 8

✅ Applied:
  - 001_add_user_admin_fields: Add is_admin and is_locked columns to users table
    Applied at: 2024-12-15 10:30:00
  ...

Pending migrations: 0
```

### Run Pending Migrations

```bash
node scripts/migrate.js run
```

Output:
```
🚀 Running pending migrations

📝 Applying migration: 009_add_user_timezone - Add timezone column to users table
  🔄 Adding timezone column to users table...
  ✅ timezone column added
✅ Migration 009_add_user_timezone completed

✅ Applied 1 migration(s), skipped 8
```

### Verify Database Schema

```bash
node scripts/migrate.js verify
```

Output:
```
🔍 Verifying database schema

✅ Schema verification passed - all tables and columns present

📊 Schema Statistics:
  Total tables: 16
  Total columns: 145
  Total indexes: 42
```

### Create Migration Template

```bash
node scripts/migrate.js create "add feature name"
```

## Troubleshooting

### Migration Failed

If a migration fails:

1. **Check the error message** in the console
2. **Review the migration code** for syntax errors
3. **Check database permissions** (especially for MySQL)
4. **Verify data types** are compatible
5. **Test on a development database** first

### Column Already Exists Error

This usually means the migration check failed. Ensure you're checking for column existence:

```javascript
// Always check first
const columns = db.prepare('PRAGMA table_info(users)').all();
const hasColumn = columns.some((col) => col.name === 'new_column');

if (!hasColumn) {
  // Only add if missing
  db.exec('ALTER TABLE users ADD COLUMN new_column TEXT');
}
```

### MySQL Permissions Error

Ensure the MySQL user has ALTER TABLE permissions:

```sql
GRANT ALTER ON notehub.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

### Schema Verification Fails

If schema verification reports missing columns:

1. **Check if migration was applied**: `node scripts/migrate.js status`
2. **Re-run migrations**: `node scripts/migrate.js run`
3. **Check migration code** for typos in table/column names

## Migration Naming Convention

Use descriptive migration IDs that indicate order and purpose:

```
001_initial_feature
002_add_user_fields
003_create_audit_logs
004_add_folder_support
```

Format: `###_descriptive_name`

- **###**: Sequential number (001, 002, 003...)
- **descriptive_name**: Brief description using underscores

## Testing Migrations

### Unit Testing

Create tests for migration logic in `backend/tests/`:

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import Database from '../src/config/database.js';
import { runMigrations } from '../src/config/migrations.js';

describe('Database Migrations', () => {
  let db;

  beforeEach(async () => {
    db = new Database();
    await db.connect();
    await db.initSchema();
  });

  it('should apply all migrations successfully', async () => {
    await runMigrations(db.db, db.isSQLite);
    
    // Verify expected columns exist
    const columns = db.db.prepare('PRAGMA table_info(users)').all();
    expect(columns.some(col => col.name === 'is_admin')).toBe(true);
  });

  afterEach(async () => {
    await db.close();
  });
});
```

### Integration Testing

Test the full migration flow:

```bash
# Create test database
export NOTES_DB_PATH=./data/test_migration.db

# Run server (will apply migrations)
npm run dev

# Verify schema
node scripts/migrate.js verify

# Clean up
rm ./data/test_migration.db
```

## Rollback Strategy

Currently, the migration system does not support automatic rollbacks. To revert a migration:

1. **Manual rollback**: Write SQL to remove the added column/table
2. **Restore from backup**: Use database backup
3. **Fresh start**: For development, delete database and restart

**Future Enhancement**: Add rollback support with `down()` functions in migrations.

## Examples

### Example 1: Add Single Column

```javascript
{
  id: '011_add_user_phone',
  description: 'Add phone number column to users table',
  async sqlite(db) {
    const columns = db.prepare('PRAGMA table_info(users)').all();
    if (!columns.some(col => col.name === 'phone')) {
      logger.info('  🔄 Adding phone column to users table...');
      db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
      logger.info('  ✅ phone column added');
    }
  },
  async mysql(db) {
    const database = process.env.MYSQL_DATABASE || 'notehub';
    const [column] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'`,
      [database],
    );
    if (column.length === 0) {
      logger.info('  🔄 Adding phone column to users table...');
      await db.query('ALTER TABLE users ADD COLUMN phone VARCHAR(20)');
      logger.info('  ✅ phone column added');
    }
  },
}
```

### Example 2: Add Column with Index

```javascript
{
  id: '012_add_notes_category',
  description: 'Add category column to notes table with index',
  async sqlite(db) {
    const columns = db.prepare('PRAGMA table_info(notes)').all();
    if (!columns.some(col => col.name === 'category')) {
      logger.info('  🔄 Adding category column to notes table...');
      db.exec('ALTER TABLE notes ADD COLUMN category TEXT DEFAULT "general"');
      db.exec('CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category)');
      logger.info('  ✅ category column and index added');
    }
  },
  async mysql(db) {
    const database = process.env.MYSQL_DATABASE || 'notehub';
    const [column] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'category'`,
      [database],
    );
    if (column.length === 0) {
      logger.info('  🔄 Adding category column to notes table...');
      await db.query('ALTER TABLE notes ADD COLUMN category VARCHAR(50) DEFAULT "general"');
      await db.query('CREATE INDEX idx_notes_category ON notes(category)');
      logger.info('  ✅ category column and index added');
    }
  },
}
```

### Example 3: Create New Table

```javascript
{
  id: '013_create_notifications_table',
  description: 'Create notifications table',
  async sqlite(db) {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'"
    ).get();
    
    if (!tables) {
      logger.info('  🔄 Creating notifications table...');
      db.exec(`
        CREATE TABLE notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      db.exec('CREATE INDEX idx_notifications_user ON notifications(user_id)');
      logger.info('  ✅ notifications table created');
    }
  },
  async mysql(db) {
    const database = process.env.MYSQL_DATABASE || 'notehub';
    const [tables] = await db.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = "notifications"',
      [database],
    );
    
    if (tables.length === 0) {
      logger.info('  🔄 Creating notifications table...');
      await db.query(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          message TEXT NOT NULL,
          \`read\` BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_notifications_user (user_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      logger.info('  ✅ notifications table created');
    }
  },
}
```

## Summary

The new migration system provides:

- ✅ **Automatic execution** on server startup
- ✅ **Version tracking** with migration history
- ✅ **Idempotent migrations** safe to run multiple times
- ✅ **Schema verification** to ensure completeness
- ✅ **Developer-friendly** tools and documentation
- ✅ **Support for both** SQLite and MySQL

To add a new migration:

1. Generate template: `node scripts/migrate.js create "migration name"`
2. Add migration to `migrations.js`
3. Update schema definition in `schemaVerification.js`
4. Test: `node scripts/migrate.js run` and `verify`
5. Commit and deploy

The system handles the rest automatically!
