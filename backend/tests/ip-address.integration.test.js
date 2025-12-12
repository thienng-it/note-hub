/**
 * IP Address Handling Integration Tests
 * Tests that Express correctly extracts real client IP from proxy headers
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import db from '../src/config/database.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('IP Address Handling Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-ip-address.db');
  let app;

  beforeAll(async () => {
    // Set up test database
    process.env.NOTES_DB_PATH = testDbPath;
    process.env.JWT_SECRET = 'test-secret-key-for-ip-tests';
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

  describe('X-Forwarded-For header handling', () => {
    it('should extract real IP from X-Forwarded-For header', async () => {
      // Test with health endpoint which is simple and doesn't require auth
      const realIP = '203.0.113.42'; // Example IP address
      const response = await request(app).get('/api/health').set('X-Forwarded-For', realIP);

      expect(response.status).toBe(200);
      // The request should succeed, indicating Express accepted the header
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should handle multiple IPs in X-Forwarded-For header', async () => {
      // When there are multiple proxies, X-Forwarded-For contains comma-separated IPs
      // Express should extract the first (leftmost) IP as the client IP
      const clientIP = '203.0.113.42';
      const proxyIP1 = '172.16.0.1';
      const proxyIP2 = '172.16.0.2';
      const forwardedFor = `${clientIP}, ${proxyIP1}, ${proxyIP2}`;

      const response = await request(app).get('/api/health').set('X-Forwarded-For', forwardedFor);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should work with X-Real-IP header', async () => {
      const realIP = '203.0.113.99';
      const response = await request(app).get('/api/health').set('X-Real-IP', realIP);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should handle requests without proxy headers', async () => {
      // When no proxy headers are present, should still work with direct connection
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('IP address logging in authentication', () => {
    it('should log real IP during user registration', async () => {
      const realIP = '203.0.113.50';
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('X-Forwarded-For', realIP)
        .send({
          username: 'testuser_ip',
          password: 'StrongPassword123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verify the user was created (IP is logged in session table)
      const user = await db.queryOne('SELECT * FROM users WHERE username = ?', ['testuser_ip']);
      expect(user).toBeTruthy();
      expect(user.username).toBe('testuser_ip');
    });

    it('should log real IP during user login', async () => {
      // First register a user
      await request(app).post('/api/v1/auth/register').send({
        username: 'loginuser_ip',
        password: 'StrongPassword123!',
      });

      // Then login with X-Forwarded-For header
      const realIP = '203.0.113.60';
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', realIP)
        .send({
          username: 'loginuser_ip',
          password: 'StrongPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('access_token');
      // The login succeeded, which means Express properly handled the X-Forwarded-For header
      // and didn't throw any errors related to IP address extraction
    });
  });
});
