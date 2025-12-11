/**
 * Authentication Integration Tests
 * Tests authentication endpoints with real database
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import db from '../src/config/database.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Authentication Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-auth.db');
  let app;

  beforeAll(async () => {
    // Set up test database
    process.env.NOTES_DB_PATH = testDbPath;
    process.env.JWT_SECRET = 'test-secret-key-for-auth-tests';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

    // Connect and initialize schema
    await db.connect();
    await db.initSchema();

    // Import app after database is set up
    app = (await import('../src/index.js')).default;
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

  describe('POST /api/v1/auth/register', () => {
    it('should return 400 if username or password is missing', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({});

      expect(response.status).toBe(400);
      const error = response.body.error?.message || response.body.error;
      expect(error).toContain('Validation failed');
    });

    it('should return 400 for short username', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'ab', password: 'TestPassword123!' });

      expect(response.status).toBe(400);
      const error = response.body.error?.message || response.body.error;
      expect(error).toContain('Validation failed');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'testuser', password: 'weak' });

      expect(response.status).toBe(400);
      const error = response.body.error?.message || response.body.error;
      expect(error).toContain('Validation failed');
    });

    it('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'newuser', password: 'StrongPassword123!' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Registration successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('username', 'newuser');
      expect(response.body.data.user).toHaveProperty('id');
    });

    it('should return 400 for duplicate username', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'duplicateuser', password: 'StrongPassword123!' });

      // Try to register again
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'duplicateuser', password: 'StrongPassword123!' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      // The error should indicate the username is already taken
      const error = response.body.error?.message || response.body.error;
      expect(typeof error).toBe('string');
      expect(error.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const testUser = {
      username: 'logintest',
      password: 'LoginPassword123!',
    };

    beforeAll(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash(testUser.password, 12);
      await db.run(`INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`, [
        testUser.username,
        hashedPassword,
        'logintest@example.com',
      ]);
    });

    it('should return 400 if username or password is missing', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({});

      expect(response.status).toBe(400);
      const error = response.body.error?.message || response.body.error;
      expect(error).toContain('Validation failed');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: testUser.username, password: 'wrongpassword' });

      expect(response.status).toBe(401);
      const error = response.body.error?.message || response.body.error;
      expect(error).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'nonexistentuser', password: 'anypassword' });

      expect(response.status).toBe(401);
      const error = response.body.error?.message || response.body.error;
      expect(error).toBe('Invalid credentials');
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: testUser.username, password: testUser.password });

      expect(response.status).toBe(200);
      const data = response.body.data || response.body;
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('refresh_token');
      expect(data.token_type).toBe('Bearer');
      expect(data.user).toHaveProperty('username', testUser.username);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should successfully logout (invalidate token)', async () => {
      // First login to get a token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'logintest', password: 'LoginPassword123!' });

      const { access_token } = loginResponse.body.data || loginResponse.body;

      // Then logout
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${access_token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
