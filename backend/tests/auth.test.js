/**
 * Authentication Routes Tests
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
    // Import app after mocking
      import bcrypt from 'bcryptjs';