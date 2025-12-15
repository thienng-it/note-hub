/**
 * Migration System Tests
 *
 * Tests for the centralized database migration system
 */

import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import db from '../src/config/database.js';
import {
  getAppliedMigrations,
  getPendingMigrations,
  runMigrations,
} from '../src/config/migrations.js';
import { getSchemaStats, verifySchema } from '../src/config/schemaVerification.js';

describe('Database Migration System', () => {
  const testDbPath = path.resolve('/tmp', 'test_migrations.db');

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Set test database path and connect
    process.env.NOTES_DB_PATH = testDbPath;
    await db.connect();
  });

  afterEach(async () => {
    // Clean up
    if (db?.db) {
      await db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Migration Execution', () => {
    it('should create migration_history table', async () => {
      // Initialize schema (creates tables)
      await db.initSchema();

      // Check if migration_history table exists
      const tables = db.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_history'")
        .all();

      expect(tables.length).toBe(1);
      expect(tables[0].name).toBe('migration_history');
    });

    it('should run migrations on fresh database', async () => {
      // Initialize schema first (this runs migrations automatically)
      await db.initSchema();

      // Get applied migrations
      const appliedAfter = await getAppliedMigrations(db.db, db.isSQLite);
      expect(appliedAfter.length).toBeGreaterThan(0);

      // Verify all migrations were applied (no pending)
      const pendingAfter = await getPendingMigrations(db.db, db.isSQLite);
      expect(pendingAfter.length).toBe(0);
    });

    it('should be idempotent - safe to run multiple times', async () => {
      // Initialize and run migrations
      await db.initSchema();

      const firstRunApplied = await getAppliedMigrations(db.db, db.isSQLite);
      const firstRunCount = firstRunApplied.length;

      // Run migrations again
      await runMigrations(db.db, db.isSQLite);

      const secondRunApplied = await getAppliedMigrations(db.db, db.isSQLite);
      const secondRunCount = secondRunApplied.length;

      // Should have same number of migrations
      expect(secondRunCount).toBe(firstRunCount);
    });

    it('should track migration history with timestamps', async () => {
      await db.initSchema();

      const applied = await getAppliedMigrations(db.db, db.isSQLite);

      // Each migration should have required fields
      for (const migration of applied) {
        expect(migration).toHaveProperty('id');
        expect(migration).toHaveProperty('description');
        expect(migration).toHaveProperty('applied_at');
        expect(typeof migration.id).toBe('string');
        expect(typeof migration.description).toBe('string');
      }
    });
  });

  describe('Schema Verification', () => {
    it('should verify schema completeness', async () => {
      await db.initSchema();

      const report = await verifySchema(db.db, db.isSQLite);

      // Should have no missing tables or columns
      expect(report.allTablesPresent).toBe(true);
      expect(report.allColumnsPresent).toBe(true);
      expect(report.missingTables).toEqual([]);
      expect(Object.keys(report.missingColumns)).toEqual([]);
    });

    it('should provide accurate schema statistics', async () => {
      await db.initSchema();

      const stats = await getSchemaStats(db.db, db.isSQLite);

      // Should have expected number of tables
      expect(stats.totalTables).toBeGreaterThan(10);
      expect(stats.totalColumns).toBeGreaterThan(100);
      expect(stats.totalIndexes).toBeGreaterThan(0);

      // Should have stats for each table
      expect(stats.tables).toHaveProperty('users');
      expect(stats.tables).toHaveProperty('notes');
      expect(stats.tables).toHaveProperty('tasks');
    });

    it('should detect expected columns in users table', async () => {
      await db.initSchema();

      const columns = db.db.prepare('PRAGMA table_info(users)').all();
      const columnNames = columns.map((col) => col.name);

      // Verify key columns exist
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('is_admin');
      expect(columnNames).toContain('is_locked');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('avatar_url');
    });
  });

  describe('Migration Registry', () => {
    it('should have migrations with proper structure', async () => {
      await db.initSchema();

      const pending = await getPendingMigrations(db.db, db.isSQLite);
      const applied = await getAppliedMigrations(db.db, db.isSQLite);
      const allMigrations = [...pending, ...applied];

      // Each migration should have required properties
      for (const migration of allMigrations) {
        expect(migration).toHaveProperty('id');
        expect(migration).toHaveProperty('description');

        // Applied migrations have applied_at
        if (applied.includes(migration)) {
          expect(migration).toHaveProperty('applied_at');
        }
      }
    });

    it('should have unique migration IDs', async () => {
      await db.initSchema();

      const applied = await getAppliedMigrations(db.db, db.isSQLite);
      const ids = applied.map((m) => m.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Column Migrations', () => {
    it('should add is_admin and is_locked columns', async () => {
      await db.initSchema();

      const columns = db.db.prepare('PRAGMA table_info(users)').all();
      const hasIsAdmin = columns.some((col) => col.name === 'is_admin');
      const hasIsLocked = columns.some((col) => col.name === 'is_locked');

      expect(hasIsAdmin).toBe(true);
      expect(hasIsLocked).toBe(true);
    });

    it('should add folder_id columns to notes and tasks', async () => {
      await db.initSchema();

      const notesColumns = db.db.prepare('PRAGMA table_info(notes)').all();
      const tasksColumns = db.db.prepare('PRAGMA table_info(tasks)').all();

      const notesHasFolderId = notesColumns.some((col) => col.name === 'folder_id');
      const tasksHasFolderId = tasksColumns.some((col) => col.name === 'folder_id');

      expect(notesHasFolderId).toBe(true);
      expect(tasksHasFolderId).toBe(true);
    });

    it('should add images columns to notes and tasks', async () => {
      await db.initSchema();

      const notesColumns = db.db.prepare('PRAGMA table_info(notes)').all();
      const tasksColumns = db.db.prepare('PRAGMA table_info(tasks)').all();

      const notesHasImages = notesColumns.some((col) => col.name === 'images');
      const tasksHasImages = tasksColumns.some((col) => col.name === 'images');

      expect(notesHasImages).toBe(true);
      expect(tasksHasImages).toBe(true);
    });

    it('should add user preference columns', async () => {
      await db.initSchema();

      const columns = db.db.prepare('PRAGMA table_info(users)').all();
      const hasHiddenNotes = columns.some((col) => col.name === 'hidden_notes');
      const hasPreferredLanguage = columns.some((col) => col.name === 'preferred_language');

      expect(hasHiddenNotes).toBe(true);
      expect(hasPreferredLanguage).toBe(true);
    });

    it('should add chat-related columns', async () => {
      await db.initSchema();

      const roomColumns = db.db.prepare('PRAGMA table_info(chat_rooms)').all();
      const messageColumns = db.db.prepare('PRAGMA table_info(chat_messages)').all();

      const hasEncryptionSalt = roomColumns.some((col) => col.name === 'encryption_salt');
      const hasPhotoUrl = messageColumns.some((col) => col.name === 'photo_url');
      const hasIsEncrypted = messageColumns.some((col) => col.name === 'is_encrypted');

      expect(hasEncryptionSalt).toBe(true);
      expect(hasPhotoUrl).toBe(true);
      expect(hasIsEncrypted).toBe(true);
    });
  });

  describe('Index Creation', () => {
    it('should create indexes for folder_id columns', async () => {
      await db.initSchema();

      // Check notes indexes
      const notesIndexes = db.db.prepare('PRAGMA index_list(notes)').all();
      const notesIndexNames = notesIndexes.map((idx) => idx.name);

      expect(notesIndexNames).toContain('idx_notes_folder');

      // Check tasks indexes
      const tasksIndexes = db.db.prepare('PRAGMA index_list(tasks)').all();
      const tasksIndexNames = tasksIndexes.map((idx) => idx.name);

      expect(tasksIndexNames).toContain('idx_tasks_folder');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tables gracefully in verification', async () => {
      // Don't initialize schema - tables don't exist
      const report = await verifySchema(db.db, db.isSQLite);

      // Should report missing tables
      expect(report.allTablesPresent).toBe(false);
      expect(report.missingTables.length).toBeGreaterThan(0);
    });

    it('should return empty list for applied migrations on fresh database', async () => {
      // Don't run migrations
      const applied = await getAppliedMigrations(db.db, db.isSQLite);

      expect(Array.isArray(applied)).toBe(true);
      expect(applied.length).toBe(0);
    });
  });
});
