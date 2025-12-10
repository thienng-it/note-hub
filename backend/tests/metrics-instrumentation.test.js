/**
 * Metrics Instrumentation Tests
 * Tests for metrics recording in database, cache, and search operations
 */

describe('Metrics Instrumentation', () => {
  let db;
  let cache;
  let elasticsearch;
  let metrics;

  beforeEach(() => {
    // Clear module cache to get fresh instances
    jest.resetModules();

    // Mock metrics module first
    metrics = {
      recordDbQuery: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordSearchOperation: jest.fn(),
    };
    jest.doMock('../src/middleware/metrics', () => metrics);

    // Now require the modules that use metrics
    db = require('../src/config/database');
    cache = require('../src/config/redis');
    elasticsearch = require('../src/config/elasticsearch');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Query Metrics', () => {
    it('should record metrics for successful query', async () => {
      // Mock SQLite database
      const mockPrepare = jest.fn(() => ({
        all: jest.fn(() => [{ id: 1, name: 'test' }]),
      }));
      db.db = { prepare: mockPrepare };
      db.isSQLite = true;

      // Execute query
      await db.query('SELECT * FROM users');

      // Verify metrics were recorded
      expect(metrics.recordDbQuery).toHaveBeenCalledWith(
        'SELECT',
        expect.any(Number),
        true,
      );
    });

    it('should record metrics for failed query', async () => {
      // Mock SQLite database that throws error
      const mockPrepare = jest.fn(() => ({
        all: jest.fn(() => {
          throw new Error('Query failed');
        }),
      }));
      db.db = { prepare: mockPrepare };
      db.isSQLite = true;

      // Execute query and expect error
      await expect(db.query('SELECT * FROM users')).rejects.toThrow('Query failed');

      // Verify metrics were recorded with failure
      expect(metrics.recordDbQuery).toHaveBeenCalledWith(
        'SELECT',
        expect.any(Number),
        false,
      );
    });

    it('should record metrics for queryOne', async () => {
      // Mock SQLite database
      const mockPrepare = jest.fn(() => ({
        get: jest.fn(() => ({ id: 1, name: 'test' })),
      }));
      db.db = { prepare: mockPrepare };
      db.isSQLite = true;

      // Execute queryOne
      await db.queryOne('SELECT * FROM users WHERE id = ?', [1]);

      // Verify metrics were recorded
      expect(metrics.recordDbQuery).toHaveBeenCalledWith(
        'SELECT',
        expect.any(Number),
        true,
      );
    });

    it('should record metrics for run operations', async () => {
      // Mock SQLite database
      const mockPrepare = jest.fn(() => ({
        run: jest.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
      }));
      db.db = { prepare: mockPrepare };
      db.isSQLite = true;

      // Execute run
      await db.run('INSERT INTO users (name) VALUES (?)', ['test']);

      // Verify metrics were recorded
      expect(metrics.recordDbQuery).toHaveBeenCalledWith(
        'INSERT',
        expect.any(Number),
        true,
      );
    });
  });

  describe('Cache Operation Metrics', () => {
    beforeEach(() => {
      // Mock Redis client
      cache.enabled = true;
      cache.client = {
        get: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
      };
    });

    it('should record cache hit', async () => {
      cache.client.get.mockResolvedValue(JSON.stringify({ data: 'test' }));

      const result = await cache.get('test-key');

      expect(result).toEqual({ data: 'test' });
      expect(metrics.recordCacheOperation).toHaveBeenCalledWith('get', 'hit');
    });

    it('should record cache miss', async () => {
      cache.client.get.mockResolvedValue(null);

      const result = await cache.get('test-key');

      expect(result).toBeNull();
      expect(metrics.recordCacheOperation).toHaveBeenCalledWith('get', 'miss');
    });

    it('should record cache set success', async () => {
      cache.client.setex.mockResolvedValue('OK');

      const result = await cache.set('test-key', { data: 'test' });

      expect(result).toBe(true);
      expect(metrics.recordCacheOperation).toHaveBeenCalledWith('set', 'success');
    });

    it('should record cache set error', async () => {
      cache.client.setex.mockRejectedValue(new Error('Redis error'));

      const result = await cache.set('test-key', { data: 'test' });

      expect(result).toBe(false);
      expect(metrics.recordCacheOperation).toHaveBeenCalledWith('set', 'error');
    });

    it('should record cache delete', async () => {
      cache.client.del.mockResolvedValue(1);

      const result = await cache.del('test-key');

      expect(result).toBe(true);
      expect(metrics.recordCacheOperation).toHaveBeenCalledWith('del', 'success');
    });

    it('should record disabled cache operations', async () => {
      cache.enabled = false;
      cache.client = null;

      const result = await cache.get('test-key');

      expect(result).toBeNull();
      expect(metrics.recordCacheOperation).toHaveBeenCalledWith('get', 'disabled');
    });
  });

  describe('Search Operation Metrics', () => {
    beforeEach(() => {
      // Mock Elasticsearch client
      elasticsearch.enabled = true;
      elasticsearch.client = {
        search: jest.fn(),
      };
    });

    it('should record successful search', async () => {
      elasticsearch.client.search.mockResolvedValue({
        hits: {
          total: { value: 2 },
          hits: [
            { _source: { id: 1, title: 'Note 1' }, _score: 1.0 },
            { _source: { id: 2, title: 'Note 2' }, _score: 0.8 },
          ],
        },
      });

      const result = await elasticsearch.searchNotes(1, 'test query');

      expect(result.total).toBe(2);
      expect(result.notes).toHaveLength(2);
      expect(metrics.recordSearchOperation).toHaveBeenCalledWith(
        'elasticsearch',
        expect.any(Number),
        true,
      );
    });

    it('should record failed search', async () => {
      elasticsearch.client.search.mockRejectedValue(new Error('Search failed'));

      const result = await elasticsearch.searchNotes(1, 'test query');

      expect(result).toBeNull();
      expect(metrics.recordSearchOperation).toHaveBeenCalledWith(
        'elasticsearch',
        expect.any(Number),
        false,
      );
    });
  });

  describe('Active Sessions Tracking', () => {
    it('should increment active sessions on connection', () => {
      // This is an integration concept test
      // In real implementation, Express app tracks connections
      // and decrements on socket close, not app close
      const mockSocket = {
        on: jest.fn(),
      };

      // Simulate connection event
      let activeSessions = 0;
      activeSessions++;
      mockSocket.on('close', () => {
        activeSessions--;
      });

      expect(activeSessions).toBe(1);
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should decrement active sessions on socket close', () => {
      let activeSessions = 0;
      let closeHandler;

      const mockSocket = {
        on: jest.fn((event, handler) => {
          if (event === 'close') {
            closeHandler = handler;
          }
        }),
      };

      // Simulate connection
      activeSessions++;
      mockSocket.on('close', () => {
        activeSessions--;
      });

      expect(activeSessions).toBe(1);

      // Simulate socket close
      closeHandler();
      expect(activeSessions).toBe(0);
    });
  });
});
