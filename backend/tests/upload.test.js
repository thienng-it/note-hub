/**
 * Upload Routes Tests
 * Tests for image upload functionality including single/multiple uploads and deletions
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
jest.mock('../src/middleware/auth', () => ({
  jwtRequired: (req, _res, next) => {
    req.user = { id: 1, username: 'testuser', is_admin: true };
    next();
  },
  adminRequired: (_req, _res, next) => {
    next();
  },
}));

import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';

// Mock the database
// Mock JWT middleware
import _db from '../src/config/database.js';
// Set up environment
    // Create uploads directory if it doesn't exist
    // Create test fixtures directory
    // Create a small test image (1x1 PNG)
    // Import app after mocking
    // Clean up test fixtures
    // Clean up uploaded files during tests
      // Upload should succeed
      // Verify a file was created in the uploads directory
      // Clean up
      // Create a large file (6MB, exceeds 5MB limit)
      // Clean up
      // Clean up
      // Create a minimal JPEG file
      // Verify a JPEG file was created in uploads directory
      // Clean up test JPEG and uploaded files
      // Count existing files before upload
      // Verify 2 more PNG files were created
      // Clean up new files
      // Try to upload 11 images
      // Multer should reject this before it reaches the route handler
      // Create a test file directly in uploads directory
      // Verify file exists before deletion
      // Verify file is deleted from disk
      // Should return 404 regardless of error message format
      // Verify it's an error response
      // Create a test file directly in uploads directory
      // Clean up uploaded file
      // uploadedFilePath is like '/uploads/filename.png'
      // File was served successfully