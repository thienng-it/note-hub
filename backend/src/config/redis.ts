/**
 * Redis cache configuration and connection management.
 * Provides caching for frequently accessed data.
 */
import Redis from 'ioredis';
import { REDIS } from './constants';

class RedisCache {
  private client: Redis | null;
  private enabled: boolean;

  constructor() {
    this.client = null;
    this.enabled = false;
  }

  /**
   * Initialize Redis connection.
   * Redis is optional - app works without it.
   */
  async connect(): Promise<void> {
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
      const retryStrategy = (times: number): number | null => {
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
      this.client.on('error', (err: Error) => {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('⚠️  Redis connection failed:', errorMessage);
      console.log('⚠️  Continuing without cache - performance may be slower');
      this.enabled = false;
      this.client = null;
    }
  }

  /**
   * Get value from cache.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Cache get error for key ${key}:`, errorMessage);
      return null;
    }
  }

  /**
   * Set value in cache with TTL (seconds).
   */
  async set(key: string, value: unknown, ttl = 3600): Promise<boolean> {
    if (!this.enabled || !this.client) return false;

    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Cache set error for key ${key}:`, errorMessage);
      return false;
    }
  }

  /**
   * Delete value from cache.
   */
  async del(key: string): Promise<boolean> {
    if (!this.enabled || !this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`Cache del error for key ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern.
   * Uses SCAN instead of KEYS to avoid blocking Redis.
   */
  async delPattern(pattern: string): Promise<boolean> {
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
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`Cache delPattern error for pattern ${pattern}:`, err.message);
      return false;
    }
  }

  /**
   * Check if caching is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Close Redis connection.
   */
  async close(): Promise<void> {
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
