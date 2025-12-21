/**
 * Database Schema Verification Utility
 *
 * Provides comprehensive schema verification and validation.
 * Compares actual database schema against expected schema definition.
 */

import logger from './logger.js';

/**
 * Expected schema definition
 * This serves as the source of truth for the database structure
 */
const EXPECTED_SCHEMA = {
  users: {
    columns: [
      'id',
      'username',
      'password_hash',
      'email',
      'bio',
      'theme',
      'hidden_notes',
      'preferred_language',
      'totp_secret',
      'is_admin',
      'is_locked',
      'created_at',
      'updated_at',
      'last_login',
      'status',
      'avatar_url',
    ],
    indexes: ['ix_users_username', 'ix_users_email'],
  },
  tags: {
    columns: ['id', 'name', 'color', 'created_at', 'updated_at'],
    indexes: ['ix_tags_name'],
  },
  folders: {
    columns: [
      'id',
      'name',
      'user_id',
      'parent_id',
      'description',
      'icon',
      'color',
      'position',
      'is_expanded',
      'created_at',
      'updated_at',
    ],
    indexes: ['idx_folders_user', 'idx_folders_parent', 'idx_folders_user_parent'],
  },
  notes: {
    columns: [
      'id',
      'title',
      'body',
      'images',
      'pinned',
      'archived',
      'favorite',
      'owner_id',
      'folder_id',
      'created_at',
      'updated_at',
    ],
    indexes: [
      'ix_notes_owner',
      'ix_notes_archived',
      'idx_notes_folder',
      'idx_notes_user_folder',
      'ix_notes_owner_archived',
      'ix_notes_owner_favorite',
      'ix_notes_owner_pinned_updated',
      'ix_notes_updated_at',
    ],
  },
  note_tag: {
    columns: ['note_id', 'tag_id'],
    indexes: [],
  },
  share_notes: {
    columns: [
      'id',
      'note_id',
      'shared_by_id',
      'shared_with_id',
      'can_edit',
      'created_at',
      'updated_at',
    ],
    indexes: [],
  },
  tasks: {
    columns: [
      'id',
      'title',
      'description',
      'images',
      'completed',
      'due_date',
      'priority',
      'owner_id',
      'folder_id',
      'created_at',
      'updated_at',
    ],
    indexes: ['ix_tasks_owner', 'idx_tasks_folder', 'idx_tasks_user_folder'],
  },
  share_tasks: {
    columns: [
      'id',
      'task_id',
      'shared_by_id',
      'shared_with_id',
      'can_edit',
      'created_at',
      'updated_at',
    ],
    indexes: ['ix_share_tasks_task', 'ix_share_tasks_shared_with'],
  },
  public_note_shares: {
    columns: [
      'id',
      'note_id',
      'token',
      'created_by_id',
      'expires_at',
      'revoked_at',
      'created_at',
      'updated_at',
    ],
    indexes: ['ix_public_note_shares_note', 'ix_public_note_shares_token'],
  },
  public_task_shares: {
    columns: [
      'id',
      'task_id',
      'token',
      'created_by_id',
      'expires_at',
      'revoked_at',
      'created_at',
      'updated_at',
    ],
    indexes: ['ix_public_task_shares_task', 'ix_public_task_shares_token'],
  },
  password_reset_tokens: {
    columns: ['id', 'user_id', 'token', 'expires_at', 'used', 'created_at', 'updated_at'],
    indexes: ['ix_reset_tokens'],
  },
  invitations: {
    columns: [
      'id',
      'token',
      'inviter_id',
      'email',
      'message',
      'used',
      'used_by_id',
      'expires_at',
      'created_at',
      'updated_at',
    ],
    indexes: ['ix_invitations_token'],
  },
  refresh_tokens: {
    columns: [
      'id',
      'user_id',
      'token_hash',
      'device_info',
      'ip_address',
      'expires_at',
      'revoked',
      'revoked_at',
      'parent_token_hash',
      'created_at',
      'updated_at',
      'last_used_at',
    ],
    indexes: ['ix_refresh_tokens_user', 'ix_refresh_tokens_hash', 'ix_refresh_tokens_expires'],
  },
  webauthn_credentials: {
    columns: [
      'id',
      'user_id',
      'credential_id',
      'public_key',
      'counter',
      'transports',
      'device_name',
      'aaguid',
      'last_used_at',
      'created_at',
      'updated_at',
    ],
    indexes: ['ix_webauthn_user', 'ix_webauthn_credential'],
  },
  audit_logs: {
    columns: [
      'id',
      'user_id',
      'entity_type',
      'entity_id',
      'action',
      'ip_address',
      'user_agent',
      'metadata',
      'created_at',
    ],
    indexes: [
      'ix_audit_logs_user',
      'ix_audit_logs_entity',
      'ix_audit_logs_created',
      'ix_audit_logs_action',
    ],
  },
  chat_rooms: {
    columns: [
      'id',
      'name',
      'is_group',
      'created_by_id',
      'encryption_salt',
      'theme',
      'created_at',
      'updated_at',
    ],
    indexes: ['ix_chat_rooms_created_by'],
  },
  chat_messages: {
    columns: [
      'id',
      'room_id',
      'sender_id',
      'message',
      'photo_url',
      'is_encrypted',
      'is_read',
      'is_pinned',
      'pinned_at',
      'pinned_by_id',
      'sent_at',
      'delivered_at',
      'created_at',
      'updated_at',
    ],
    indexes: ['ix_chat_messages_room', 'ix_chat_messages_sender', 'idx_messages_pinned'],
  },
  chat_participants: {
    columns: ['id', 'room_id', 'user_id', 'last_read_at', 'created_at', 'updated_at'],
    indexes: ['ix_chat_participants_room', 'ix_chat_participants_user'],
  },
  chat_message_reactions: {
    columns: ['id', 'message_id', 'user_id', 'emoji', 'created_at'],
    indexes: ['idx_reactions_message', 'idx_reactions_user'],
  },
  chat_message_reads: {
    columns: ['id', 'message_id', 'user_id', 'read_at'],
    indexes: ['idx_reads_message', 'idx_reads_user'],
  },
  migration_history: {
    columns: ['id', 'description', 'applied_at'],
    indexes: [],
  },
};

