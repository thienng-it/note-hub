# Database Migration Management

## Quick Reference

The migration system provides automatic database schema updates with version tracking.

### CLI Commands

```bash
# Check migration status
node scripts/migrate.js status

# Run pending migrations
node scripts/migrate.js run

# Verify schema completeness
node scripts/migrate.js verify

# Create new migration template
node scripts/migrate.js create "add column name"
```

### Adding a New Migration

1. **Generate template:**
   ```bash
   node scripts/migrate.js create "add user timezone column"
   ```

2. **Add migration to `src/config/migrations.js`:**
   ```javascript
   {
     id: '009_add_user_timezone',
     description: 'Add timezone column to users table',
     async sqlite(db) {
       const columns = db.prepare('PRAGMA table_info(users)').all();
       if (!columns.some(col => col.name === 'timezone')) {
         logger.info('  🔄 Adding timezone column...');
         db.exec("ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC'");
         logger.info('  ✅ timezone column added');
       }
     },
     async mysql(db) {
       const database = process.env.MYSQL_DATABASE || 'notehub';
       const [column] = await db.query(
         `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'timezone'`,
         [database],
       );
       if (column.length === 0) {
         logger.info('  🔄 Adding timezone column...');
         await db.query("ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'");
         logger.info('  ✅ timezone column added');
       }
     },
   }
   ```

3. **Update schema definition in `src/config/schemaVerification.js`:**
   ```javascript
   users: {
     columns: [
       'id', 'username', ..., 'timezone' // Add new column here
     ],
   }
   ```

4. **Test the migration:**
   ```bash
   node scripts/migrate.js run
   node scripts/migrate.js verify
   ```

5. **Run tests:**
   ```bash
   npm test -- migrations.test.js
   ```

### Automatic Execution

Migrations run automatically when the server starts:
- After database connection
- After schema initialization
- Before server accepts requests

No manual intervention needed in production!

### Migration Best Practices

1. **Always check before altering:**
   ```javascript
   const columns = db.prepare('PRAGMA table_info(users)').all();
   if (!columns.some(col => col.name === 'new_column')) {
     // Add column
   }
   ```

2. **Match data types between databases:**
   - SQLite: `INTEGER`, `TEXT`, `DATETIME`, `REAL`
   - MySQL: `INT/TINYINT`, `VARCHAR/TEXT`, `DATETIME`, `DECIMAL/FLOAT`

3. **Set appropriate defaults:**
   ```javascript
   // SQLite
   db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
   
   // MySQL
   await db.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
   ```

4. **Add indexes for performance:**
   ```javascript
   db.exec('CREATE INDEX IF NOT EXISTS idx_table_column ON table(column)');
   ```

5. **Group related changes:**
   - Combine multiple related column additions in one migration
   - Use descriptive migration IDs

### Migration System Features

- ✅ **Automatic** - Runs on server startup
- ✅ **Tracked** - Migration history table
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Verified** - Schema validation
- ✅ **Tested** - 17 unit tests
- ✅ **Documented** - Comprehensive guide

### Documentation

See [docs/guides/DATABASE_MIGRATION_GUIDE.md](../../docs/guides/DATABASE_MIGRATION_GUIDE.md) for complete documentation including:
- Detailed examples
- Troubleshooting guide
- Testing strategies
- Advanced patterns

### Files

- `src/config/migrations.js` - Migration registry
- `src/config/schemaVerification.js` - Schema validation
- `scripts/migrate.js` - CLI tool
- `tests/migrations.test.js` - Unit tests
