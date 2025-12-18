/**
 * Database Migration System
 *
 * Centralized migration registry for automatic database schema updates.
 * Supports both SQLite and MySQL with idempotent migrations.
 *
 * Key Features:
 * - Version tracking with migration history table
 * - Idempotent migrations (safe to run multiple times)
 * - Support for both SQLite and MySQL
 * - Comprehensive schema verification
 * - Easy to add new migrations
 */

import logger from './logger.js';

/**
 * Migration registry - add new migrations here
 * Each migration should be idempotent and include:
 * - id: unique migration identifier (timestamp recommended)
 * - description: human-readable description
 * - sqlite: function to apply migration to SQLite
 * - mysql: function to apply migration to MySQL
 */
const MIGRATIONS = [
  {
    id: '001_add_user_admin_fields',
    description: 'Add is_admin and is_locked columns to users table',
    async sqlite(db) {
      const columns = db.prepare('PRAGMA table_info(users)').all();
      const hasIsAdmin = columns.some((col) => col.name === 'is_admin');
      const hasIsLocked = columns.some((col) => col.name === 'is_locked');

      if (!hasIsAdmin) {
        logger.info('  🔄 Adding is_admin column to users table...');
        db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
        db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run('admin');
        logger.info('  ✅ is_admin column added');
      }

      if (!hasIsLocked) {
        logger.info('  🔄 Adding is_locked column to users table...');
        db.exec('ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0');
        logger.info('  ✅ is_locked column added');
      }
    },
    async mysql(db) {
      const database = process.env.MYSQL_DATABASE || 'notehub';

      const [adminColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'`,
        [database],
      );

      const [lockedColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_locked'`,
        [database],
      );

      if (adminColumn.length === 0) {
        logger.info('  🔄 Adding is_admin column to users table...');
        await db.run('ALTER TABLE users ADD COLUMN is_admin TINYINT DEFAULT 0');
        await db.run('UPDATE users SET is_admin = 1 WHERE username = ?', ['admin']);
        logger.info('  ✅ is_admin column added');
      }

      if (lockedColumn.length === 0) {
        logger.info('  🔄 Adding is_locked column to users table...');
        await db.run('ALTER TABLE users ADD COLUMN is_locked TINYINT DEFAULT 0');
        logger.info('  ✅ is_locked column added');
      }
    },
  },
  {
    id: '002_add_user_status_field',
    description: 'Add status column to users table',
    async sqlite(db) {
      const columns = db.prepare('PRAGMA table_info(users)').all();
      const hasStatus = columns.some((col) => col.name === 'status');

      if (!hasStatus) {
        logger.info('  🔄 Adding status column to users table...');
        db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'online'");
        logger.info('  ✅ status column added');
      }
    },
    async mysql(db) {
      const database = process.env.MYSQL_DATABASE || 'notehub';

      const [statusColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'`,
        [database],
      );

      if (statusColumn.length === 0) {
        logger.info('  🔄 Adding status column to users table...');
        await db.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'online'");
        logger.info('  ✅ status column added');
      }
    },
  },
  {
    id: '003_add_user_avatar_url',
    description: 'Add avatar_url column to users table',
    async sqlite(db) {
      const columns = db.prepare('PRAGMA table_info(users)').all();
      const hasAvatarUrl = columns.some((col) => col.name === 'avatar_url');

      if (!hasAvatarUrl) {
        logger.info('  🔄 Adding avatar_url column to users table...');
        db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL');
        logger.info('  ✅ avatar_url column added');
      }
    },
    async mysql(db) {
      const database = process.env.MYSQL_DATABASE || 'notehub';

      const [avatarColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'`,
        [database],
      );

      if (avatarColumn.length === 0) {
        logger.info('  🔄 Adding avatar_url column to users table...');
        await db.run('ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL');
        logger.info('  ✅ avatar_url column added');
      }
    },
  },
  {
    id: '004_add_folder_support',
    description: 'Add folder_id columns to notes and tasks tables',
    async sqlite(db) {
      // Add folder_id to notes
      const notesColumns = db.prepare('PRAGMA table_info(notes)').all();
      const noteHasFolderId = notesColumns.some((col) => col.name === 'folder_id');

      if (!noteHasFolderId) {
        logger.info('  🔄 Adding folder_id column to notes table...');
        db.exec('ALTER TABLE notes ADD COLUMN folder_id INTEGER DEFAULT NULL');
        logger.info('  ✅ folder_id column added to notes');
      }

      // Add indexes for notes.folder_id
      try {
        db.exec('CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_notes_user_folder ON notes(owner_id, folder_id)');
      } catch (_error) {
        logger.debug('Notes folder indexes already exist or could not be created');
      }

      // Add folder_id to tasks
      const tasksColumns = db.prepare('PRAGMA table_info(tasks)').all();
      const taskHasFolderId = tasksColumns.some((col) => col.name === 'folder_id');

      if (!taskHasFolderId) {
        logger.info('  🔄 Adding folder_id column to tasks table...');
        db.exec('ALTER TABLE tasks ADD COLUMN folder_id INTEGER DEFAULT NULL');
        logger.info('  ✅ folder_id column added to tasks');
      }

      // Add indexes for tasks.folder_id
      try {
        db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_folder ON tasks(folder_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_user_folder ON tasks(owner_id, folder_id)');
      } catch (_error) {
        logger.debug('Tasks folder indexes already exist or could not be created');
      }
    },
    async mysql(db) {
      const database = process.env.MYSQL_DATABASE || 'notehub';

      // Add folder_id to notes
      const [notesFolderColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'folder_id'`,
        [database],
      );

      if (notesFolderColumn.length === 0) {
        logger.info('  🔄 Adding folder_id column to notes table...');
        await db.run('ALTER TABLE notes ADD COLUMN folder_id INT DEFAULT NULL');
        logger.info('  ✅ folder_id column added to notes');
      }

      // Add indexes for notes.folder_id
      try {
        await db.query('CREATE INDEX idx_notes_folder ON notes(folder_id)');
        await db.query('CREATE INDEX idx_notes_user_folder ON notes(owner_id, folder_id)');
      } catch (_error) {
        logger.debug('Notes folder indexes already exist or could not be created');
      }

      // Add folder_id to tasks
      const [tasksFolderColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'folder_id'`,
        [database],
      );

      if (tasksFolderColumn.length === 0) {
        logger.info('  🔄 Adding folder_id column to tasks table...');
        await db.run('ALTER TABLE tasks ADD COLUMN folder_id INT DEFAULT NULL');
        logger.info('  ✅ folder_id column added to tasks');
      }

      // Add indexes for tasks.folder_id
      try {
        await db.query('CREATE INDEX idx_tasks_folder ON tasks(folder_id)');
        await db.query('CREATE INDEX idx_tasks_user_folder ON tasks(owner_id, folder_id)');
      } catch (_error) {
        logger.debug('Tasks folder indexes already exist or could not be created');
      }
    },
  },
  {
    id: '005_add_images_columns',
    description: 'Add images column to notes and tasks tables',
    async sqlite(db) {
      // Add images to notes
      const notesColumns = db.prepare('PRAGMA table_info(notes)').all();
      const noteHasImages = notesColumns.some((col) => col.name === 'images');

      if (!noteHasImages) {
        logger.info('  🔄 Adding images column to notes table...');
        db.exec('ALTER TABLE notes ADD COLUMN images TEXT');
        logger.info('  ✅ images column added to notes');
      }

      // Add images to tasks
      const tasksColumns = db.prepare('PRAGMA table_info(tasks)').all();
      const taskHasImages = tasksColumns.some((col) => col.name === 'images');

      if (!taskHasImages) {
        logger.info('  🔄 Adding images column to tasks table...');
        db.exec('ALTER TABLE tasks ADD COLUMN images TEXT');
        logger.info('  ✅ images column added to tasks');
      }
    },
    async mysql(db) {
      const database = process.env.MYSQL_DATABASE || 'notehub';

      // Add images to notes
      const [notesImagesColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'images'`,
        [database],
      );

      if (notesImagesColumn.length === 0) {
        logger.info('  🔄 Adding images column to notes table...');
        await db.run('ALTER TABLE notes ADD COLUMN images TEXT');
        logger.info('  ✅ images column added to notes');
      }

      // Add images to tasks
      const [tasksImagesColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'images'`,
        [database],
      );

      if (tasksImagesColumn.length === 0) {
        logger.info('  🔄 Adding images column to tasks table...');
        await db.run('ALTER TABLE tasks ADD COLUMN images TEXT');
        logger.info('  ✅ images column added to tasks');
      }
    },
  },
  {
    id: '006_add_user_preferences',
    description: 'Add hidden_notes and preferred_language columns to users table',
    async sqlite(db) {
      const columns = db.prepare('PRAGMA table_info(users)').all();
      const hasHiddenNotes = columns.some((col) => col.name === 'hidden_notes');
      const hasPreferredLanguage = columns.some((col) => col.name === 'preferred_language');

      if (!hasHiddenNotes) {
        logger.info('  🔄 Adding hidden_notes column to users table...');
        db.exec('ALTER TABLE users ADD COLUMN hidden_notes TEXT');
        logger.info('  ✅ hidden_notes column added');
      }

      if (!hasPreferredLanguage) {
        logger.info('  🔄 Adding preferred_language column to users table...');
        db.exec("ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en'");
        logger.info('  ✅ preferred_language column added');
      }
    },
    async mysql(db) {
      const database = process.env.MYSQL_DATABASE || 'notehub';

      const [hiddenNotesColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'hidden_notes'`,
        [database],
      );

      if (hiddenNotesColumn.length === 0) {
        logger.info('  🔄 Adding hidden_notes column to users table...');
        await db.run('ALTER TABLE users ADD COLUMN hidden_notes TEXT');
        logger.info('  ✅ hidden_notes column added');
      }

      const [preferredLanguageColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'preferred_language'`,
        [database],
      );

      if (preferredLanguageColumn.length === 0) {
        logger.info('  🔄 Adding preferred_language column to users table...');
        await db.query("ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en'");
        logger.info('  ✅ preferred_language column added');
      }
    },
  },
  {
    id: '007_add_chat_encryption',
    description: 'Add encryption_salt column to chat_rooms table',
    async sqlite(db) {
      const columns = db.prepare('PRAGMA table_info(chat_rooms)').all();
      const hasEncryptionSalt = columns.some((col) => col.name === 'encryption_salt');

      if (!hasEncryptionSalt) {
        logger.info('  🔄 Adding encryption_salt column to chat_rooms table...');
        db.exec('ALTER TABLE chat_rooms ADD COLUMN encryption_salt TEXT');
        logger.info('  ✅ encryption_salt column added');
      }
    },
    async mysql(db) {
      const database = process.env.MYSQL_DATABASE || 'notehub';

      const [encryptionSaltColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_rooms' AND COLUMN_NAME = 'encryption_salt'`,
        [database],
      );

      if (encryptionSaltColumn.length === 0) {
        logger.info('  🔄 Adding encryption_salt column to chat_rooms table...');
        await db.run('ALTER TABLE chat_rooms ADD COLUMN encryption_salt VARCHAR(64)');
        logger.info('  ✅ encryption_salt column added');
      }
    },
  },
  {
    id: '008_add_chat_message_features',
    description: 'Add photo_url and is_encrypted columns to chat_messages table',
    async sqlite(db) {
      const columns = db.prepare('PRAGMA table_info(chat_messages)').all();
      const hasPhotoUrl = columns.some((col) => col.name === 'photo_url');
      const hasIsEncrypted = columns.some((col) => col.name === 'is_encrypted');

      if (!hasPhotoUrl) {
        logger.info('  🔄 Adding photo_url column to chat_messages table...');
        db.exec('ALTER TABLE chat_messages ADD COLUMN photo_url TEXT');
        logger.info('  ✅ photo_url column added');
      }

      if (!hasIsEncrypted) {
        logger.info('  🔄 Adding is_encrypted column to chat_messages table...');
        db.exec('ALTER TABLE chat_messages ADD COLUMN is_encrypted INTEGER DEFAULT 1');
        logger.info('  ✅ is_encrypted column added');
      }
    },
    async mysql(db) {
      const database = process.env.MYSQL_DATABASE || 'notehub';

      const [photoUrlColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'photo_url'`,
        [database],
      );

      if (photoUrlColumn.length === 0) {
        logger.info('  🔄 Adding photo_url column to chat_messages table...');
        await db.run('ALTER TABLE chat_messages ADD COLUMN photo_url TEXT');
        logger.info('  ✅ photo_url column added');
      }

      const [isEncryptedColumn] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'is_encrypted'`,
        [database],
      );

      if (isEncryptedColumn.length === 0) {
        logger.info('  🔄 Adding is_encrypted column to chat_messages table...');
        await db.run('ALTER TABLE chat_messages ADD COLUMN is_encrypted BOOLEAN DEFAULT TRUE');
        logger.info('  ✅ is_encrypted column added');
      }
    },
  },
  {
    id: '20251215T155231_add_encryption_salt_column_to_chat_messages',
    description: 'add encryption_salt column to chat_messages',

    /**
     * Apply migration to SQLite database
     */
    async sqlite(db) {
      // Check if column/table exists
      const columns = db.prepare('PRAGMA table_info(chat_messages)').all();
      const hasColumn = columns.some((col) => col.name === 'encryption_salt');

      if (!hasColumn) {
        logger.info('  🔄 Adding encryption_salt to chat_messages...');
        db.exec('ALTER TABLE chat_messages ADD COLUMN encryption_salt TEXT');
        logger.info('  ✅ encryption_salt added');
      }
    },

    /**
     * Apply migration to MySQL database
     */
    async mysql(db) {
      const database = process.env.MYSQL_DATABASE || 'notehub';

      const [column] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'encryption_salt'`,
        [database],
      );

      if (column.length === 0) {
        logger.info('  🔄 Adding encryption_salt to chat_messages...');
        await db.run('ALTER TABLE chat_messages ADD COLUMN encryption_salt VARCHAR(64)');
        logger.info('  ✅ encryption_salt added');
      }
    },
  },
];

/**
 * Initialize migration history table
 */
async function initMigrationHistory(db, isSQLite) {
  if (isSQLite) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id VARCHAR(255) PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

/**
 * Check if migration has been applied
 */
async function isMigrationApplied(db, isSQLite, migrationId) {
  try {
    if (isSQLite) {
      const result = db.prepare('SELECT id FROM migration_history WHERE id = ?').get(migrationId);
      return !!result;
    }
    const [rows] = await db.execute('SELECT id FROM migration_history WHERE id = ?', [migrationId]);
    return rows.length > 0;
  } catch (_error) {
    // Table might not exist yet
    return false;
  }
}

/**
 * Mark migration as applied
 */
async function markMigrationApplied(db, isSQLite, migrationId, description) {
  if (isSQLite) {
    db.prepare('INSERT INTO migration_history (id, description) VALUES (?, ?)').run(
      migrationId,
      description,
    );
  } else {
    await db.execute('INSERT INTO migration_history (id, description) VALUES (?, ?)', [
      migrationId,
      description,
    ]);
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db, isSQLite) {
  try {
    logger.info('🔄 Starting database migrations...');

    // Initialize migration history table
    await initMigrationHistory(db, isSQLite);

    let appliedCount = 0;
    let skippedCount = 0;

    // Run each migration
    for (const migration of MIGRATIONS) {
      const applied = await isMigrationApplied(db, isSQLite, migration.id);

      if (applied) {
        skippedCount++;
        continue;
      }

      logger.info(`📝 Applying migration: ${migration.id} - ${migration.description}`);

      try {
        if (isSQLite) {
          await migration.sqlite(db);
        } else {
          await migration.mysql(db);
        }

        await markMigrationApplied(db, isSQLite, migration.id, migration.description);
        appliedCount++;
        logger.info(`✅ Migration ${migration.id} completed`);
      } catch (error) {
        logger.error(`❌ Migration ${migration.id} failed:`, error.message);
        throw error;
      }
    }

    if (appliedCount > 0) {
      logger.info(`✅ Applied ${appliedCount} migration(s), skipped ${skippedCount}`);
    } else {
      logger.info(`✅ All migrations up to date (${skippedCount} already applied)`);
    }
  } catch (error) {
    logger.error('❌ Migration system error:', error.message);
    throw error;
  }
}

/**
 * Get list of applied migrations
 */
export async function getAppliedMigrations(db, isSQLite) {
  try {
    if (isSQLite) {
      return db.prepare('SELECT * FROM migration_history ORDER BY applied_at').all();
    }
    const [rows] = await db.execute('SELECT * FROM migration_history ORDER BY applied_at');
    return rows;
  } catch (_error) {
    return [];
  }
}

/**
 * Get list of pending migrations
 */
export async function getPendingMigrations(db, isSQLite) {
  const applied = await getAppliedMigrations(db, isSQLite);
  const appliedIds = new Set(applied.map((m) => m.id));
  return MIGRATIONS.filter((m) => !appliedIds.has(m.id));
}

export default {
  runMigrations,
  getAppliedMigrations,
  getPendingMigrations,
};
