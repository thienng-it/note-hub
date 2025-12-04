/**
 * Database configuration and connection management.
 * Supports both SQLite (default) and MySQL.
 */
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.isSQLite = true;
  }

  /**
   * Initialize database connection based on environment variables.
   * SQLite is used by default; MySQL is used when MYSQL_HOST is set.
   */
  async connect() {
    const dbPath = process.env.NOTES_DB_PATH;
    const mysqlHost = process.env.MYSQL_HOST;

    // SQLite takes priority if NOTES_DB_PATH is set
    if (dbPath && !mysqlHost) {
      // Resolve path relative to project root
      const resolvedPath = path.isAbsolute(dbPath) 
        ? dbPath 
        : path.resolve(process.cwd(), dbPath);
      return this.connectSQLite(resolvedPath);
    }

    // MySQL if MYSQL_HOST is set
    if (mysqlHost) {
      return this.connectMySQL();
    }

    // Default to SQLite in project root's data folder
    const defaultPath = path.resolve(process.cwd(), 'data', 'notes.db');
    return this.connectSQLite(defaultPath);
  }

  /**
   * Connect to SQLite database.
   */
  connectSQLite(dbPath) {
    const Database = require('better-sqlite3');
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.isSQLite = true;
    
    console.log(`📦 Connected to SQLite database: ${dbPath}`);
    return this.db;
  }

  /**
   * Connect to MySQL database.
   */
  async connectMySQL() {
    const mysql = require('mysql2/promise');
    
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'notehub',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

    // Disable SSL for local/Docker connections
    const sslDisabled = process.env.MYSQL_SSL_DISABLED === 'true' ||
      config.host === 'localhost' ||
      config.host === '127.0.0.1' ||
      config.host === 'mysql' ||
      config.host.startsWith('10.') ||
      config.host.startsWith('172.') ||
      config.host.startsWith('192.168.');

    if (!sslDisabled) {
      config.ssl = { rejectUnauthorized: true };
    }

    this.db = await mysql.createPool(config);
    this.isSQLite = false;
    
    console.log(`🐬 Connected to MySQL database: ${config.host}:${config.port}/${config.database}`);
    return this.db;
  }

  /**
   * Initialize database schema.
   */
  async initSchema() {
    if (this.isSQLite) {
      this.initSQLiteSchema();
      return this.migrateSQLiteSchema();
    }
    this.initMySQLSchema();
    return this.migrateMySQLSchema();
  }

  /**
   * Initialize SQLite schema.
   */
  initSQLiteSchema() {
    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        bio TEXT,
        theme TEXT DEFAULT 'light',
        totp_secret TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      );
      CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

      -- Tags table
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#3B82F6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS ix_tags_name ON tags(name);

      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT 'Untitled',
        body TEXT DEFAULT '',
        pinned INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0,
        favorite INTEGER DEFAULT 0,
        owner_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS ix_notes_owner ON notes(owner_id);
      CREATE INDEX IF NOT EXISTS ix_notes_archived ON notes(archived);
      -- Composite indexes for optimized queries
      CREATE INDEX IF NOT EXISTS ix_notes_owner_archived ON notes(owner_id, archived);
      CREATE INDEX IF NOT EXISTS ix_notes_owner_favorite ON notes(owner_id, favorite);
      CREATE INDEX IF NOT EXISTS ix_notes_owner_pinned_updated ON notes(owner_id, pinned, updated_at);
      CREATE INDEX IF NOT EXISTS ix_notes_updated_at ON notes(updated_at);

      -- Note-Tag junction table
      CREATE TABLE IF NOT EXISTS note_tag (
        note_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      -- Share notes table
      CREATE TABLE IF NOT EXISTS share_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL,
        shared_by_id INTEGER NOT NULL,
        shared_with_id INTEGER NOT NULL,
        can_edit INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_by_id) REFERENCES users(id),
        FOREIGN KEY (shared_with_id) REFERENCES users(id)
      );

      -- Tasks table
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        due_date DATETIME,
        priority TEXT DEFAULT 'medium',
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS ix_tasks_owner ON tasks(owner_id);

      -- Password reset tokens table
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS ix_reset_tokens ON password_reset_tokens(token);

      -- Invitations table
      CREATE TABLE IF NOT EXISTS invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        inviter_id INTEGER NOT NULL,
        email TEXT,
        message TEXT,
        used INTEGER DEFAULT 0,
        used_by_id INTEGER,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inviter_id) REFERENCES users(id),
        FOREIGN KEY (used_by_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS ix_invitations_token ON invitations(token);
    `;

    // Execute each statement separately for SQLite
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        this.db.exec(statement);
      }
    }

    // Create UPDATE triggers for automatic updated_at handling in SQLite
    // Only create triggers for tables that have the updated_at column
    // (migration will add it if missing and create triggers then)
    const tablesToTrigger = ['notes', 'tasks']; // These always have updated_at in the schema
    const otherTables = ['users', 'tags', 'share_notes', 'password_reset_tokens', 'invitations'];
    
    // Check which tables already have updated_at column
    for (const table of otherTables) {
      try {
        const columns = this.db.prepare(`PRAGMA table_info(${table})`).all();
        if (columns.some(col => col.name === 'updated_at')) {
          tablesToTrigger.push(table);
        }
      } catch (error) {
        // Table doesn't exist yet, skip
      }
    }
    
    // Create UPDATE triggers only for tables that have updated_at
    for (const table of tablesToTrigger) {
      try {
        this.db.exec(`
          CREATE TRIGGER IF NOT EXISTS update_${table}_timestamp 
            AFTER UPDATE ON ${table}
            FOR EACH ROW
            WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
            BEGIN
              UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);
      } catch (error) {
        // Trigger creation failed, migration will handle it
      }
    }
    
    console.log('✅ SQLite schema initialized');
  }

  /**
   * Initialize MySQL schema.
   */
  async initMySQLSchema() {
    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        bio TEXT,
        theme VARCHAR(20) DEFAULT 'light',
        totp_secret VARCHAR(32),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login DATETIME,
        INDEX ix_users_username (username),
        INDEX ix_users_email (email)
      );

      -- Tags table
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(64) UNIQUE NOT NULL,
        color VARCHAR(7) DEFAULT '#3B82F6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_tags_name (name)
      );

      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL DEFAULT 'Untitled',
        body TEXT,
        pinned BOOLEAN DEFAULT FALSE,
        archived BOOLEAN DEFAULT FALSE,
        favorite BOOLEAN DEFAULT FALSE,
        owner_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_notes_owner (owner_id),
        INDEX ix_notes_archived (archived),
        INDEX ix_notes_owner_archived (owner_id, archived),
        INDEX ix_notes_owner_favorite (owner_id, favorite),
        INDEX ix_notes_owner_pinned_updated (owner_id, pinned, updated_at),
        INDEX ix_notes_updated_at (updated_at),
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
      );

      -- Note-Tag junction table
      CREATE TABLE IF NOT EXISTS note_tag (
        note_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      -- Share notes table
      CREATE TABLE IF NOT EXISTS share_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        note_id INT NOT NULL,
        shared_by_id INT NOT NULL,
        shared_with_id INT NOT NULL,
        can_edit BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_by_id) REFERENCES users(id),
        FOREIGN KEY (shared_with_id) REFERENCES users(id)
      );

      -- Tasks table
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        due_date DATETIME,
        priority VARCHAR(20) DEFAULT 'medium',
        owner_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_tasks_owner (owner_id),
        FOREIGN KEY (owner_id) REFERENCES users(id)
      );

      -- Password reset tokens table
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(64) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_reset_tokens (token),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Invitations table
      CREATE TABLE IF NOT EXISTS invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(64) UNIQUE NOT NULL,
        inviter_id INT NOT NULL,
        email VARCHAR(255),
        message TEXT,
        used BOOLEAN DEFAULT FALSE,
        used_by_id INT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_invitations_token (token),
        FOREIGN KEY (inviter_id) REFERENCES users(id),
        FOREIGN KEY (used_by_id) REFERENCES users(id)
      );
    `;

    // Execute each statement separately for MySQL
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.db.execute(statement);
      }
    }
    
    console.log('✅ MySQL schema initialized');
  }

  /**
   * Migrate SQLite schema - add missing columns to existing tables.
   * Note: SQLite doesn't support DEFAULT CURRENT_TIMESTAMP in ALTER TABLE,
   * so we add the column without default and use triggers to set values.
   * Also fixes tables where created_at is NOT NULL without DEFAULT.
   */
  migrateSQLiteSchema() {
    try {
      // Helper function to fix timestamp columns and add triggers
      const fixTimestampColumns = (tableName, displayName) => {
        const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
        const createdAtCol = columns.find(col => col.name === 'created_at');
        
        // Check if created_at has problematic NOT NULL constraint without default
        // If notnull=1 and dflt_value is NULL, it means NOT NULL without DEFAULT
        const hasProblematicCreatedAt = createdAtCol && createdAtCol.notnull === 1 && 
                                       (createdAtCol.dflt_value === null || createdAtCol.dflt_value === undefined);
        
        if (hasProblematicCreatedAt) {
          console.log(`🔄 Migrating ${displayName} table: fixing created_at constraint`);
          // Need to rebuild the table to remove NOT NULL constraint or add DEFAULT
          // This is the SQLite way to modify column constraints
          this.rebuildTableWithFixedTimestamps(tableName, columns);
          return; // Table rebuilt, no need for further column additions
        }
        
        // Add updated_at column if missing
        if (!hasUpdatedAt) {
          console.log(`🔄 Migrating ${displayName} table: adding updated_at column`);
          // Add column without DEFAULT (SQLite limitation)
          this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN updated_at DATETIME`);
          // Set initial value for existing rows
          this.db.exec(`UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`);
          
          // Create INSERT trigger to set updated_at on new rows
          this.db.exec(`
            CREATE TRIGGER IF NOT EXISTS insert_${tableName}_updated_at 
              AFTER INSERT ON ${tableName}
              FOR EACH ROW
              WHEN NEW.updated_at IS NULL
              BEGIN
                UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
              END
          `);
        }
      };

      // Migrate all tables that have timestamp columns
      fixTimestampColumns('users', 'users');
      fixTimestampColumns('tags', 'tags');
      fixTimestampColumns('notes', 'notes');
      fixTimestampColumns('tasks', 'tasks');
      fixTimestampColumns('share_notes', 'share_notes');
      fixTimestampColumns('password_reset_tokens', 'password_reset_tokens');
      fixTimestampColumns('invitations', 'invitations');

      console.log('✅ SQLite schema migration completed');
    } catch (error) {
      console.error('⚠️ SQLite migration error (non-fatal):', error.message);
    }
  }

  /**
   * Rebuild a table with fixed timestamp constraints.
   * This is necessary because SQLite doesn't allow modifying column constraints.
   */
  rebuildTableWithFixedTimestamps(tableName, columns) {
    // Get table's creation SQL to understand its structure
    const tableInfo = this.db.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
    ).get(tableName);
    
    if (!tableInfo) return;

    // Create a temporary table with fixed constraints
    const tempTableName = `${tableName}_migration_temp`;
    
    // Build new table definition with fixed timestamps
    const columnDefs = columns.map(col => {
      let def = `${col.name} ${col.type}`;
      
      // Fix created_at: add DEFAULT CURRENT_TIMESTAMP
      if (col.name === 'created_at') {
        def += ' DEFAULT CURRENT_TIMESTAMP';
      } else if (col.name === 'updated_at') {
        def += ' DEFAULT CURRENT_TIMESTAMP';
      } else {
        // Regular columns
        if (col.notnull === 1) def += ' NOT NULL';
        if (col.dflt_value !== null) def += ` DEFAULT ${col.dflt_value}`;
        if (col.pk === 1) def += ' PRIMARY KEY';
        if (col.pk === 1 && tableName !== 'note_tag') def += ' AUTOINCREMENT';
      }
      
      return def;
    }).join(', ');
    
    // Add updated_at if it doesn't exist
    const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
    const finalColumnDefs = hasUpdatedAt ? columnDefs : `${columnDefs}, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`;
    
    // Get list of existing triggers to drop
    const existingTriggers = this.db.prepare(
      `SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name=?`
    ).all(tableName);
    
    // Execute the migration in a transaction
    this.db.exec('BEGIN TRANSACTION');
    
    try {
      // Drop existing triggers first
      for (const trigger of existingTriggers) {
        this.db.exec(`DROP TRIGGER IF EXISTS ${trigger.name}`);
      }
      
      // Create new table with fixed schema
      this.db.exec(`CREATE TABLE ${tempTableName} (${finalColumnDefs})`);
      
      // Copy data from old table
      const selectColumns = columns.map(c => c.name).join(', ');
      const insertColumns = hasUpdatedAt ? selectColumns : `${selectColumns}, CURRENT_TIMESTAMP`;
      this.db.exec(`INSERT INTO ${tempTableName} SELECT ${insertColumns} FROM ${tableName}`);
      
      // Drop old table
      this.db.exec(`DROP TABLE ${tableName}`);
      
      // Rename temp table to original name
      this.db.exec(`ALTER TABLE ${tempTableName} RENAME TO ${tableName}`);
      
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    
    // Recreate INSERT triggers for both created_at and updated_at
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS insert_${tableName}_created_at 
        AFTER INSERT ON ${tableName}
        FOR EACH ROW
        WHEN NEW.created_at IS NULL
        BEGIN
          UPDATE ${tableName} SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    `);
    
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS insert_${tableName}_updated_at 
        AFTER INSERT ON ${tableName}
        FOR EACH ROW
        WHEN NEW.updated_at IS NULL
        BEGIN
          UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    `);
    
    // Recreate UPDATE trigger
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_${tableName}_timestamp 
        AFTER UPDATE ON ${tableName}
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
        BEGIN
          UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    `);
    
    console.log(`  ✓ Rebuilt ${tableName} table with fixed timestamp constraints`);
  }

  /**
   * Migrate MySQL schema - add missing columns to existing tables.
   */
  async migrateMySQLSchema() {
    try {
      // Check and add missing columns for users table
      const [userColumns] = await this.db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
      );
      const hasUpdatedAt = userColumns.some(col => col.COLUMN_NAME === 'updated_at');
      
      if (!hasUpdatedAt) {
        console.log('🔄 Migrating users table: adding updated_at column');
        await this.db.execute('ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      }

      // Check and add missing columns for tags table
      const [tagColumns] = await this.db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags'"
      );
      const tagHasUpdatedAt = tagColumns.some(col => col.COLUMN_NAME === 'updated_at');
      
      if (!tagHasUpdatedAt) {
        console.log('🔄 Migrating tags table: adding updated_at column');
        await this.db.execute('ALTER TABLE tags ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      }

      // Check and add missing columns for share_notes table
      const [shareColumns] = await this.db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'share_notes'"
      );
      const shareHasUpdatedAt = shareColumns.some(col => col.COLUMN_NAME === 'updated_at');
      
      if (!shareHasUpdatedAt) {
        console.log('🔄 Migrating share_notes table: adding updated_at column');
        await this.db.execute('ALTER TABLE share_notes ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      }

      // Check and add missing columns for password_reset_tokens table
      const [tokenColumns] = await this.db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_tokens'"
      );
      const tokenHasUpdatedAt = tokenColumns.some(col => col.COLUMN_NAME === 'updated_at');
      
      if (!tokenHasUpdatedAt) {
        console.log('🔄 Migrating password_reset_tokens table: adding updated_at column');
        await this.db.execute('ALTER TABLE password_reset_tokens ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      }

      // Check and add missing columns for invitations table
      const [inviteColumns] = await this.db.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invitations'"
      );
      const inviteHasUpdatedAt = inviteColumns.some(col => col.COLUMN_NAME === 'updated_at');
      
      if (!inviteHasUpdatedAt) {
        console.log('🔄 Migrating invitations table: adding updated_at column');
        await this.db.execute('ALTER TABLE invitations ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      }

      console.log('✅ MySQL schema migration completed');
    } catch (error) {
      console.error('⚠️ MySQL migration error (non-fatal):', error.message);
    }
  }

  /**
   * Execute a query with parameters.
   */
  async query(sql, params = []) {
    if (this.isSQLite) {
      return this.db.prepare(sql).all(...params);
    }
    const [rows] = await this.db.execute(sql, params);
    return rows;
  }

  /**
   * Execute a single query and return one row.
   */
  async queryOne(sql, params = []) {
    if (this.isSQLite) {
      return this.db.prepare(sql).get(...params);
    }
    const [rows] = await this.db.execute(sql, params);
    return rows[0];
  }

  /**
   * Run an insert/update/delete query.
   */
  async run(sql, params = []) {
    if (this.isSQLite) {
      const result = this.db.prepare(sql).run(...params);
      return { insertId: result.lastInsertRowid, affectedRows: result.changes };
    }
    const [result] = await this.db.execute(sql, params);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  }

  /**
   * Close the database connection.
   */
  async close() {
    if (this.db) {
      if (this.isSQLite) {
        this.db.close();
      } else {
        await this.db.end();
      }
      this.db = null;
    }
  }
}

// Singleton instance
const database = new Database();

module.exports = database;
