/**
 * Migration script to add is_admin and is_locked fields to users table
 */
import path from 'node:path';
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

import Database from '../src/config/database.js';

async function migrate() {
  const db = new Database();

  try {
    console.log('🔄 Starting migration: Add is_admin and is_locked fields...');

    await db.connect();

    if (db.isSQLite) {
      console.log('📦 Migrating SQLite database...');

      // Check if columns exist
      const tableInfo = db.db.prepare('PRAGMA table_info(users)').all();
      const hasIsAdmin = tableInfo.some((col) => col.name === 'is_admin');
      const hasIsLocked = tableInfo.some((col) => col.name === 'is_locked');

      // Add is_admin column
      if (!hasIsAdmin) {
        console.log('  ➕ Adding is_admin column...');
        db.db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');

        // Set admin user to is_admin = 1
        db.db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run('admin');
        console.log('  ✅ is_admin column added and admin user updated');
      } else {
        console.log('  ⏭️  is_admin column already exists, skipping...');
      }

      // Add is_locked column
      if (!hasIsLocked) {
        console.log('  ➕ Adding is_locked column...');
        db.db.exec('ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0');
        console.log('  ✅ is_locked column added');
      } else {
        console.log('  ⏭️  is_locked column already exists, skipping...');
      }
    } else {
      console.log('🗄️  Migrating MySQL database...');

      // Check if columns exist
      const [adminColumn] = await db.db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'`,
        [process.env.MYSQL_DATABASE || 'notehub'],
      );

      const [lockedColumn] = await db.db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_locked'`,
        [process.env.MYSQL_DATABASE || 'notehub'],
      );

      // Add is_admin column
      if (adminColumn.length === 0) {
        console.log('  ➕ Adding is_admin column...');
        await db.db.query('ALTER TABLE users ADD COLUMN is_admin TINYINT DEFAULT 0');

        // Set admin user to is_admin = 1
        await db.db.query('UPDATE users SET is_admin = 1 WHERE username = ?', ['admin']);
        console.log('  ✅ is_admin column added and admin user updated');
      } else {
        console.log('  ⏭️  is_admin column already exists, skipping...');
      }

      // Add is_locked column
      if (lockedColumn.length === 0) {
        console.log('  ➕ Adding is_locked column...');
        await db.db.query('ALTER TABLE users ADD COLUMN is_locked TINYINT DEFAULT 0');
        console.log('  ✅ is_locked column added');
      } else {
        console.log('  ⏭️  is_locked column already exists, skipping...');
      }
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
