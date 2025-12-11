/**
 * Health Check Integration Tests
 * Tests health check endpoints with real database
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import db from '../src/config/database.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Health Check Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-health.db');
  let app;

  beforeAll(async () => {
    // Set up test database
    process.env.NOTES_DB_PATH = testDbPath;
    process.env.JWT_SECRET = 'test-secret-key';

    // Connect and initialize schema
    await db.connect();
    await db.initSchema();

    // Import app after database is set up
    app = (await import('../src/index.js')).default;

    // Create a test user to verify user count
    await db.run(`INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`, [
      'testuser',
      'hashedpassword',
      'test@example.com',
    ]);
  });

  afterAll(async () => {
    // Clean up
    await db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Clean up WAL files
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('GET /api/health', () => {
    it('should return 200 with health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('database', 'connected');
      expect(response.body).toHaveProperty('user_count');
      expect(response.body.user_count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with standardized v1 response format', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service is healthy');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('database', 'connected');
      expect(response.body.data).toHaveProperty('user_count');
      expect(response.body.data.user_count).toBeGreaterThanOrEqual(1);
    });
  });
});
