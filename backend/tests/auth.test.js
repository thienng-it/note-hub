/**
 * Authentication Routes Tests
 */
const request = require('supertest');

// Mock the database
jest.mock('../src/config/database', () => ({
  connect: jest.fn(),
  initSchema: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  run: jest.fn(),
  isSQLite: true
}));

// Mock Sequelize models
jest.mock('../src/models', () => ({
  initializeSequelize: jest.fn(),
  syncDatabase: jest.fn(),
  closeDatabase: jest.fn(),
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  Invitation: {
    findOne: jest.fn(),
    update: jest.fn()
  },
  PasswordResetToken: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  Op: {
    or: Symbol('or')
  }
}));

const { User } = require('../src/models');

// Set up environment
process.env.JWT_SECRET = 'test-secret-key';

describe('Auth Routes', () => {
  let app;

  beforeAll(async () => {
    // Import app after mocking
    app = require('../src/index');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if username or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username/email and password required');
    });

    it('should return 401 for invalid credentials', async () => {
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return tokens for valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('TestPassword123', 12);
      
      User.findOne.mockResolvedValue({
        id: 1,
        username: 'test',
        email: 'test@example.com',
        password_hash: hash,
        totp_secret: null
      });
      User.update.mockResolvedValue([1]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'TestPassword123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.token_type).toBe('Bearer');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 if username or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password required');
    });

    it('should return 400 for short username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'ab', password: 'TestPassword123!' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username must be at least 3 characters');
    });

    it('should return 400 for weak password', async () => {
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'weak' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password must be at least');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 400 if refresh token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Refresh token required');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/validate', () => {
    it('should return 401 without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/validate');

      expect(response.status).toBe(401);
    });
  });
});
