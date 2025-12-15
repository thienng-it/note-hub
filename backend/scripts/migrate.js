#!/usr/bin/env node
/**
 * Migration Management CLI
 *
 * Usage:
 *   node migrate.js status    - Show migration status
 *   node migrate.js run       - Run pending migrations
 *   node migrate.js verify    - Verify database schema
 *   node migrate.js create <name> - Create new migration template
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import db from '../src/config/database.js';
import logger from '../src/config/logger.js';
import {
  getAppliedMigrations,
  getPendingMigrations,
  runMigrations,
} from '../src/config/migrations.js';
import {
  getSchemaStats,
  printSchemaReport,
  verifySchema,
} from '../src/config/schemaVerification.js';

const command = process.argv[2];
const arg = process.argv[3];

async function showStatus() {
  console.log('📊 Migration Status\n');

  await db.connect();

  const applied = await getAppliedMigrations(db.db, db.isSQLite);
  const pending = await getPendingMigrations(db.db, db.isSQLite);

  console.log(`Applied migrations: ${applied.length}`);
  if (applied.length > 0) {
    console.log('\n✅ Applied:');
    for (const migration of applied) {
      console.log(`  - ${migration.id}: ${migration.description}`);
      console.log(`    Applied at: ${migration.applied_at}`);
    }
  }

  console.log(`\nPending migrations: ${pending.length}`);
  if (pending.length > 0) {
    console.log('\n⏳ Pending:');
    for (const migration of pending) {
      console.log(`  - ${migration.id}: ${migration.description}`);
    }
  }

  await db.close();
}

async function runPendingMigrations() {
  console.log('🚀 Running pending migrations\n');

  await db.connect();
  await runMigrations(db.db, db.isSQLite);
  await db.close();

  console.log('\n✅ Migration complete');
}

async function verifyDatabaseSchema() {
  console.log('🔍 Verifying database schema\n');

  await db.connect();

  const report = await verifySchema(db.db, db.isSQLite);
  printSchemaReport(report);

  console.log('\n📊 Schema Statistics:');
  const stats = await getSchemaStats(db.db, db.isSQLite);
  console.log(`  Total tables: ${stats.totalTables}`);
  console.log(`  Total columns: ${stats.totalColumns}`);
  console.log(`  Total indexes: ${stats.totalIndexes}`);

  await db.close();

  // Exit with error if schema verification failed
  if (!report.allTablesPresent || !report.allColumnsPresent) {
    process.exit(1);
  }
}

function createMigrationTemplate(name) {
  if (!name) {
    console.error('❌ Error: Migration name is required');
    console.log('Usage: node migrate.js create <migration_name>');
    process.exit(1);
  }

  // Generate migration ID from timestamp
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const migrationId = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;

  const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 * 
 * Description:
 * Add your migration description here
 */

export const migration = {
  id: '${migrationId}',
  description: '${name}',
  
  /**
   * Apply migration to SQLite database
   */
  async sqlite(db) {
    // Check if column/table exists
    // const columns = db.prepare('PRAGMA table_info(table_name)').all();
    // const hasColumn = columns.some((col) => col.name === 'column_name');
    
    // if (!hasColumn) {
    //   logger.info('  🔄 Adding column_name to table_name...');
    //   db.exec('ALTER TABLE table_name ADD COLUMN column_name TYPE DEFAULT value');
    //   logger.info('  ✅ column_name added');
    // }
  },
  
  /**
   * Apply migration to MySQL database
   */
  async mysql(db) {
    // const database = process.env.MYSQL_DATABASE || 'notehub';
    
    // const [column] = await db.query(
    //   \`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    //    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'table_name' AND COLUMN_NAME = 'column_name'\`,
    //   [database],
    // );
    
    // if (column.length === 0) {
    //   logger.info('  🔄 Adding column_name to table_name...');
    //   await db.query('ALTER TABLE table_name ADD COLUMN column_name TYPE DEFAULT value');
    //   logger.info('  ✅ column_name added');
    // }
  },
};
`;

  console.log('📝 Migration Template:\n');
  console.log('Migration ID:', migrationId);
  console.log('\nAdd this to backend/src/config/migrations.js in the MIGRATIONS array:\n');
  console.log(template);
  console.log('\n✅ Template generated - copy and paste into migrations.js');
}

async function main() {
  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;

      case 'run':
        await runPendingMigrations();
        break;

      case 'verify':
        await verifyDatabaseSchema();
        break;

      case 'create':
        createMigrationTemplate(arg);
        break;

      default:
        console.log('Migration Management CLI\n');
        console.log('Usage:');
        console.log('  node migrate.js status              - Show migration status');
        console.log('  node migrate.js run                 - Run pending migrations');
        console.log('  node migrate.js verify              - Verify database schema');
        console.log('  node migrate.js create <name>       - Create new migration template');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Migration command failed:', error.message);
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
