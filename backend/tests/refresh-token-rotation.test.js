/**
 * Refresh Token Rotation Tests
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');

// Mock the database
jest.mock('../src/config/database', () => ({
  connect: jest.fn(),
  initSchema: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  run: jest.fn(),
  isSQLite: true
}));

const db = require('../src/config/database');

// Set up environment
process.env.JWT_SECRET = 'test-secret-key';

describe('Refresh Token Rotation', () => {
  let app;

  beforeAll(async () => {
    // Import app after mocking
    app = require('../src/index');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should generate refresh token with JTI and store it in database', async () => {
      const hash = await bcrypt.hash('TestPassword123', 12);
      
      db.queryOne.mockResolvedValue({
        id: 1,
        username: 'test',
        email: 'test@example.com',
        password_hash: hash,
        totp_secret: null
      });
      db.run.mockResolvedValue({ affectedRows: 1, insertId: 1 });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'TestPassword123' });

      expect(response.status).toBe(200);
      const data = response.body.data || response.body;
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('refresh_token');
      
      // Verify that db.run was called to store the refresh token
      expect(db.run).toHaveBeenCalled();
      
      // Check that at least one call was for storing refresh token
      const storeTokenCalls = db.run.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO refresh_tokens')
      );
      expect(storeTokenCalls.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should rotate refresh token when valid token is provided', async () => {
      const jwtService = require('../src/services/jwtService');
      const crypto = require('crypto');
      
      // Generate a valid refresh token
      const { token: refreshToken, tokenId } = jwtService.generateRefreshToken(1);
      const tokenHash = jwtService.hashToken(tokenId);
      
      // Mock stored token
      const storedToken = {
        id: 1,
        user_id: 1,
        token_hash: tokenHash,
        device_info: 'test-device',
        ip_address: '127.0.0.1',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        revoked: 0,
        parent_token_hash: null,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString()
      };
      
      db.queryOne.mockResolvedValue(storedToken);
      db.run.mockResolvedValue({ affectedRows: 1, insertId: 2 });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(200);
      const data = response.body.data || response.body;
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('refresh_token');
      
      // Verify old token was revoked
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked = 1'),
        expect.any(Array)
      );
      
      // Verify new token was stored
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.any(Array)
      );
    });

    it('should reject expired refresh token', async () => {
      const jwtService = require('../src/services/jwtService');
      const { token: refreshToken, tokenId } = jwtService.generateRefreshToken(1);
      const tokenHash = jwtService.hashToken(tokenId);
      
      // Mock expired token
      const expiredToken = {
        id: 1,
        user_id: 1,
        token_hash: tokenHash,
        device_info: 'test-device',
        ip_address: '127.0.0.1',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        revoked: 0,
        parent_token_hash: null,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString()
      };
      
      db.queryOne.mockResolvedValue(expiredToken);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });

    it('should detect token reuse and revoke all user tokens', async () => {
      const jwtService = require('../src/services/jwtService');
      const { token: refreshToken, tokenId } = jwtService.generateRefreshToken(1);
      const tokenHash = jwtService.hashToken(tokenId);
      
      // Mock revoked token (reuse attempt)
      const revokedToken = {
        id: 1,
        user_id: 1,
        token_hash: tokenHash,
        device_info: 'test-device',
        ip_address: '127.0.0.1',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        revoked: 1, // Already revoked!
        revoked_at: new Date().toISOString(),
        parent_token_hash: null,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString()
      };
      
      db.queryOne.mockResolvedValue(revokedToken);
      db.run.mockResolvedValue({ affectedRows: 1 });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Token reuse detected');
      
      // Verify all user tokens were revoked
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked = 1'),
        expect.arrayContaining([1])
      );
    });

    it('should handle legacy tokens without JTI', async () => {
      const jwt = require('jsonwebtoken');
      const secretKey = process.env.JWT_SECRET;
      
      // Generate legacy token without JTI
      const legacyToken = jwt.sign(
        { user_id: 1, type: 'refresh' },
        secretKey,
        { expiresIn: '7d' }
      );
      
      db.queryOne.mockResolvedValue(null); // No stored token
      db.run.mockResolvedValue({ affectedRows: 1, insertId: 1 });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: legacyToken });

      expect(response.status).toBe(200);
      const data = response.body.data || response.body;
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('refresh_token');
      
      // Verify new token was stored (upgrading to rotation)
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.any(Array)
      );
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke specific refresh token on logout', async () => {
      const jwtService = require('../src/services/jwtService');
      
      // Create access token for authentication
      const accessToken = jwtService.generateToken(1);
      const { token: refreshToken, tokenId } = jwtService.generateRefreshToken(1);
      
      db.queryOne.mockResolvedValue({
        id: 1,
        username: 'test',
        email: 'test@example.com',
        totp_secret: null
      });
      db.run.mockResolvedValue({ affectedRows: 1 });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(200);
      const data = response.body.data || response.body;
      expect(response.body.message || data.message).toContain('Logged out successfully');
    });
  });

  describe('POST /api/auth/logout-all', () => {
    it('should revoke all user tokens', async () => {
      const jwtService = require('../src/services/jwtService');
      const accessToken = jwtService.generateToken(1);
      
      db.queryOne.mockResolvedValue({
        id: 1,
        username: 'test',
        email: 'test@example.com',
        totp_secret: null
      });
      db.run.mockResolvedValue({ affectedRows: 3 }); // Revoked 3 tokens

      const response = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(response.status).toBe(200);
      const data = response.body.data || response.body;
      expect(response.body.message || data.message).toContain('Logged out from all devices');
      
      // Verify all tokens were revoked
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE user_id = ? AND revoked = 0'),
        expect.any(Array)
      );
    });
  });

  describe('GET /api/auth/sessions', () => {
    it('should return active sessions for user', async () => {
      const jwtService = require('../src/services/jwtService');
      const accessToken = jwtService.generateToken(1);
      
      const activeSessions = [
        {
          id: 1,
          device_info: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ip_address: '192.168.1.100',
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          device_info: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          ip_address: '192.168.1.101',
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      db.queryOne.mockResolvedValue({
        id: 1,
        username: 'test',
        email: 'test@example.com',
        totp_secret: null
      });
      db.query.mockResolvedValue(activeSessions);

      const response = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(2);
      expect(data.sessions[0]).toHaveProperty('device_info');
      expect(data.sessions[0]).toHaveProperty('ip_address');
    });
  });
});
