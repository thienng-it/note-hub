/**
 * Health Check Endpoint Tests
 * Tests for both /api/health and /api/v1/health endpoints
 */
const request = require('supertest');

// Mock the database
jest.mock('../src/config/database', () => ({
  connect: jest.fn(),
  initSchema: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  run: jest.fn(),
  isSQLite: true,
  getReplicationStatus: jest.fn(() => ({ enabled: false, message: 'Replication is disabled' }))
}));

// Mock Redis
jest.mock('../src/config/redis', () => ({
  connect: jest.fn(),
  isEnabled: jest.fn(() => false),
  close: jest.fn()
}));

// Mock Elasticsearch
jest.mock('../src/config/elasticsearch', () => ({
  connect: jest.fn(),
  isEnabled: jest.fn(() => false),
  close: jest.fn()
}));

// Mock Sequelize models
jest.mock('../src/models', () => ({
  initializeSequelize: jest.fn(),
  syncDatabase: jest.fn(),
  closeDatabase: jest.fn()
}));

const db = require('../src/config/database');

describe('Health Check Endpoints', () => {
  let app;

  beforeAll(async () => {
    // Import app after mocking
    app = require('../src/index');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 with health status when database is healthy', async () => {
      db.queryOne.mockResolvedValue({ count: 5 });

      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'healthy',
        database: 'connected',
        services: {
          cache: 'disabled',
          search: 'disabled',
          replication: 'disabled'
        },
        user_count: 5
      });
    });

    it('should return 503 when database is unhealthy', async () => {
      db.queryOne.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Database connection failed');
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with standardized v1 response format', async () => {
      db.queryOne.mockResolvedValue({ count: 10 });

      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service is healthy');
      expect(response.body.data).toEqual({
        status: 'healthy',
        database: 'connected',
        services: {
          cache: 'disabled',
          search: 'disabled',
          replication: 'disabled'
        },
        user_count: 10
      });
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('version', 'v1');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    it('should return 503 with standardized error format when unhealthy', async () => {
      db.queryOne.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message', 'Service is unhealthy');
      expect(response.body.error).toHaveProperty('code', 'SERVICE_UNAVAILABLE');
    });
  });
});
