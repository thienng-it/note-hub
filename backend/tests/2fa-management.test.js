/**
 * 2FA Management Tests
 * Tests for improved 2FA disable flow and admin 2FA management
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
  getReplicationStatus: jest.fn(() => ({ enabled: false, message: 'Replication is disabled' })),
}));

const db = require('../src/config/database');

// Set up environment
process.env.JWT_SECRET = 'test-secret-key';

describe('2FA Management', () => {
  let app;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    // Import app after mocking
    app = require('../src/index');
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Generate test tokens
    const jwt = require('jsonwebtoken');
    userToken = jwt.sign({ userId: 1, username: 'testuser' }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ userId: 2, username: 'admin', is_admin: true }, process.env.JWT_SECRET);
  });

  describe('POST /api/auth/2fa/disable', () => {
    it('should disable 2FA without requiring OTP', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        totp_secret: 'JBSWY3DPEHPK3PXP',
        has_2fa: true
      };

      db.queryOne.mockResolvedValue(mockUser);
      db.run.mockResolvedValue({ changes: 1 });

      const response = await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Two-factor authentication disabled');
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET totp_secret = NULL'),
        [1]
      );
    });

    it('should return 401 if user not authenticated', async () => {
      const response = await request(app)
        .post('/api/v1/auth/2fa/disable');

      expect(response.status).toBe(401);
    });

    it('should return 400 if user does not have 2FA enabled', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        totp_secret: null,
        has_2fa: false
      };

      db.queryOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('2FA is not enabled');
    });

    it('should log security event when 2FA is disabled', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        totp_secret: 'JBSWY3DPEHPK3PXP',
        has_2fa: true
      };

      db.queryOne.mockResolvedValue(mockUser);
      db.run.mockResolvedValue({ changes: 1 });

      const consoleSpy = jest.spyOn(console, 'log');

      await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${userToken}`);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] 2FA disabled by user ID: 1')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('POST /api/admin/users/:userId/disable-2fa', () => {
    it('should allow admin to disable user 2FA', async () => {
      const mockAdmin = {
        id: 2,
        username: 'admin',
        is_admin: true
      };

      const mockTargetUser = {
        id: 3,
        username: 'targetuser',
        totp_secret: 'JBSWY3DPEHPK3PXP',
        has_2fa: true
      };

      db.queryOne
        .mockResolvedValueOnce(mockAdmin) // Admin check
        .mockResolvedValueOnce(mockTargetUser); // Target user
      db.run.mockResolvedValue({ changes: 1 });

      const response = await request(app)
        .post('/api/v1/admin/users/3/disable-2fa')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('2FA disabled for user');
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET totp_secret = NULL'),
        [3]
      );
    });

    it('should return 403 if non-admin tries to disable user 2FA', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        is_admin: false
      };

      db.queryOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/admin/users/3/disable-2fa')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 404 if target user not found', async () => {
      const mockAdmin = {
        id: 2,
        username: 'admin',
        is_admin: true
      };

      db.queryOne
        .mockResolvedValueOnce(mockAdmin) // Admin check
        .mockResolvedValueOnce(null); // Target user not found

      const response = await request(app)
        .post('/api/v1/admin/users/999/disable-2fa')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 if target user does not have 2FA enabled', async () => {
      const mockAdmin = {
        id: 2,
        username: 'admin',
        is_admin: true
      };

      const mockTargetUser = {
        id: 3,
        username: 'targetuser',
        totp_secret: null,
        has_2fa: false
      };

      db.queryOne
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockTargetUser);

      const response = await request(app)
        .post('/api/v1/admin/users/3/disable-2fa')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User does not have 2FA enabled');
    });

    it('should log security audit event', async () => {
      const mockAdmin = {
        id: 2,
        username: 'admin',
        is_admin: true
      };

      const mockTargetUser = {
        id: 3,
        username: 'targetuser',
        totp_secret: 'SECRET',
        has_2fa: true
      };

      db.queryOne
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockTargetUser);
      db.run.mockResolvedValue({ changes: 1 });

      const consoleSpy = jest.spyOn(console, 'log');

      await request(app)
        .post('/api/v1/admin/users/3/disable-2fa')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY AUDIT] Admin ID: 2 disabled 2FA for user ID: 3')
      );

      consoleSpy.mockRestore();
    });

    it('should validate userId parameter is numeric', async () => {
      const mockAdmin = {
        id: 2,
        username: 'admin',
        is_admin: true
      };

      db.queryOne.mockResolvedValue(mockAdmin);

      const response = await request(app)
        .post('/api/v1/admin/users/invalid/disable-2fa')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('Password Hash Upgrade Flow', () => {
    it('should detect and upgrade old password hash on login', async () => {
      const oldPasswordHash = await bcrypt.hash('password123', 12); // Old: 12 rounds
      
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: oldPasswordHash,
        totp_secret: null,
        is_admin: false
      };

      db.queryOne.mockResolvedValue(mockUser);
      db.run.mockResolvedValue({ changes: 1 });

      const consoleSpy = jest.spyOn(console, 'log');

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();

      // Should upgrade hash
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] Upgrading password hash for user ID: 1')
      );

      consoleSpy.mockRestore();
    });

    it('should use 14 rounds for new password hashes', async () => {
      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

      db.queryOne.mockResolvedValue(null);
      db.run.mockResolvedValue({ changes: 1, lastID: 1 });

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123'
        });

      expect(bcryptHashSpy).toHaveBeenCalledWith('password123', 14);

      bcryptHashSpy.mockRestore();
    });
  });
});
