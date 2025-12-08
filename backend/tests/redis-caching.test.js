/**
 * Redis Caching Integration Tests
 */
const request = require('supertest');

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

// Mock the database
jest.mock('../src/config/database', () => ({
  connect: jest.fn(),
  initSchema: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  run: jest.fn(),
  isSQLite: true,
  getReplicationStatus: jest.fn(() => ({ enabled: false, message: 'Replication is disabled' })),
}));

const db = require('../src/config/database');

// Set up environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.REDIS_URL = 'redis://localhost:6379';

describe('Redis Caching', () => {
  let app;
  let userToken;

  beforeAll(async () => {
    // Import app after mocking
    app = require('../src/index');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    const jwt = require('jsonwebtoken');
    userToken = jwt.sign({ userId: 1, username: 'testuser' }, process.env.JWT_SECRET);
  });

  describe('Notes List Caching', () => {
    it('should cache notes list on first request', async () => {
      const mockNotes = [
        { id: 1, title: 'Note 1', content: 'Content 1', owner_id: 1 },
        { id: 2, title: 'Note 2', content: 'Content 2', owner_id: 1 },
      ];

      mockRedis.get.mockResolvedValue(null); // Cache miss
      db.query.mockResolvedValue(mockNotes);
      mockRedis.set.mockResolvedValue('OK');

      const response = await request(app)
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.notes).toHaveLength(2);
      
      // Should attempt to get from cache
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('notes:user:1')
      );
      
      // Should cache the result
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('notes:user:1'),
        expect.any(String),
        'EX',
        600 // 10 minutes TTL
      );
    });

    it('should return cached notes on subsequent requests', async () => {
      const cachedNotes = JSON.stringify({
        notes: [
          { id: 1, title: 'Cached Note', content: 'From Redis' },
        ]
      });

      mockRedis.get.mockResolvedValue(cachedNotes); // Cache hit

      const response = await request(app)
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.notes).toHaveLength(1);
      expect(response.body.notes[0].title).toBe('Cached Note');
      
      // Should not query database
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should invalidate cache when note is created', async () => {
      db.run.mockResolvedValue({ changes: 1, lastID: 1 });
      db.queryOne.mockResolvedValue({
        id: 1,
        title: 'New Note',
        content: 'Content',
        owner_id: 1
      });

      // Mock SCAN to return cache keys
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['notes:user:1:page:1', 'notes:user:1:page:2']])
        .mockResolvedValueOnce(['0', []]);
      mockRedis.del.mockResolvedValue(2);

      const response = await request(app)
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'New Note',
          content: 'Content'
        });

      expect(response.status).toBe(201);
      
      // Should invalidate cache using SCAN
      expect(mockRedis.scan).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should invalidate cache when note is updated', async () => {
      const mockNote = {
        id: 1,
        title: 'Original',
        content: 'Content',
        owner_id: 1
      };

      db.queryOne.mockResolvedValue(mockNote);
      db.run.mockResolvedValue({ changes: 1 });
      
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['notes:user:1']])
        .mockResolvedValueOnce(['0', []]);
      mockRedis.del.mockResolvedValue(1);

      const response = await request(app)
        .put('/api/v1/notes/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Updated',
          content: 'New content'
        });

      expect(response.status).toBe(200);
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should invalidate cache when note is deleted', async () => {
      const mockNote = {
        id: 1,
        owner_id: 1
      };

      db.queryOne.mockResolvedValue(mockNote);
      db.run.mockResolvedValue({ changes: 1 });
      
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['notes:user:1']])
        .mockResolvedValueOnce(['0', []]);
      mockRedis.del.mockResolvedValue(1);

      const response = await request(app)
        .delete('/api/v1/notes/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('Tags Caching', () => {
    it('should cache tags list', async () => {
      const mockTags = [
        { id: 1, name: 'work' },
        { id: 2, name: 'personal' },
      ];

      mockRedis.get.mockResolvedValue(null);
      db.query.mockResolvedValue(mockTags);
      mockRedis.set.mockResolvedValue('OK');

      const response = await request(app)
        .get('/api/v1/tags')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('tags:user:1'),
        expect.any(String),
        'EX',
        1800 // 30 minutes TTL
      );
    });

    it('should return cached tags', async () => {
      const cachedTags = JSON.stringify([
        { id: 1, name: 'cached-tag' }
      ]);

      mockRedis.get.mockResolvedValue(cachedTags);

      const response = await request(app)
        .get('/api/v1/tags')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].name).toBe('cached-tag');
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should invalidate tags cache when tag is added to note', async () => {
      const mockNote = { id: 1, owner_id: 1 };
      
      db.queryOne.mockResolvedValue(mockNote);
      db.run.mockResolvedValue({ changes: 1 });
      mockRedis.del.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/v1/notes/1/tags')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tag_name: 'new-tag' });

      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining('tags:user:1')
      );
    });
  });

  describe('Cache Error Handling', () => {
    it('should gracefully degrade when Redis is unavailable', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));
      
      const mockNotes = [
        { id: 1, title: 'Note 1', owner_id: 1 }
      ];
      db.query.mockResolvedValue(mockNotes);

      const response = await request(app)
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${userToken}`);

      // Should still return data from database
      expect(response.status).toBe(200);
      expect(response.body.notes).toHaveLength(1);
    });

    it('should not break on cache set errors', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValue(new Error('Redis set error'));
      
      const mockNotes = [
        { id: 1, title: 'Note 1', owner_id: 1 }
      ];
      db.query.mockResolvedValue(mockNotes);

      const response = await request(app)
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.notes).toHaveLength(1);
    });

    it('should handle SCAN iteration limit', async () => {
      // Simulate many iterations
      mockRedis.scan.mockImplementation((cursor) => {
        if (cursor === '0') {
          return Promise.resolve(['1', ['key1']]);
        }
        // Keep returning new cursors to test max iteration
        return Promise.resolve([String(parseInt(cursor) + 1), ['key' + cursor]]);
      });

      mockRedis.del.mockResolvedValue(1);

      const mockNote = {
        id: 1,
        owner_id: 1
      };

      db.queryOne.mockResolvedValue(mockNote);
      db.run.mockResolvedValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/v1/notes/1')
        .set('Authorization', `Bearer ${userToken}`);

      // Should still complete successfully
      expect(response.status).toBe(200);
      
      // SCAN should have been called but limited
      expect(mockRedis.scan).toHaveBeenCalled();
    });
  });

  describe('Cache Performance', () => {
    it('should use appropriate TTL for different resources', async () => {
      // Notes: 10 minutes
      mockRedis.get.mockResolvedValue(null);
      db.query.mockResolvedValue([]);
      mockRedis.set.mockResolvedValue('OK');

      await request(app)
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        600
      );

      jest.clearAllMocks();

      // Tags: 30 minutes
      await request(app)
        .get('/api/v1/tags')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        1800
      );
    });
  });
});
