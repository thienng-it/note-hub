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
      return this.initSQLiteSchema();
    }
    return this.initMySQLSchema();
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

    // Create triggers for automatic updated_at handling in SQLite
    // These must be executed separately due to semicolons in trigger bodies
    const triggers = [
      `CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
        AFTER UPDATE ON users
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
        BEGIN
          UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END`,
      `CREATE TRIGGER IF NOT EXISTS update_tags_timestamp 
        AFTER UPDATE ON tags
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
        BEGIN
          UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END`,
      `CREATE TRIGGER IF NOT EXISTS update_notes_timestamp 
        AFTER UPDATE ON notes
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
        BEGIN
          UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END`,
      `CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp 
        AFTER UPDATE ON tasks
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
        BEGIN
          UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END`,
      `CREATE TRIGGER IF NOT EXISTS update_share_notes_timestamp 
        AFTER UPDATE ON share_notes
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
        BEGIN
          UPDATE share_notes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END`,
      `CREATE TRIGGER IF NOT EXISTS update_password_reset_tokens_timestamp 
        AFTER UPDATE ON password_reset_tokens
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
        BEGIN
          UPDATE password_reset_tokens SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END`,
      `CREATE TRIGGER IF NOT EXISTS update_invitations_timestamp 
        AFTER UPDATE ON invitations
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
        BEGIN
          UPDATE invitations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END`
    ];

    for (const trigger of triggers) {
      this.db.exec(trigger);
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
