/**
 * Database Connection Pooling Configuration
 *
 * Optimizes database connections for better performance and resource utilization.
 * Implements connection pooling strategies for both MySQL and SQLite.
 */

/**
 * MySQL Connection Pool Configuration
 */
export const mysqlPoolConfig = {
  // Connection pool settings
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),

  // Queue limit (0 = unlimited)
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),

  // Wait for connections
  waitForConnections: true,

  // Connection timeout (milliseconds)
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),

  // Acquire timeout (milliseconds) - time to wait for connection from pool
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000', 10),

  // Idle timeout (milliseconds) - time before idle connection is released
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60000', 10),

  // Enable multiple statements
  multipleStatements: false,

  // Connection charset
  charset: 'utf8mb4',

  // Timezone
  timezone: process.env.DB_TIMEZONE || 'Z',

  // Date strings
  dateStrings: false,

  // Enable keep-alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

/**
 * SQLite Connection Configuration
 */
export const sqliteConfig = {
  // WAL mode for better concurrency
  walMode: true,

  // Foreign keys enforcement
  foreignKeys: true,

  // Synchronous mode (NORMAL is good balance)
  synchronous: process.env.SQLITE_SYNC_MODE || 'NORMAL',

  // Cache size (negative = KB, positive = pages)
  cacheSize: parseInt(process.env.SQLITE_CACHE_SIZE || '-2000', 10), // 2MB

  // Temp store (MEMORY for better performance)
  tempStore: 'MEMORY',

  // Busy timeout (milliseconds)
  busyTimeout: parseInt(process.env.SQLITE_BUSY_TIMEOUT || '5000', 10),
};

/**
 * Redis Connection Pool Configuration
 */
export const redisPoolConfig = {
  // Maximum number of clients in pool
  maxClients: parseInt(process.env.REDIS_POOL_SIZE || '10', 10),

  // Minimum number of clients in pool
  minClients: parseInt(process.env.REDIS_POOL_MIN || '2', 10),

  // Connection timeout (milliseconds)
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),

  // Command timeout (milliseconds)
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),

  // Enable keep-alive
  keepAlive: parseInt(process.env.REDIS_KEEPALIVE || '30000', 10),

  // Max retry attempts
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),

  // Retry strategy
  retryStrategy(times: number): number {
    const baseDelay = 100;
    const maxDelay = 3000;
    const delay = Math.min(baseDelay * 2 ** (times - 1), maxDelay);
    return delay;
  },

  // Reconnect on error
  reconnectOnError(err: Error): boolean | 1 | 2 {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some((targetError) => err.message.includes(targetError));
  },
};

/**
 * Connection Pool Health Check Configuration
 */
export const poolHealthCheck = {
  // Check interval (milliseconds)
  interval: parseInt(process.env.POOL_HEALTH_CHECK_INTERVAL || '30000', 10),

  // Timeout for health check query (milliseconds)
  timeout: parseInt(process.env.POOL_HEALTH_CHECK_TIMEOUT || '5000', 10),

  // Health check query
  query: 'SELECT 1',

  // Log health check failures
  logFailures: process.env.NODE_ENV === 'production',
};

import os from 'node:os';

/**
 * Get optimal pool size based on available resources
 */
export function getOptimalPoolSize(type: 'mysql' | 'redis' | 'generic' = 'generic'): number {
  const cpuCount = os.cpus().length;

  switch (type) {
    case 'mysql':
      // Rule of thumb: (core_count * 2) + effective_spindle_count
      // For SSDs, effective_spindle_count ≈ 1
      return Math.min(cpuCount * 2 + 1, 20);

    case 'redis':
      // Redis is single-threaded, so moderate pool size
      return Math.min(cpuCount, 10);

    default:
      return Math.min(cpuCount * 2, 10);
  }
}

/**
 * Pool monitoring metrics
 */
export interface PoolMetrics {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalConnections: number;
  poolSize: number;
}

export default {
  mysqlPoolConfig,
  sqliteConfig,
  redisPoolConfig,
  poolHealthCheck,
  getOptimalPoolSize,
};
