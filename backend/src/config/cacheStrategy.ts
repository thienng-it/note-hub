/**
 * Advanced Caching Strategies
 *
 * Implements intelligent caching patterns for improved performance:
 * - Cache-aside pattern
 * - Write-through caching
 * - Cache warming
 * - Intelligent TTL management
 */

import type { CacheConfig } from '../types';

/**
 * Cache key patterns for different entity types
 */
export const CacheKeys = {
  // User-related keys
  user: (userId: number | string) => `user:${userId}`,
  userProfile: (userId: number | string) => `user:${userId}:profile`,
  userSettings: (userId: number | string) => `user:${userId}:settings`,
  
  // Note-related keys
  note: (noteId: number | string) => `note:${noteId}`,
  notesList: (userId: number | string, filter?: string) => 
    `notes:${userId}${filter ? `:${filter}` : ''}`,
  notesSearch: (userId: number | string, query: string) => 
    `notes:${userId}:search:${query}`,
  notesByTag: (userId: number | string, tag: string) => 
    `notes:${userId}:tag:${tag}`,
  
  // Task-related keys
  task: (taskId: number | string) => `task:${taskId}`,
  tasksList: (userId: number | string, status?: string) => 
    `tasks:${userId}${status ? `:${status}` : ''}`,
  
  // Tag-related keys
  tags: (userId: number | string) => `tags:${userId}`,
  tagsList: () => 'tags:all',
  
  // Session keys
  session: (tokenId: string) => `session:${tokenId}`,
  refreshToken: (tokenHash: string) => `refresh:${tokenHash}`,
  
  // Rate limiting keys
  rateLimit: (identifier: string, endpoint: string) => 
    `rate:${endpoint}:${identifier}`,
} as const;

/**
 * TTL (Time To Live) configuration for different cache types
 */
export const CacheTTL = {
  // Short-lived caches (5 minutes)
  SHORT: 5 * 60,
  
  // Medium-lived caches (30 minutes)
  MEDIUM: 30 * 60,
  
  // Long-lived caches (2 hours)
  LONG: 2 * 60 * 60,
  
  // Session caches (24 hours)
  SESSION: 24 * 60 * 60,
  
  // Specific entity TTLs
  user: 30 * 60,           // 30 minutes
  note: 10 * 60,           // 10 minutes
  notesList: 5 * 60,       // 5 minutes
  notesSearch: 3 * 60,     // 3 minutes
  task: 10 * 60,           // 10 minutes
  tasksList: 5 * 60,       // 5 minutes
  tags: 30 * 60,           // 30 minutes
  session: 24 * 60 * 60,   // 24 hours
  refreshToken: 7 * 24 * 60 * 60, // 7 days
} as const;

/**
 * Cache invalidation patterns
 */
export const InvalidationPatterns = {
  // Invalidate all user-related caches
  user: (userId: number | string): string[] => [
    CacheKeys.user(userId),
    CacheKeys.userProfile(userId),
    CacheKeys.userSettings(userId),
    `${CacheKeys.notesList(userId)}*`,
    `${CacheKeys.tasksList(userId)}*`,
    CacheKeys.tags(userId),
  ],
  
  // Invalidate note-related caches
  note: (userId: number | string, noteId: number | string): string[] => [
    CacheKeys.note(noteId),
    `${CacheKeys.notesList(userId)}*`,
    `${CacheKeys.notesSearch(userId, '')}*`,
    CacheKeys.tags(userId),
  ],
  
  // Invalidate task-related caches
  task: (userId: number | string, taskId: number | string): string[] => [
    CacheKeys.task(taskId),
    `${CacheKeys.tasksList(userId)}*`,
  ],
  
  // Invalidate tag-related caches
  tags: (userId: number | string): string[] => [
    CacheKeys.tags(userId),
    `${CacheKeys.notesList(userId)}*`,
  ],
} as const;

/**
 * Cache warming configuration
 * Pre-populate cache with frequently accessed data
 */
export const CacheWarmingConfig = {
  enabled: process.env.CACHE_WARMING_ENABLED === 'true',
  
  // Warm cache on application startup
  onStartup: true,
  
  // Warm cache periodically
  periodic: true,
  
  // Warming interval (milliseconds) - default 1 hour
  interval: parseInt(process.env.CACHE_WARMING_INTERVAL || String(60 * 60 * 1000), 10),
  
  // Entities to warm
  entities: ['notes', 'tasks', 'tags'] as const,
  
  // Maximum users to warm (prevent memory exhaustion)
  maxUsers: parseInt(process.env.CACHE_WARMING_MAX_USERS || '100', 10),
};

/**
 * Cache statistics tracking
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

/**
 * Cache options for different strategies
 */
export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  compress?: boolean;
  serialize?: boolean;
}

/**
 * Cache strategy: Cache-aside (Lazy Loading)
 * 
 * 1. Check cache first
 * 2. If miss, fetch from database
 * 3. Store in cache for future requests
 */
export const CacheStrategies = {
  /**
   * Read-through cache strategy
   */
  readThrough: async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> => {
    // This is a template - actual implementation would use Redis client
    // const cached = await redis.get(key);
    // if (cached) return JSON.parse(cached);
    
    const data = await fetchFn();
    
    // await redis.setex(key, options.ttl || CacheTTL.MEDIUM, JSON.stringify(data));
    return data;
  },
  
  /**
   * Write-through cache strategy
   */
  writeThrough: async <T>(
    key: string,
    data: T,
    saveFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> => {
    // Save to database first
    const saved = await saveFn();
    
    // Then update cache
    // await redis.setex(key, options.ttl || CacheTTL.MEDIUM, JSON.stringify(saved));
    
    return saved;
  },
  
  /**
   * Write-behind (write-back) cache strategy
   */
  writeBehind: async <T>(
    key: string,
    data: T,
    saveFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> => {
    // Update cache immediately
    // await redis.setex(key, options.ttl || CacheTTL.MEDIUM, JSON.stringify(data));
    
    // Queue database write (async)
    setImmediate(() => {
      saveFn().catch((error) => {
        console.error('Write-behind cache error:', error);
      });
    });
    
    return data;
  },
};

/**
 * Batch cache operations for improved performance
 */
export const BatchOperations = {
  /**
   * Get multiple keys at once
   */
  mget: async (keys: string[]): Promise<Map<string, any>> => {
    // const values = await redis.mget(keys);
    const result = new Map<string, any>();
    // keys.forEach((key, index) => {
    //   if (values[index]) result.set(key, JSON.parse(values[index]));
    // });
    return result;
  },
  
  /**
   * Set multiple keys at once
   */
  mset: async (entries: Map<string, any>, ttl?: number): Promise<void> => {
    // const pipeline = redis.pipeline();
    // entries.forEach((value, key) => {
    //   pipeline.setex(key, ttl || CacheTTL.MEDIUM, JSON.stringify(value));
    // });
    // await pipeline.exec();
  },
  
  /**
   * Delete multiple keys at once
   */
  mdel: async (keys: string[]): Promise<void> => {
    // await redis.del(...keys);
  },
};

export default {
  CacheKeys,
  CacheTTL,
  InvalidationPatterns,
  CacheWarmingConfig,
  CacheStrategies,
  BatchOperations,
};
