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

const db = require('../src/config/database');

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

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 if username or password is missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBe(400);
      const error = response.body.error?.message || response.body.error;
      expect(error).toContain('Validation failed');
    });

    it('should return 401 for invalid credentials', async () => {
      db.queryOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'wrong' });

      expect(response.status).toBe(401);
      const error = response.body.error?.message || response.body.error;
      expect(error).toBe('Invalid credentials');
    });

    it('should return tokens for valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('TestPassword123', 12);
      
      db.queryOne.mockResolvedValue({
        id: 1,
        username: 'test',
        email: 'test@example.com',
        password_hash: hash,
        totp_secret: null
      });
      db.run.mockResolvedValue({ affectedRows: 1 });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'TestPassword123' });

      expect(response.status).toBe(200);
      const data = response.body.data || response.body;
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('refresh_token');
      expect(data.token_type).toBe('Bearer');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should return 400 if username or password is missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({});

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
      db.queryOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'testuser', password: 'weak' });

      expect(response.status).toBe(400);
      const error = response.body.error?.message || response.body.error;
      expect(error).toContain('Validation failed');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 400 if refresh token is missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      const error = response.body.error?.message || response.body.error;
      expect(error).toContain('Validation failed');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/validate', () => {
    it('should return 401 without authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/validate');

      expect(response.status).toBe(401);
    });
  });
});
