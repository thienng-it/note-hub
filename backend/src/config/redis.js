/**
 * Redis cache configuration and connection management.
 * Provides caching for frequently accessed data.
 */
import Redis from 'ioredis';
import {  REDIS  } from './constants.js';

// Import metrics recording function - use lazy loading to avoid circular dependency
let recordCacheOperation = null;
async function getMetrics() {
  if (!recordCacheOperation) {
    try {
      const metrics = await import('../middleware/metrics.js');
      recordCacheOperation = metrics.recordCacheOperation;
    } catch (_error) {
      // Metrics not available yet, use noop
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentional noop for lazy loading
      recordCacheOperation = () => {};
    }
  }
  return recordCacheOperation;
}

class RedisCache {
  constructor() {
    this.client = null;
    this.enabled = false;
  }

  /**
   * Initialize Redis connection.
   * Redis is optional - app works without it.
   */
  async connect() {
    // Check if Redis is configured
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && !redisHost) {
      console.log('⚠️  Redis not configured - caching disabled');
      this.enabled = false;
      return;
    }

    try {
      // Connect using URL or host/port
      const retryStrategy = (times) => {
        if (times > REDIS.MAX_RETRIES) return null;
        return Math.min(times * REDIS.RETRY_BASE_DELAY, REDIS.RETRY_MAX_DELAY);
      };

      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: REDIS.MAX_RETRIES,
          retryStrategy,
        });
      } else {
        this.client = new Redis({
          host: redisHost || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0', 10),
          maxRetriesPerRequest: REDIS.MAX_RETRIES,
          retryStrategy,
        });
      }

      // Test connection
      await this.client.ping();
      this.enabled = true;

      const host = redisHost || (redisUrl ? 'URL' : 'localhost');
      console.log(`🔴 Connected to Redis: ${host}`);

      // Handle connection errors gracefully
      this.client.on('error', (err) => {
        console.error('Redis error:', err.message);
        this.enabled = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis ready');
        this.enabled = true;
      });
    } catch (error) {
      console.error('⚠️  Redis connection failed:', error.message);
      console.log('⚠️  Continuing without cache - performance may be slower');
      this.enabled = false;
      this.client = null;
    }
  }

  /**
   * Get value from cache.
   */
  async get(key) {
    if (!this.enabled || !this.client) {
      const recordMetrics = getMetrics();
      recordMetrics('get', 'disabled');
      return null;
    }

    try {
      const value = await this.client.get(key);
      const result = value ? 'hit' : 'miss';
      const recordMetrics = getMetrics();
      recordMetrics('get', result);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error.message);
      const recordMetrics = getMetrics();
      recordMetrics('get', 'error');
      return null;
    }
  }

  /**
   * Set value in cache with TTL (seconds).
   */
  async set(key, value, ttl = 3600) {
    if (!this.enabled || !this.client) {
      const recordMetrics = getMetrics();
      recordMetrics('set', 'disabled');
      return false;
    }

    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      const recordMetrics = getMetrics();
      recordMetrics('set', 'success');
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error.message);
      const recordMetrics = getMetrics();
      recordMetrics('set', 'error');
      return false;
    }
  }

  /**
   * Delete value from cache.
   */
  async del(key) {
    if (!this.enabled || !this.client) {
      const recordMetrics = getMetrics();
      recordMetrics('del', 'disabled');
      return false;
    }

    try {
      await this.client.del(key);
      const recordMetrics = getMetrics();
      recordMetrics('del', 'success');
      return true;
    } catch (error) {
      console.error(`Cache del error for key ${key}:`, error.message);
      const recordMetrics = getMetrics();
      recordMetrics('del', 'error');
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern.
   * Uses SCAN instead of KEYS to avoid blocking Redis.
   */
  async delPattern(pattern) {
    if (!this.enabled || !this.client) return false;

    try {
      let cursor = '0';
      let _deletedCount = 0;
      let iterations = 0;
      const maxIterations = 1000; // Prevent infinite loops

      do {
        // Use SCAN instead of KEYS to avoid blocking
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          REDIS.SCAN_COUNT,
        );

        cursor = nextCursor;
        iterations++;

        if (keys.length > 0) {
          await this.client.del(...keys);
          _deletedCount += keys.length;
        }

        // Safety check to prevent infinite loops
        if (iterations >= maxIterations) {
          console.warn(
            `Cache delPattern reached max iterations (${maxIterations}) for pattern ${pattern}`,
          );
          break;
        }
      } while (cursor !== '0');

      return true;
    } catch (error) {
      console.error(`Cache delPattern error for pattern ${pattern}:`, error.message);
      return false;
    }
  }

  /**
   * Check if caching is enabled.
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Close Redis connection.
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.enabled = false;
    }
  }
}

// Singleton instance
const cache = new RedisCache();

export default cache;
