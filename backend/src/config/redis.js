/**
 * Redis cache configuration and connection management.
 * Provides caching for frequently accessed data.
 */
const Redis = require('ioredis');

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
      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) return null; // Stop retrying after 3 attempts
            return Math.min(times * 100, 3000); // Exponential backoff
          }
        });
      } else {
        this.client = new Redis({
          host: redisHost || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0', 10),
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          }
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
    if (!this.enabled || !this.client) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache with TTL (seconds).
   */
  async set(key, value, ttl = 3600) {
    if (!this.enabled || !this.client) return false;
    
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete value from cache.
   */
  async del(key) {
    if (!this.enabled || !this.client) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache del error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern.
   */
  async delPattern(pattern) {
    if (!this.enabled || !this.client) return false;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
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

module.exports = cache;
