/**
 * Database configuration and connection management.
 * Supports both SQLite (default) and MySQL.
 * Supports read replicas for improved performance and high availability.
 */

import fs from 'node:fs';
import path from 'node:path';
import replication from './databaseReplication.js';
import logger from './logger.js';

// Import metrics recording function - use lazy loading to avoid circular dependency
let recordDbQuery = null;
async function getMetrics() {
  if (!recordDbQuery) {
    try {
      const metrics = await import('../middleware/metrics.js');
      recordDbQuery = metrics.recordDbQuery;
    } catch (_error) {
      // Metrics not available yet, use noop
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentional noop for lazy loading
      recordDbQuery = () => {};
    }
  }
  return recordDbQuery;
}

class Database {
  constructor() {
    this.db = null;
    this.isSQLite = true;
    this.replication = replication;
  }

  /**
   * Initialize database connection based on environment variables.
   * SQLite is used by default; MySQL is used when MYSQL_HOST is set.
   * Optionally initializes read replicas if configured.
   */
  async connect() {
    const dbPath = process.env.NOTES_DB_PATH;
    const mysqlHost = process.env.MYSQL_HOST;

    // SQLite takes priority if NOTES_DB_PATH is set
    if (dbPath && !mysqlHost) {
      // Resolve path relative to project root
      const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
      await this.connectSQLite(resolvedPath);
      // Initialize SQLite replication if enabled
      await this.replication.initialize(this.db, true);
      return this.db;
    }

    // MySQL if MYSQL_HOST is set
    if (mysqlHost) {
      await this.connectMySQL();
      // Initialize MySQL replication if enabled
      await this.replication.initialize(this.db, false);
      return this.db;
    }

    // Default to SQLite in project root's data folder
    const defaultPath = path.resolve(process.cwd(), 'data', 'notes.db');
    await this.connectSQLite(defaultPath);
    // Initialize SQLite replication if enabled
    await this.replication.initialize(this.db, true);
    return this.db;
  }

  /**
   * Connect to SQLite database.
   */
  async connectSQLite(dbPath) {
    const Database = (await import('better-sqlite3')).default;

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.isSQLite = true;

    logger.info(`📦 Connected to SQLite database: ${dbPath}`);
    return this.db;
  }