/**
 * Get actual table columns from database
 */
async function getTableColumns(db, isSQLite, tableName) {
  try {
    if (isSQLite) {
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      return columns.map((col) => col.name);
    }
    const [columns] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [tableName],
    );
    return columns.map((col) => col.COLUMN_NAME);
  } catch (error) {
    logger.error(`Error getting columns for table ${tableName}:`, error.message);
    return [];
  }
}

/**
 * Get actual table indexes from database
 */
async function getTableIndexes(db, isSQLite, tableName) {
  try {
    if (isSQLite) {
      const indexes = db.prepare(`PRAGMA index_list(${tableName})`).all();
      return indexes.map((idx) => idx.name);
    }
    const [indexes] = await db.execute(
      `SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       AND INDEX_NAME != 'PRIMARY'`,
      [tableName],
    );
    return indexes.map((idx) => idx.INDEX_NAME);
  } catch (error) {
    logger.error(`Error getting indexes for table ${tableName}:`, error.message);
    return [];
  }
}

/**
 * Check if table exists in database
 */
async function tableExists(db, isSQLite, tableName) {
  try {
    if (isSQLite) {
      const result = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(tableName);
      return !!result;
    }
    const [tables] = await db.execute(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [tableName],
    );
    return tables.length > 0;
  } catch (error) {
    logger.error(`Error checking if table ${tableName} exists:`, error.message);
    return false;
  }
}

/**
 * Verify schema completeness
 * Returns report of missing tables, columns, and indexes
 */
