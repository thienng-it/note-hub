/**
 * Profile Integration Tests
 * Tests profile endpoints with real database
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import db from '../src/config/database.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Profile Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-profile.db');
  let app;
  let authToken;
  let _userId;

  beforeAll(async () => {
    // Set up test database
    process.env.NOTES_DB_PATH = testDbPath;
    process.env.JWT_SECRET = 'test-secret-key-for-profile-tests';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-for-profile';

    // Connect and initialize schema
    await db.connect();
    await db.initSchema();

    // Import app after database is set up
    app = (await import('../src/index.js')).default;

    // Create test user and login
    await request(app).post('/api/v1/auth/register').send({
      username: 'profileuser',
      password: 'SecurePass123!',
      email: 'profile@test.com',
    });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      username: 'profileuser',
      password: 'SecurePass123!',
    });

    authToken = loginRes.body.data.access_token;
    _userId = loginRes.body.data.user.id;

    // Create some test data
    // Create notes
    await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test Note 1', content: 'Content 1' });

    await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test Note 2', content: 'Content 2', tags: ['work'] });

    // Create a task
    await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test Task', description: 'Task description' });
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

  describe('GET /api/v1/profile', () => {
    it('should get user profile with stats', async () => {
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('stats');
      expect(res.body.user.username).toBe('profileuser');
      expect(res.body.user.email).toBe('profile@test.com');

      // Check stats
      expect(res.body.stats.total_notes).toBeGreaterThanOrEqual(2);
      expect(res.body.stats).toHaveProperty('favorite_notes');
      expect(res.body.stats).toHaveProperty('total_tags');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/v1/profile');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: 'Updated bio',
          theme: 'dark',
          preferred_language: 'es',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeTruthy();

      // Verify changes
      const profileRes = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(profileRes.body.user.bio).toBe('Updated bio');
      expect(profileRes.body.user.theme).toBe('dark');
      expect(profileRes.body.user.preferred_language).toBe('es');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).put('/api/v1/profile').send({
        bio: 'Unauthorized update',
      });

      expect(res.status).toBe(401);
    });
  });
});
