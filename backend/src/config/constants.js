/**
 * Application-wide constants and configuration values.
 */

module.exports = {
  // Search configuration
  SEARCH_MIN_LENGTH: parseInt(process.env.SEARCH_MIN_LENGTH || '3', 10),
  
  // Cache TTL (Time To Live) in seconds
  CACHE_TTL: {
    NOTES_LIST: parseInt(process.env.CACHE_TTL_NOTES || '600', 10), // 10 minutes
    NOTES_SEARCH: parseInt(process.env.CACHE_TTL_SEARCH || '300', 10), // 5 minutes
    TAGS: parseInt(process.env.CACHE_TTL_TAGS || '1800', 10), // 30 minutes
    USER_SESSION: parseInt(process.env.CACHE_TTL_SESSION || '3600', 10), // 1 hour
  },
  
  // Redis configuration
  REDIS: {
    MAX_RETRIES: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    RETRY_BASE_DELAY: parseInt(process.env.REDIS_RETRY_BASE_DELAY || '100', 10), // ms
    RETRY_MAX_DELAY: parseInt(process.env.REDIS_RETRY_MAX_DELAY || '3000', 10), // ms
    SCAN_COUNT: parseInt(process.env.REDIS_SCAN_COUNT || '100', 10),
  },
  
  // Elasticsearch configuration
  ELASTICSEARCH: {
    REFRESH_STRATEGY: process.env.ES_REFRESH_STRATEGY || 'wait_for', // 'wait_for' or 'false'
    BULK_REFRESH_STRATEGY: process.env.ES_BULK_REFRESH_STRATEGY || 'false',
    REPLICAS_DEV: parseInt(process.env.ES_REPLICAS_DEV || '0', 10),
    REPLICAS_PROD: parseInt(process.env.ES_REPLICAS_PROD || '1', 10),
  }
};
