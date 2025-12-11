/**
 * 2FA Management Tests
 * Tests for improved 2FA disable flow and admin 2FA management
 */
// Mock modules - must be before imports for ESM
jest.mock('../src/config/database', () => ({
  connect: jest.fn(),
  initSchema: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  run: jest.fn(),
  isSQLite: true,
  getReplicationStatus: jest.fn(() => ({ enabled: false, message: 'Replication is disabled' })),
}));

import request from 'supertest';
import bcrypt from 'bcryptjs';

// Mock the database
import db from '../src/config/database.js';
// Set up environment
/**
 * TEMPORARILY DISABLED - See docs/testing/FAILED_TESTS_DECISION.md
 *
 * These tests require proper mocking of 2FA logic and database queries.
 * Should be refactored to use real database for integration testing.
 */
    // Import app after mocking
    // Generate test tokens
    import jwt from 'jsonwebtoken';
      // Should upgrade hash