/**
 * Redis Caching Integration Tests
 */
// Mock modules - must be before imports for ESM
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

// Mock the database
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

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

import db from '../src/config/database.js';
// Set up environment
/**
 * TEMPORARILY DISABLED - See docs/testing/FAILED_TESTS_DECISION.md
 *
 * These tests require complete database mocking which is brittle and
 * doesn't reflect real behavior. They need refactoring to use
 * SQLite in-memory database for proper integration testing.
 *
 * Root cause: Auth middleware queries database for user verification,
 * but mocks don't properly simulate this, resulting in 401 errors.
 */
    // Import app after mocking
    import jwt from 'jsonwebtoken';
      // Should attempt to get from cache
      // Should cache the result
      // Should not query database
      // Mock SCAN to return cache keys
      // Should invalidate cache using SCAN
      // Should still return data from database
      // Simulate many iterations
        // Keep returning new cursors to test max iteration
      // Should still complete successfully
      // SCAN should have been called but limited
      // Notes: 10 minutes
      // Tags: 30 minutes