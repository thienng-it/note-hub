/**
 * Passkey Integration Tests
 * Tests passkey (WebAuthn) authentication endpoints with real database
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import db from '../src/config/database.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Passkey Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-passkey.db');
  let app;
  let accessToken;

  beforeAll(async () => {
    // Set up test database
    process.env.NOTES_DB_PATH = testDbPath;
    process.env.JWT_SECRET = 'test-secret-key-for-passkey-tests';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.WEBAUTHN_RP_ID = 'localhost';
    process.env.WEBAUTHN_RP_NAME = 'NoteHub Test';
    process.env.WEBAUTHN_ORIGIN = 'http://localhost:3000';

    // Connect and initialize schema
    await db.connect();
    await db.initSchema();

    // Import app after database is set up
    app = (await import('../src/index.js')).default;

    // Create a test user
    await request(app).post('/api/v1/auth/register').send({
      username: 'passkeyuser',
      password: 'TestPassword123!',
      email: 'passkey@test.com',
    });

    // Login to get access token
    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      username: 'passkeyuser',
      password: 'TestPassword123!',
    });

    accessToken = loginResponse.body.data.access_token;
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

  describe('GET /api/v1/auth/passkey/status', () => {
    it('should return passkey enabled status', async () => {
      const response = await request(app).get('/api/v1/auth/passkey/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enabled');
      expect(typeof response.body.data.enabled).toBe('boolean');
    });
  });

  describe('POST /api/v1/auth/passkey/register-options', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/auth/passkey/register-options');

      expect(response.status).toBe(401);
    });

    it('should generate registration options for authenticated user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/passkey/register-options')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('options');
      expect(response.body.data).toHaveProperty('challengeKey');
      expect(response.body.data.options).toHaveProperty('challenge');
      expect(response.body.data.options).toHaveProperty('rp');
      expect(response.body.data.options).toHaveProperty('user');
      expect(response.body.data.options.rp.name).toBe('NoteHub Test');
    });

    it('should generate different challenges for multiple requests', async () => {
      const response1 = await request(app)
        .post('/api/v1/auth/passkey/register-options')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      const response2 = await request(app)
        .post('/api/v1/auth/passkey/register-options')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.options.challenge).not.toBe(response2.body.data.options.challenge);
      expect(response1.body.data.challengeKey).not.toBe(response2.body.data.challengeKey);
    });
  });

  describe('POST /api/v1/auth/passkey/register-verify', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/auth/passkey/register-verify').send({
        response: {},
        challengeKey: 'test',
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/passkey/register-verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          challengeKey: 'test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing challenge key', async () => {
      const response = await request(app)
        .post('/api/v1/auth/passkey/register-verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          response: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid challenge key', async () => {
      const response = await request(app)
        .post('/api/v1/auth/passkey/register-verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          response: {
            id: 'test-id',
            rawId: 'test-raw-id',
            response: {
              clientDataJSON: 'test-data',
              attestationObject: 'test-attestation',
            },
            type: 'public-key',
          },
          challengeKey: 'invalid_challenge_key',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid or expired challenge');
    });
  });

  describe('GET /api/v1/auth/passkey/credentials', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/auth/passkey/credentials');

      expect(response.status).toBe(401);
    });

    it('should return empty credentials for user without passkeys', async () => {
      const response = await request(app)
        .get('/api/v1/auth/passkey/credentials')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('credentials');
      expect(Array.isArray(response.body.data.credentials)).toBe(true);
      expect(response.body.data.credentials.length).toBe(0);
    });
  });

  describe('POST /api/v1/auth/passkey/login-options', () => {
    it('should generate authentication options without username', async () => {
      const response = await request(app).post('/api/v1/auth/passkey/login-options').send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('options');
      expect(response.body.data).toHaveProperty('challengeKey');
      expect(response.body.data.options).toHaveProperty('challenge');
    });

    it('should generate authentication options with username', async () => {
      const response = await request(app).post('/api/v1/auth/passkey/login-options').send({
        username: 'passkeyuser',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('options');
      expect(response.body.data).toHaveProperty('challengeKey');
    });

    it('should generate different challenges for multiple requests', async () => {
      const response1 = await request(app).post('/api/v1/auth/passkey/login-options').send({});
      const response2 = await request(app).post('/api/v1/auth/passkey/login-options').send({});

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.options.challenge).not.toBe(response2.body.data.options.challenge);
      expect(response1.body.data.challengeKey).not.toBe(response2.body.data.challengeKey);
    });
  });

  describe('POST /api/v1/auth/passkey/login-verify', () => {
    it('should return 400 for missing response', async () => {
      const response = await request(app).post('/api/v1/auth/passkey/login-verify').send({
        challengeKey: 'test',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing challenge key', async () => {
      const response = await request(app).post('/api/v1/auth/passkey/login-verify').send({
        response: {},
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid challenge key', async () => {
      const response = await request(app)
        .post('/api/v1/auth/passkey/login-verify')
        .send({
          response: {
            id: 'test-id',
            rawId: 'test-raw-id',
            response: {
              clientDataJSON: 'test-data',
              authenticatorData: 'test-auth-data',
              signature: 'test-signature',
            },
            type: 'public-key',
          },
          challengeKey: 'invalid_challenge_key',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid or expired challenge');
    });
  });

  describe('DELETE /api/v1/auth/passkey/credentials/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app).delete('/api/v1/auth/passkey/credentials/1');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent credential', async () => {
      const response = await request(app)
        .delete('/api/v1/auth/passkey/credentials/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/auth/passkey/credentials/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/v1/auth/passkey/credentials/1')
        .send({ name: 'New Name' });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent credential', async () => {
      const response = await request(app)
        .patch('/api/v1/auth/passkey/credentials/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'New Name' });

      // Should return 400 or 404 depending on implementation
      expect([400, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .patch('/api/v1/auth/passkey/credentials/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Challenge expiry', () => {
    it('should not allow reuse of challenge key', async () => {
      // Get registration options
      const optionsResponse = await request(app)
        .post('/api/v1/auth/passkey/register-options')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(optionsResponse.status).toBe(200);
      const challengeKey = optionsResponse.body.data.challengeKey;

      // Try to verify with invalid response (this will consume the challenge)
      const verifyResponse1 = await request(app)
        .post('/api/v1/auth/passkey/register-verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          response: {
            id: 'test-id',
            rawId: 'test-raw-id',
            response: {
              clientDataJSON: 'test-data',
              attestationObject: 'test-attestation',
            },
            type: 'public-key',
          },
          challengeKey,
        });

      // Challenge should be consumed (invalid or verification failed)
      expect(verifyResponse1.status).toBeGreaterThanOrEqual(400);

      // Try to use the same challenge again
      const verifyResponse2 = await request(app)
        .post('/api/v1/auth/passkey/register-verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          response: {
            id: 'test-id',
            rawId: 'test-raw-id',
            response: {
              clientDataJSON: 'test-data',
              attestationObject: 'test-attestation',
            },
            type: 'public-key',
          },
          challengeKey,
        });

      // Should fail because challenge was already used
      expect(verifyResponse2.status).toBe(400);
      expect(verifyResponse2.body.error.message).toContain('Invalid or expired challenge');
    });
  });

  describe('Security validations', () => {
    it('should validate RP ID configuration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/passkey/register-options')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.options.rp.id).toBe('localhost');
    });

    it('should include user verification in options', async () => {
      const response = await request(app)
        .post('/api/v1/auth/passkey/register-options')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.options).toHaveProperty('authenticatorSelection');
      expect(response.body.data.options.authenticatorSelection).toHaveProperty('userVerification');
    });
  });
});
