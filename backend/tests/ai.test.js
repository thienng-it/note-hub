/**
 * AI Service Integration Tests
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

// Mock the database
import db from '../src/config/database.js';
// Set up environment
import jwtService from '../src/services/jwtService.js';
  // Import app after mocking
  // Generate auth token for tests
  // Mock user query for auth middleware
      // Only test if AI is actually not configured
        // Will be 500 if AI not configured, but shouldn't be 400 (validation error)
      // Will be 500 if AI not configured, but shouldn't be 400 (validation error)