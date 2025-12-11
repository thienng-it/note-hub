/**
 * Health Check Endpoint Tests
 * Tests for both /api/health and /api/v1/health endpoints
 */
import { jest } from '@jest/globals';

// Create mocks before importing modules
const mockDb = {
  connect: jest.fn().mockResolvedValue(),
  initSchema: jest.fn().mockResolvedValue(),
  query: jest.fn().mockResolvedValue([]),
  queryOne: jest.fn().mockResolvedValue(null),
  run: jest.fn().mockResolvedValue({ insertId: 1, changes: 1 }),
  close: jest.fn().mockResolvedValue(),
  isSQLite: true,
  getReplicationStatus: jest
    .fn()
    .mockReturnValue({ enabled: false, message: 'Replication is disabled' }),
  getPoolMetrics: jest.fn().mockReturnValue(null),
};

const mockRedis = {
  connect: jest.fn().mockResolvedValue(),
  isEnabled: jest.fn().mockReturnValue(false),
  close: jest.fn().mockResolvedValue(),
};

const mockElasticsearch = {
  connect: jest.fn().mockResolvedValue(),
  isEnabled: jest.fn().mockReturnValue(false),
  close: jest.fn().mockResolvedValue(),
};

const mockModels = {
  initializeSequelize: jest.fn().mockResolvedValue(),
  syncDatabase: jest.fn().mockResolvedValue(),
  closeDatabase: jest.fn().mockResolvedValue(),
};

// Use unstable_mockModule for ESM
jest.unstable_mockModule('../src/config/database.js', () => ({ default: mockDb }));
jest.unstable_mockModule('../src/config/redis.js', () => ({ default: mockRedis }));
jest.unstable_mockModule('../src/config/elasticsearch.js', () => ({ default: mockElasticsearch }));
jest.unstable_mockModule('../src/models/index.js', () => mockModels);

// Now import the modules and the app
const { default: request } = await import('supertest');
const { default: db } = await import('../src/config/database.js');

describe('Health Check Endpoints', () => {
  let app;

  beforeAll(async () => {
    app = (await import('../src/index.js')).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 with health status when database is healthy', async () => {
      db.queryOne.mockResolvedValue({ count: 5 });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'healthy',
        database: 'connected',
        services: {
          cache: 'disabled',
          search: 'disabled',
          replication: 'disabled',
        },
        user_count: 5,
      });
    });

    it('should return 503 when database is unhealthy', async () => {
      db.queryOne.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Database connection failed');
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with standardized v1 response format', async () => {
      db.queryOne.mockResolvedValue({ count: 10 });

      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service is healthy');
      expect(response.body.data).toEqual({
        status: 'healthy',
        database: 'connected',
        services: {
          cache: 'disabled',
          search: 'disabled',
          replication: 'disabled',
        },
        user_count: 10,
      });
    });
  });
});