export async function verifySchema(db, isSQLite) {
  logger.info('🔍 Verifying database schema...');

  const report = {
    missingTables: [],
    missingColumns: {},
    missingIndexes: {},
    extraColumns: {},
    allTablesPresent: true,
    allColumnsPresent: true,
    allIndexesPresent: true,
  };

  for (const [tableName, tableSpec] of Object.entries(EXPECTED_SCHEMA)) {
    // Check if table exists
    const exists = await tableExists(db, isSQLite, tableName);

    if (!exists) {
      report.missingTables.push(tableName);
      report.allTablesPresent = false;
      logger.warn(`  ⚠️  Missing table: ${tableName}`);
      continue;
    }

    // Check columns
    const actualColumns = await getTableColumns(db, isSQLite, tableName);
    const missingColumns = tableSpec.columns.filter((col) => !actualColumns.includes(col));
    const extraColumns = actualColumns.filter((col) => !tableSpec.columns.includes(col));

    if (missingColumns.length > 0) {
      report.missingColumns[tableName] = missingColumns;
      report.allColumnsPresent = false;
      logger.warn(`  ⚠️  Missing columns in ${tableName}:`, missingColumns.join(', '));
    }

    if (extraColumns.length > 0) {
      report.extraColumns[tableName] = extraColumns;
      logger.debug(`  ℹ️  Extra columns in ${tableName}:`, extraColumns.join(', '));
    }

    // Check indexes (optional - indexes are less critical)
    const actualIndexes = await getTableIndexes(db, isSQLite, tableName);
    const missingIndexes = tableSpec.indexes.filter((idx) => !actualIndexes.includes(idx));

    if (missingIndexes.length > 0) {
      report.missingIndexes[tableName] = missingIndexes;
      report.allIndexesPresent = false;
      logger.debug(`  ℹ️  Missing indexes in ${tableName}:`, missingIndexes.join(', '));
    }
  }

  // Summary
  if (report.allTablesPresent && report.allColumnsPresent) {
    logger.info('✅ Schema verification passed - all tables and columns present');
  } else {
    logger.warn('⚠️  Schema verification found issues - see report above');
  }

  return report;
}

/**
 * Get schema statistics
 */
export async function getSchemaStats(db, isSQLite) {
  const stats = {
    tables: {},
    totalTables: 0,
    totalColumns: 0,
    totalIndexes: 0,
  };

  for (const [tableName] of Object.entries(EXPECTED_SCHEMA)) {
    const exists = await tableExists(db, isSQLite, tableName);

    if (!exists) {
      continue;
    }

    const columns = await getTableColumns(db, isSQLite, tableName);
    const indexes = await getTableIndexes(db, isSQLite, tableName);

    stats.tables[tableName] = {
      columnCount: columns.length,
      indexCount: indexes.length,
    };

    stats.totalTables++;
    stats.totalColumns += columns.length;
    stats.totalIndexes += indexes.length;
  }

  return stats;
}

/**
 * Print schema report
 */
export function printSchemaReport(report) {
  logger.info('📊 Schema Verification Report:');
  logger.info(`  Tables: ${report.allTablesPresent ? '✅ All present' : '⚠️  Some missing'}`);
  logger.info(`  Columns: ${report.allColumnsPresent ? '✅ All present' : '⚠️  Some missing'}`);
  logger.info(
    `  Indexes: ${report.allIndexesPresent ? '✅ All present' : 'ℹ️  Some missing (non-critical)'}`,
  );

  if (report.missingTables.length > 0) {
    logger.warn(
      `  Missing tables (${report.missingTables.length}):`,
      report.missingTables.join(', '),
    );
  }

  const missingColumnCount = Object.keys(report.missingColumns).length;
  if (missingColumnCount > 0) {
    logger.warn(`  Tables with missing columns (${missingColumnCount}):`);
    for (const [table, columns] of Object.entries(report.missingColumns)) {
      logger.warn(`    - ${table}: ${columns.join(', ')}`);
    }
  }
}

export default {
  verifySchema,
  getSchemaStats,
  printSchemaReport,
};
