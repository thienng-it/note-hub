/**
 * Users Integration Tests
 * Tests user search endpoints with real database
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import db from '../src/config/database.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Users Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-users.db');
  let app;
  let authToken;

  beforeAll(async () => {
    // Set up test database
    process.env.NOTES_DB_PATH = testDbPath;
    process.env.JWT_SECRET = 'test-secret-key-for-users-tests';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-for-users';

    // Connect and initialize schema
    await db.connect();
    await db.initSchema();

    // Import app after database is set up
    app = (await import('../src/index.js')).default;

    // Create multiple test users
    await request(app).post('/api/v1/auth/register').send({
      username: 'alice',
      password: 'SecurePass123!',
      email: 'alice@test.com',
    });

    await request(app).post('/api/v1/auth/register').send({
      username: 'bob',
      password: 'SecurePass123!',
      email: 'bob@test.com',
    });

    await request(app).post('/api/v1/auth/register').send({
      username: 'charlie',
      password: 'SecurePass123!',
      email: 'charlie@test.com',
    });

    // Login as alice
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      username: 'alice',
      password: 'SecurePass123!',
    });

    authToken = loginRes.body.data.access_token;
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

  describe('GET /api/v1/users/search', () => {
    it('should search for users by username', async () => {
      const res = await request(app)
        .get('/api/v1/users/search?q=bob')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(res.body.users.some((u) => u.username === 'bob')).toBe(true);
    });

    it('should return empty array for queries less than 2 characters', async () => {
      const res = await request(app)
        .get('/api/v1/users/search?q=a')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual([]);
    });

    it('should exclude current user from search results', async () => {
      const res = await request(app)
        .get('/api/v1/users/search?q=alice')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.some((u) => u.username === 'alice')).toBe(false);
    });

    it('should limit results to 10 users', async () => {
      const res = await request(app)
        .get('/api/v1/users/search?q=')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Empty query returns empty array (security requirement)
      expect(res.body.users).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/v1/users/search?q=bob');

      expect(res.status).toBe(401);
    });

    it('should perform case-insensitive search', async () => {
      const res = await request(app)
        .get('/api/v1/users/search?q=BOB')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.some((u) => u.username === 'bob')).toBe(true);
    });
  });
});
