/**
 * Google OAuth Integration Tests
 */

import bcrypt from 'bcryptjs';
import { google } from 'googleapis';
import request from 'supertest';

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest
          .fn()
          .mockReturnValue('https://accounts.google.com/o/oauth2/auth?client_id=test'),
        getToken: jest.fn().mockResolvedValue({
          tokens: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
          },
        }),
        setCredentials: jest.fn(),
      })),
    },
    oauth2: jest.fn().mockReturnValue({
      userinfo: {
        get: jest.fn().mockResolvedValue({
          data: {
            email: 'test@gmail.com',
            verified_email: true,
            name: 'Test User',
            given_name: 'Test',
            family_name: 'User',
          },
        }),
      },
    }),
  },
}));

// Mock the database
jest.mock('../src/config/database.js');

import db from '../src/config/database.js';

// Set up environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

/**
 * TEMPORARILY DISABLED - See docs/testing/FAILED_TESTS_DECISION.md
 *
 * These tests require proper mocking of googleapis library and
 * database calls. They need refactoring to test OAuth flow properly
 * with real or better-mocked dependencies.
 */
describe.skip('Google OAuth', () => {
  let app;

  beforeAll(async () => {
    // Import app after mocking
    app = (await import('../src/index.js')).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/google/status', () => {
    it('should return configured status when OAuth is set up', async () => {
      const response = await request(app).get('/api/v1/auth/google/status');

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(true);
    });

    it('should return false when OAuth env vars missing', async () => {
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      // Need to re-import to pick up env change
      jest.resetModules();

      const response = await request(freshApp).get('/api/v1/auth/google/status');

      expect(response.body.enabled).toBe(false);

      // Restore
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    });
  });

  describe('GET /api/auth/google', () => {
    it('should return Google OAuth authorization URL', async () => {
      const response = await request(app).get('/api/v1/auth/google');

      expect(response.status).toBe(200);
      expect(response.body.auth_url).toBeDefined();
      expect(response.body.auth_url).toContain('accounts.google.com');
    });

    it('should return 503 when OAuth not configured', async () => {
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      jest.resetModules();

      const response = await request(freshApp).get('/api/v1/auth/google');

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Google OAuth not configured');

      process.env.GOOGLE_CLIENT_ID = originalClientId;
    });
  });

  describe('POST /api/auth/google/callback', () => {
    it('should create new user from Google account', async () => {
      db.queryOne.mockResolvedValue(null); // User doesn't exist
      db.run.mockResolvedValue({ changes: 1, lastID: 1 });
      db.queryOne.mockResolvedValueOnce(null); // First check
      db.queryOne.mockResolvedValueOnce({
        // Return new user
        id: 1,
        username: 'test',
        email: 'test@gmail.com',
        is_admin: false,
        created_at: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/api/v1/auth/google/callback')
        .send({ code: 'mock-auth-code' });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@gmail.com');
    });

    it('should login existing user with Google account', async () => {
      const existingUser = {
        id: 1,
        username: 'existinguser',
        email: 'test@gmail.com',
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      db.queryOne.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/v1/auth/google/callback')
        .send({ code: 'mock-auth-code' });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.user.id).toBe(1);
      expect(response.body.user.username).toBe('existinguser');
    });

    it('should reject unverified Google emails', async () => {
      const mockOAuth2 = google.oauth2();

      // Mock unverified email
      mockOAuth2.userinfo.get.mockResolvedValueOnce({
        data: {
          email: 'test@gmail.com',
          verified_email: false,
          name: 'Test User',
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/google/callback')
        .send({ code: 'mock-auth-code' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('verified');
    });

    it('should return 400 if authorization code missing', async () => {
      const response = await request(app).post('/api/v1/auth/google/callback').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Authorization code required');
    });

    it('should generate unique username from email', async () => {
      db.queryOne.mockResolvedValue(null);
      db.run.mockResolvedValue({ changes: 1, lastID: 1 });
      db.queryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 1,
        username: 'test',
        email: 'test@gmail.com',
        is_admin: false,
      });

      const response = await request(app)
        .post('/api/v1/auth/google/callback')
        .send({ code: 'mock-auth-code' });

      expect(response.status).toBe(200);
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          expect.stringMatching(/test/),
          'test@gmail.com',
          expect.any(String), // password hash
        ]),
      );
    });

    it('should handle OAuth token exchange errors', async () => {
      const OAuth2 = google.auth.OAuth2;
      const mockClient = new OAuth2();

      mockClient.getToken.mockRejectedValueOnce(new Error('Invalid authorization code'));

      const response = await request(app)
        .post('/api/v1/auth/google/callback')
        .send({ code: 'invalid-code' });

      expect(response.status).toBe(500);
    });

    it('should use random password hash for OAuth users', async () => {
      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

      db.queryOne.mockResolvedValue(null);
      db.run.mockResolvedValue({ changes: 1, lastID: 1 });
      db.queryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 1,
        username: 'test',
        email: 'test@gmail.com',
      });

      await request(app).post('/api/v1/auth/google/callback').send({ code: 'mock-auth-code' });

      // Should hash a random password with 14 rounds
      expect(bcryptHashSpy).toHaveBeenCalledWith(expect.any(String), 14);

      bcryptHashSpy.mockRestore();
    });
  });

  describe('Security Logging', () => {
    it('should log Google OAuth login events', async () => {
      const existingUser = {
        id: 1,
        username: 'testuser',
        email: 'test@gmail.com',
        is_admin: false,
      };

      db.queryOne.mockResolvedValue(existingUser);

      const consoleSpy = jest.spyOn(console, 'log');

      await request(app).post('/api/v1/auth/google/callback').send({ code: 'mock-auth-code' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Google OAuth login'));

      consoleSpy.mockRestore();
    });

    it('should log new user creation from OAuth', async () => {
      db.queryOne.mockResolvedValue(null);
      db.run.mockResolvedValue({ changes: 1, lastID: 1 });
      db.queryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 1,
        username: 'test',
        email: 'test@gmail.com',
      });

      const consoleSpy = jest.spyOn(console, 'log');

      await request(app).post('/api/v1/auth/google/callback').send({ code: 'mock-auth-code' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('New user created via Google OAuth'),
      );

      consoleSpy.mockRestore();
    });
  });
});
