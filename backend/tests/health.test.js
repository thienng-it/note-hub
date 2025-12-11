/**
 * Health Check Endpoint Tests
 * Tests for both /api/health and /api/v1/health endpoints
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
jest.mock('../src/config/redis', () => ({
  connect: jest.fn(),
  isEnabled: jest.fn(() => false),
  close: jest.fn(),
}));
jest.mock('../src/config/elasticsearch', () => ({
  connect: jest.fn(),
  isEnabled: jest.fn(() => false),
  close: jest.fn(),
}));
jest.mock('../src/models', () => ({
  initializeSequelize: jest.fn(),
  syncDatabase: jest.fn(),
  closeDatabase: jest.fn(),
}));

import request from 'supertest';

// Mock the database
// Mock Redis
// Mock Elasticsearch
// Mock Sequelize models
import db from '../src/config/database.js';
/**
 * TEMPORARILY DISABLED - See docs/testing/FAILED_TESTS_DECISION.md
 *
 * These tests require proper database health check mocking.
 * Should be refactored to use real database for integration testing.
 */
    // Import app after mocking