  /**
   * Connect to MySQL database.
   */
  async connectMySQL() {
    const mysql = (await import('mysql2/promise')).default;

    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'notehub',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    // Disable SSL for local/Docker connections
    const sslDisabled =
      process.env.MYSQL_SSL_DISABLED === 'true' ||
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

    logger.info(`🐬 Connected to MySQL database: ${config.host}:${config.port}/${config.database}`);
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
        hidden_notes TEXT,
        preferred_language TEXT DEFAULT 'en',
        totp_secret TEXT,
        is_admin INTEGER DEFAULT 0,
        is_locked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        status TEXT DEFAULT 'online'
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

      -- Folders table
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        description TEXT,
        icon TEXT DEFAULT 'folder',
        color TEXT DEFAULT '#3B82F6',
        position INTEGER DEFAULT 0,
        is_expanded INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_folders_user_parent ON folders(user_id, parent_id);

      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT 'Untitled',
        body TEXT DEFAULT '',
        images TEXT,
        pinned INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0,
        favorite INTEGER DEFAULT 0,
        owner_id INTEGER,
        folder_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
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
        images TEXT,
        completed INTEGER DEFAULT 0,
        due_date DATETIME,
        priority TEXT DEFAULT 'medium',
        owner_id INTEGER NOT NULL,
        folder_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS ix_tasks_owner ON tasks(owner_id);

      -- Task sharing table (Phase 2: Task Collaboration)
      CREATE TABLE IF NOT EXISTS share_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        shared_by_id INTEGER NOT NULL,
        shared_with_id INTEGER NOT NULL,
        can_edit INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_by_id) REFERENCES users(id),
        FOREIGN KEY (shared_with_id) REFERENCES users(id),
        UNIQUE(task_id, shared_with_id)
      );
      CREATE INDEX IF NOT EXISTS ix_share_tasks_task ON share_tasks(task_id);
      CREATE INDEX IF NOT EXISTS ix_share_tasks_shared_with ON share_tasks(shared_with_id);

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

      -- Refresh tokens table
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        expires_at DATETIME NOT NULL,
        revoked INTEGER DEFAULT 0,
        revoked_at DATETIME,
        parent_token_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS ix_refresh_tokens_hash ON refresh_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires ON refresh_tokens(expires_at);

      -- WebAuthn credentials table for passkey authentication
      CREATE TABLE IF NOT EXISTS webauthn_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        transports TEXT,
        device_name TEXT,
        aaguid TEXT,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS ix_webauthn_user ON webauthn_credentials(user_id);
      CREATE INDEX IF NOT EXISTS ix_webauthn_credential ON webauthn_credentials(credential_id);

      -- Audit logs table for compliance and security monitoring
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        action TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS ix_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS ix_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS ix_audit_logs_created ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);

      -- Chat rooms table
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        is_group INTEGER DEFAULT 0,
        created_by_id INTEGER NOT NULL,
        encryption_salt TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS ix_chat_rooms_created_by ON chat_rooms(created_by_id);

      -- Chat messages table
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        photo_url TEXT,
        is_encrypted INTEGER DEFAULT 0,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS ix_chat_messages_room ON chat_messages(room_id);
      CREATE INDEX IF NOT EXISTS ix_chat_messages_sender ON chat_messages(sender_id);

      -- Chat participants table
      CREATE TABLE IF NOT EXISTS chat_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(room_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS ix_chat_participants_room ON chat_participants(room_id);
      CREATE INDEX IF NOT EXISTS ix_chat_participants_user ON chat_participants(user_id);
    `;

    // Execute each statement separately for SQLite
    const statements = schema.split(';').filter((s) => s.trim());
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
        if (columns.some((col) => col.name === 'updated_at')) {
          tablesToTrigger.push(table);
        }
      } catch (_error) {
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
      } catch (_error) {
        // Trigger creation failed, migration will handle it
      }
    }

    // Auto-migration: Add is_admin and is_locked columns if they don't exist
    try {
      const userColumns = this.db.prepare('PRAGMA table_info(users)').all();
      const hasIsAdmin = userColumns.some((col) => col.name === 'is_admin');
      const hasIsLocked = userColumns.some((col) => col.name === 'is_locked');

      if (!hasIsAdmin) {
        logger.info('  🔄 Migrating: Adding is_admin column to users table...');
        this.db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
        // Set admin user to is_admin = 1
        this.db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run('admin');
        logger.info('  ✅ Migration: is_admin column added');
      }

      if (!hasIsLocked) {
        logger.info('  🔄 Migrating: Adding is_locked column to users table...');
        this.db.exec('ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0');
        logger.info('  ✅ Migration: is_locked column added');
      }

      const hasStatus = userColumns.some((col) => col.name === 'status');
      if (!hasStatus) {
        logger.info('  🔄 Migrating: Adding status column to users table...');
        this.db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'online'");
        logger.info('  ✅ Migration: status column added');
      }

      const hasAvatarUrl = userColumns.some((col) => col.name === 'avatar_url');
      if (!hasAvatarUrl) {
        logger.info('  🔄 Migrating: Adding avatar_url column to users table...');
        this.db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL');
        logger.info('  ✅ Migration: avatar_url column added');
      }
    } catch (error) {
      logger.warn('  ⚠️  Auto-migration warning:', error.message);
      // Non-fatal: schema might already be up-to-date
    }

    // Auto-migration: Add folder_id columns to notes and tasks if they don't exist
    try {
      const notesColumns = this.db.prepare('PRAGMA table_info(notes)').all();
      const hasFolderId = notesColumns.some((col) => col.name === 'folder_id');

      if (!hasFolderId) {
        logger.info('  🔄 Migrating: Adding folder_id column to notes table...');
        this.db.exec('ALTER TABLE notes ADD COLUMN folder_id INTEGER DEFAULT NULL');
        logger.info('  ✅ Migration: folder_id column added to notes');
      }

      // Add indexes for folder_id if they don't exist
      try {
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id)');
        this.db.exec(
          'CREATE INDEX IF NOT EXISTS idx_notes_user_folder ON notes(owner_id, folder_id)',
        );
      } catch (indexError) {
        logger.warn('  ⚠️  Could not create notes folder indexes:', indexError.message);
      }
    } catch (error) {
      logger.warn('  ⚠️  Auto-migration warning (notes):', error.message);
    }

    try {
      const tasksColumns = this.db.prepare('PRAGMA table_info(tasks)').all();
      const hasFolderId = tasksColumns.some((col) => col.name === 'folder_id');

      if (!hasFolderId) {
        logger.info('  🔄 Migrating: Adding folder_id column to tasks table...');
        this.db.exec('ALTER TABLE tasks ADD COLUMN folder_id INTEGER DEFAULT NULL');
        logger.info('  ✅ Migration: folder_id column added to tasks');
      }

      // Add indexes for folder_id if they don't exist
      try {
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_folder ON tasks(folder_id)');
        this.db.exec(
          'CREATE INDEX IF NOT EXISTS idx_tasks_user_folder ON tasks(owner_id, folder_id)',
        );
      } catch (indexError) {
        logger.warn('  ⚠️  Could not create tasks folder indexes:', indexError.message);
      }
    } catch (error) {
      logger.warn('  ⚠️  Auto-migration warning (tasks):', error.message);
    }

    logger.info('✅ SQLite schema initialized');
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
        hidden_notes TEXT,
        preferred_language VARCHAR(10) DEFAULT 'en',
        totp_secret VARCHAR(32),
        is_admin TINYINT DEFAULT 0,
        is_locked TINYINT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login DATETIME,
        status VARCHAR(20) DEFAULT 'online',
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

      -- Folders table
      CREATE TABLE IF NOT EXISTS folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        user_id INT NOT NULL,
        parent_id INT DEFAULT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'folder',
        color VARCHAR(20) DEFAULT '#3B82F6',
        position INT DEFAULT 0,
        is_expanded TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
        INDEX idx_folders_user (user_id),
        INDEX idx_folders_parent (parent_id),
        INDEX idx_folders_user_parent (user_id, parent_id),
        UNIQUE KEY idx_folders_unique_name (user_id, name, parent_id)
      );

      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL DEFAULT 'Untitled',
        body TEXT,
        images TEXT,
        pinned BOOLEAN DEFAULT FALSE,
        archived BOOLEAN DEFAULT FALSE,
        favorite BOOLEAN DEFAULT FALSE,
        owner_id INT,
        folder_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_notes_owner (owner_id),
        INDEX ix_notes_archived (archived),
        INDEX idx_notes_folder (folder_id),
        INDEX idx_notes_user_folder (owner_id, folder_id),
        INDEX ix_notes_owner_archived (owner_id, archived),
        INDEX ix_notes_owner_favorite (owner_id, favorite),
        INDEX ix_notes_owner_pinned_updated (owner_id, pinned, updated_at),
        INDEX ix_notes_updated_at (updated_at),
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
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
        images TEXT,
        completed BOOLEAN DEFAULT FALSE,
        due_date DATETIME,
        priority VARCHAR(20) DEFAULT 'medium',
        owner_id INT NOT NULL,
        folder_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_tasks_owner (owner_id),
        INDEX idx_tasks_folder (folder_id),
        INDEX idx_tasks_user_folder (owner_id, folder_id),
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      );

      -- Task sharing table (Phase 2: Task Collaboration)
      CREATE TABLE IF NOT EXISTS share_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        shared_by_id INT NOT NULL,
        shared_with_id INT NOT NULL,
        can_edit BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_share_tasks_task (task_id),
        INDEX ix_share_tasks_shared_with (shared_with_id),
        UNIQUE KEY uk_task_shared_with (task_id, shared_with_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_by_id) REFERENCES users(id),
        FOREIGN KEY (shared_with_id) REFERENCES users(id)
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

      -- Refresh tokens table
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        device_info VARCHAR(255),
        ip_address VARCHAR(45),
        expires_at DATETIME NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_at DATETIME,
        parent_token_hash VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_used_at DATETIME,
        INDEX ix_refresh_tokens_user (user_id),
        INDEX ix_refresh_tokens_hash (token_hash),
        INDEX ix_refresh_tokens_expires (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- WebAuthn credentials table for passkey authentication
      CREATE TABLE IF NOT EXISTS webauthn_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        credential_id VARCHAR(512) UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter INT NOT NULL DEFAULT 0,
        transports TEXT,
        device_name VARCHAR(255),
        aaguid VARCHAR(36),
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_webauthn_user (user_id),
        INDEX ix_webauthn_credential (credential_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Audit logs table for compliance and security monitoring
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT,
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX ix_audit_logs_user (user_id),
        INDEX ix_audit_logs_entity (entity_type, entity_id),
        INDEX ix_audit_logs_created (created_at),
        INDEX ix_audit_logs_action (action),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Chat rooms table
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200),
        is_group BOOLEAN DEFAULT FALSE,
        created_by_id INT NOT NULL,
        encryption_salt VARCHAR(64),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_chat_rooms_created_by (created_by_id),
        FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Chat messages table
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        photo_url TEXT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_chat_messages_room (room_id),
        INDEX ix_chat_messages_sender (sender_id),
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id)
      );

      -- Chat participants table
      CREATE TABLE IF NOT EXISTS chat_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_chat_participants_room (room_id),
        INDEX ix_chat_participants_user (user_id),
        UNIQUE KEY unique_room_user (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    // Execute each statement separately for MySQL
    const statements = schema.split(';').filter((s) => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.db.execute(statement);
      }
    }

    // Auto-migration: Add is_admin and is_locked columns if they don't exist
    try {
      const [adminColumn] = await this.db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'`,
        [process.env.MYSQL_DATABASE || 'notehub'],
      );

      const [lockedColumn] = await this.db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_locked'`,
        [process.env.MYSQL_DATABASE || 'notehub'],
      );

      if (adminColumn.length === 0) {
        logger.info('  🔄 Migrating: Adding is_admin column to users table...');
        await this.db.query('ALTER TABLE users ADD COLUMN is_admin TINYINT DEFAULT 0');
        // Set admin user to is_admin = 1
        await this.db.query('UPDATE users SET is_admin = 1 WHERE username = ?', ['admin']);
        logger.info('  ✅ Migration: is_admin column added');
      }

      if (lockedColumn.length === 0) {
        logger.info('  🔄 Migrating: Adding is_locked column to users table...');
        await this.db.query('ALTER TABLE users ADD COLUMN is_locked TINYINT DEFAULT 0');
        logger.info('  ✅ Migration: is_locked column added');
      }
    } catch (error) {
      logger.warn('  ⚠️  Auto-migration warning:', error.message);
      // Non-fatal: schema might already be up-to-date
    }

    // Auto-migration: Add folder_id columns to notes and tasks if they don't exist
    try {
      const [notesFolderColumn] = await this.db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'folder_id'`,
        [process.env.MYSQL_DATABASE || 'notehub'],
      );

      if (notesFolderColumn.length === 0) {
        logger.info('  🔄 Migrating: Adding folder_id column to notes table...');
        await this.db.query('ALTER TABLE notes ADD COLUMN folder_id INT DEFAULT NULL');
        logger.info('  ✅ Migration: folder_id column added to notes');
      }

      // Add indexes for folder_id
      try {
        await this.db.query('CREATE INDEX idx_notes_folder ON notes(folder_id)');
        await this.db.query('CREATE INDEX idx_notes_user_folder ON notes(owner_id, folder_id)');
      } catch (_indexError) {
        // Index might already exist, ignore error
        logger.debug('Notes folder indexes already exist or could not be created');
      }
    } catch (error) {
      logger.warn('  ⚠️  Auto-migration warning (notes):', error.message);
    }

    try {
      const [tasksFolderColumn] = await this.db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'folder_id'`,
        [process.env.MYSQL_DATABASE || 'notehub'],
      );

      if (tasksFolderColumn.length === 0) {
        logger.info('  🔄 Migrating: Adding folder_id column to tasks table...');
        await this.db.query('ALTER TABLE tasks ADD COLUMN folder_id INT DEFAULT NULL');
        logger.info('  ✅ Migration: folder_id column added to tasks');
      }

      // Add indexes for folder_id
      try {
        await this.db.query('CREATE INDEX idx_tasks_folder ON tasks(folder_id)');
        await this.db.query('CREATE INDEX idx_tasks_user_folder ON tasks(owner_id, folder_id)');
      } catch (_indexError) {
        // Index might already exist, ignore error
        logger.debug('Tasks folder indexes already exist or could not be created');
      }
    } catch (error) {
      logger.warn('  ⚠️  Auto-migration warning (tasks):', error.message);
    }

    logger.info('✅ MySQL schema initialized');
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
        const hasUpdatedAt = columns.some((col) => col.name === 'updated_at');
        const createdAtCol = columns.find((col) => col.name === 'created_at');

        // Check if created_at has problematic NOT NULL constraint without default
        // If notnull=1 and dflt_value is NULL, it means NOT NULL without DEFAULT
        const hasProblematicCreatedAt =
          createdAtCol &&
          createdAtCol.notnull === 1 &&
          (createdAtCol.dflt_value === null || createdAtCol.dflt_value === undefined);

        if (hasProblematicCreatedAt) {
          logger.info(`🔄 Migrating ${displayName} table: fixing created_at constraint`);
          // Need to rebuild the table to remove NOT NULL constraint or add DEFAULT
          // This is the SQLite way to modify column constraints
          this.rebuildTableWithFixedTimestamps(tableName, columns);
          return; // Table rebuilt, no need for further column additions
        }

        // Add updated_at column if missing
        if (!hasUpdatedAt) {
          logger.info(`🔄 Migrating ${displayName} table: adding updated_at column`);
          // Add column without DEFAULT (SQLite limitation)
          this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN updated_at DATETIME`);
          // Set initial value for existing rows
          this.db.exec(
            `UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`,
          );

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

      // Helper function to add images column if missing
      const addImagesColumn = (tableName, displayName) => {
        // Validate table name against whitelist to prevent SQL injection
        const allowedTables = ['notes', 'tasks'];
        if (!allowedTables.includes(tableName)) {
          throw new Error(`Invalid table name for images column migration: ${tableName}`);
        }

        const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        const hasImages = columns.some((col) => col.name === 'images');

        if (!hasImages) {
          logger.info(`🔄 Migrating ${displayName} table: adding images column`);
          this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN images TEXT`);
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
      fixTimestampColumns('refresh_tokens', 'refresh_tokens');
      fixTimestampColumns('webauthn_credentials', 'webauthn_credentials');

      // Add images column to notes and tasks tables if missing
      addImagesColumn('notes', 'notes');
      addImagesColumn('tasks', 'tasks');

      // Add hidden_notes column to users table if missing
      const userColumns = this.db.prepare(`PRAGMA table_info(users)`).all();
      const hasHiddenNotes = userColumns.some((col) => col.name === 'hidden_notes');
      if (!hasHiddenNotes) {
        logger.info('🔄 Migrating users table: adding hidden_notes column');
        this.db.exec(`ALTER TABLE users ADD COLUMN hidden_notes TEXT`);
      }

      // Add preferred_language column to users table if missing
      const hasPreferredLanguage = userColumns.some((col) => col.name === 'preferred_language');
      if (!hasPreferredLanguage) {
        logger.info('🔄 Migrating users table: adding preferred_language column');
        this.db.exec(`ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en'`);
      }

      logger.info('✅ SQLite schema migration completed');
    } catch (error) {
      logger.error('⚠️ SQLite migration error (non-fatal):', error.message);
    }
  }

  /**
   * Rebuild a table with fixed timestamp constraints.
   * This is necessary because SQLite doesn't allow modifying column constraints.
   */
  rebuildTableWithFixedTimestamps(tableName, columns) {
    // Get table's creation SQL to understand its structure
    const tableInfo = this.db
      .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);

    if (!tableInfo) return;

    // Create a temporary table with fixed constraints
    const tempTableName = `${tableName}_migration_temp`;

    // Build new table definition with fixed timestamps
    const columnDefs = columns
      .map((col) => {
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
      })
      .join(', ');

    // Add updated_at if it doesn't exist
    const hasUpdatedAt = columns.some((col) => col.name === 'updated_at');
    const finalColumnDefs = hasUpdatedAt
      ? columnDefs
      : `${columnDefs}, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`;

    // Get list of existing triggers to drop
    const existingTriggers = this.db
      .prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name=?`)
      .all(tableName);

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
      const selectColumns = columns.map((c) => c.name).join(', ');
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

    logger.info(`  ✓ Rebuilt ${tableName} table with fixed timestamp constraints`);
  }

  /**
   * Migrate MySQL schema - add missing columns to existing tables.
   */
  async migrateMySQLSchema() {
    try {
      // Helper function to check and add missing column in MySQL
      const addColumnIfMissing = async (tableName, columnName, displayName) => {
        // Validate table name and column name against whitelists to prevent SQL injection
        const allowedTables = [
          'users',
          'tags',
          'notes',
          'tasks',
          'share_notes',
          'password_reset_tokens',
          'invitations',
        ];
        const allowedColumns = {
          updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
          images: 'TEXT',
          hidden_notes: 'TEXT',
          preferred_language: "VARCHAR(10) DEFAULT 'en'",
          status: "VARCHAR(20) DEFAULT 'online'",
          avatar_url: 'TEXT',
        };

        if (!allowedTables.includes(tableName)) {
          throw new Error(`Invalid table name for migration: ${tableName}`);
        }
        if (!allowedColumns[columnName]) {
          throw new Error(`Invalid column name for migration: ${columnName}`);
        }

        const [columns] = await this.db.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}'`,
        );
        const hasColumn = columns.some((col) => col.COLUMN_NAME === columnName);

        if (!hasColumn) {
          logger.info(`🔄 Migrating ${displayName} table: adding ${columnName} column`);
          // Use predefined column definition from whitelist
          const columnDef = allowedColumns[columnName];
          await this.db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
        }
      };

      // Add missing updated_at columns to tables
      await addColumnIfMissing('users', 'updated_at', 'users');
      await addColumnIfMissing('tags', 'updated_at', 'tags');
      await addColumnIfMissing('share_notes', 'updated_at', 'share_notes');
      await addColumnIfMissing('password_reset_tokens', 'updated_at', 'password_reset_tokens');
      await addColumnIfMissing('invitations', 'updated_at', 'invitations');

      // Add missing images columns to notes and tasks tables
      await addColumnIfMissing('notes', 'images', 'notes');
      await addColumnIfMissing('tasks', 'images', 'tasks');

      // Add missing hidden_notes column to users table
      await addColumnIfMissing('users', 'hidden_notes', 'users');

      // Add missing preferred_language column to users table
      await addColumnIfMissing('users', 'preferred_language', 'users');

      // Add missing status column to users table
      await addColumnIfMissing('users', 'status', 'users');

      // Add missing avatar_url column to users table
      await addColumnIfMissing('users', 'avatar_url', 'users');

      logger.info('✅ MySQL schema migration completed');
    } catch (error) {
      logger.error('⚠️ MySQL migration error (non-fatal):', error.message);
    }
  }

  /**
   * Execute a query with parameters.
   * Routes read queries to replicas if replication is enabled.
   */
  async query(sql, params = []) {
    const startTime = Date.now();
    const operation = sql.trim().split(/\s+/)[0].toUpperCase(); // Extract operation (SELECT, INSERT, etc.)
    let success = true;

    try {
      // Use replication for SELECT queries if enabled
      if (this.replication.isEnabled() && operation === 'SELECT') {
        const result = await this.replication.query(sql, params);
        return result;
      }

      // Otherwise use primary connection
      let result;
      if (this.isSQLite) {
        result = this.db.prepare(sql).all(...params);
      } else {
        const [rows] = await this.db.execute(sql, params);
        result = rows;
      }
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      // Record metrics
      const duration = Date.now() - startTime;
      const recordMetrics = await getMetrics();
      recordMetrics(operation, duration, success);
    }
  }

  /**
   * Execute a single query and return one row.
   * Routes read queries to replicas if replication is enabled.
   */
  async queryOne(sql, params = []) {
    const startTime = Date.now();
    const operation = sql.trim().split(/\s+/)[0].toUpperCase(); // Extract operation (SELECT, INSERT, etc.)
    let success = true;

    try {
      // Use replication for SELECT queries if enabled
      if (this.replication.isEnabled() && operation === 'SELECT') {
        const result = await this.replication.queryOne(sql, params);
        return result;
      }

      // Otherwise use primary connection
      let result;
      if (this.isSQLite) {
        result = this.db.prepare(sql).get(...params);
      } else {
        const [rows] = await this.db.execute(sql, params);
        result = rows[0];
      }
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      // Record metrics
      const duration = Date.now() - startTime;
      const recordMetrics = await getMetrics();
      recordMetrics(operation, duration, success);
    }
  }

  /**
   * Run an insert/update/delete query.
   */
  async run(sql, params = []) {
    const startTime = Date.now();
    const operation = sql.trim().split(/\s+/)[0].toUpperCase(); // Extract operation (INSERT, UPDATE, DELETE)
    let success = true;

    try {
      let result;
      if (this.isSQLite) {
        const runResult = this.db.prepare(sql).run(...params);
        result = { insertId: runResult.lastInsertRowid, affectedRows: runResult.changes };
      } else {
        const [execResult] = await this.db.execute(sql, params);
        result = { insertId: execResult.insertId, affectedRows: execResult.affectedRows };
      }
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      // Record metrics
      const duration = Date.now() - startTime;
      const recordMetrics = await getMetrics();
      recordMetrics(operation, duration, success);
    }
  }

  /**
   * Get replication status.
   */
  getReplicationStatus() {
    return this.replication.getStatus();
  }

  /**
   * Get database connection pool metrics.
   * Returns pool statistics for MySQL or null for SQLite.
   *
   * Note: mysql2 library doesn't expose public APIs for active/idle connection counts.
   * We only report the configured pool size limit.
   */
  getPoolMetrics() {
    if (this.isSQLite || !this.db || !this.db.pool) {
      return null;
    }

    // MySQL pool statistics
    try {
      const pool = this.db.pool;
      // mysql2 only exposes config.connectionLimit in public API
      const total = pool.config?.connectionLimit || 10;

      // Return basic metrics - active/idle counts not available via public API
      return {
        active: 0, // Not available in mysql2 public API
        idle: 0, // Not available in mysql2 public API
        total: total,
      };
    } catch (_error) {
      return null;
    }
  }

  /**
   * Close the database connection and all replicas.
   */
  async close() {
    // Close replication connections first
    await this.replication.close();

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

export default database;
