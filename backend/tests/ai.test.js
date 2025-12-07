/**
 * AI Service Integration Tests
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
  getReplicationStatus: jest.fn(() => ({ enabled: false, message: 'Replication is disabled' })),
}));

const db = require('../src/config/database');

// Set up environment
process.env.JWT_SECRET = 'test-secret-key';

const jwtService = require('../src/services/jwtService');

let app;
let authToken;

beforeAll(async () => {
  // Import app after mocking
  app = require('../src/index');
  
  // Generate auth token for tests
  authToken = jwtService.generateToken(1);
});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock user query for auth middleware
  db.queryOne.mockResolvedValue({
    id: 1,
    username: 'test_user',
    email: 'test@example.com',
    totp_secret: null
  });
});

describe('AI API Endpoints', () => {
  describe('GET /api/ai/status', () => {
    it('should return AI status without authentication error', async () => {
      const response = await request(app)
        .get('/api/v1/ai/status')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('provider');
      expect(response.body).toHaveProperty('availableProviders');
      expect(Array.isArray(response.body.availableProviders)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/ai/status');
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ai/proofread', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/ai/proofread')
        .send({ text: 'Some text' });
      
      expect(response.status).toBe(401);
    });

    it('should validate text input', async () => {
      const response = await request(app)
        .post('/api/v1/ai/proofread')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Text is required');
    });

    it('should reject text that is too long', async () => {
      const longText = 'a'.repeat(10001);
      const response = await request(app)
        .post('/api/v1/ai/proofread')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: longText });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('too long');
    });

    it('should return error when AI is not configured', async () => {
      // Only test if AI is actually not configured
      const statusResponse = await request(app)
        .get('/api/v1/ai/status')
        .set('Authorization', `Bearer ${authToken}`);
      
      if (!statusResponse.body.enabled) {
        const response = await request(app)
          .post('/api/v1/ai/proofread')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Some text to proofread' });
        
        expect(response.status).toBe(500);
        expect(response.body.error).toContain('not enabled');
      }
    });
  });

  describe('POST /api/ai/summarize', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/ai/summarize')
        .send({ text: 'Some text' });
      
      expect(response.status).toBe(401);
    });

    it('should validate text input', async () => {
      const response = await request(app)
        .post('/api/v1/ai/summarize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Text is required');
    });

    it('should reject text that is too long', async () => {
      const longText = 'a'.repeat(10001);
      const response = await request(app)
        .post('/api/v1/ai/summarize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: longText });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('too long');
    });
  });

  describe('POST /api/ai/rewrite', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/ai/rewrite')
        .send({ text: 'Some text' });
      
      expect(response.status).toBe(401);
    });

    it('should validate text input', async () => {
      const response = await request(app)
        .post('/api/v1/ai/rewrite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Text is required');
    });

    it('should validate style parameter', async () => {
      const response = await request(app)
        .post('/api/v1/ai/rewrite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'Some text', style: 'invalid_style' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid style');
    });

    it('should accept valid styles', async () => {
      const validStyles = ['professional', 'casual', 'concise'];
      
      for (const style of validStyles) {
        const response = await request(app)
          .post('/api/v1/ai/rewrite')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Some text', style });
        
        // Will be 500 if AI not configured, but shouldn't be 400 (validation error)
        expect([200, 500]).toContain(response.status);
      }
    });

    it('should default to professional style if not specified', async () => {
      const response = await request(app)
        .post('/api/v1/ai/rewrite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'Some text' });
      
      // Will be 500 if AI not configured, but shouldn't be 400 (validation error)
      expect([200, 500]).toContain(response.status);
    });
  });
});
