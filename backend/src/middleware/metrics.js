/**
 * Prometheus Metrics Middleware
 *
 * Collects and exposes application metrics for Prometheus scraping.
 * Provides default Node.js metrics and custom application metrics.
 */
import promClient from 'prom-client';
import logger from '../config/logger.js';

// Create a Registry to register metrics
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics for NoteHub application

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // Buckets in seconds
  registers: [register],
});

// HTTP request counter
const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active connections gauge
const activeConnections = new promClient.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

// Database query duration histogram
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2], // Buckets in seconds
  registers: [register],
});

// Database query counter
const dbQueryTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Cache hit/miss counter
const cacheOperations = new promClient.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'],
  registers: [register],
});

// Application entity metrics
const notesTotal = new promClient.Gauge({
  name: 'notehub_notes_total',
  help: 'Total number of notes in the system',
  registers: [register],
});

const usersTotal = new promClient.Gauge({
  name: 'notehub_users_total',
  help: 'Total number of users in the system',
  registers: [register],
});

// Authentication metrics
const authAttempts = new promClient.Counter({
  name: 'notehub_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status', 'reason'],
  registers: [register],
});

const authActiveSessions = new promClient.Gauge({
  name: 'notehub_auth_active_sessions',
  help: 'Number of active user sessions',
  registers: [register],
});

const twoFactorUsage = new promClient.Counter({
  name: 'notehub_2fa_operations_total',
  help: 'Total 2FA operations (enable, disable, verify)',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Business metrics - Notes operations
const noteOperations = new promClient.Counter({
  name: 'notehub_note_operations_total',
  help: 'Total note operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Business metrics - Tags
const tagsTotal = new promClient.Gauge({
  name: 'notehub_tags_total',
  help: 'Total number of tags in the system',
  registers: [register],
});

const tagUsage = new promClient.Counter({
  name: 'notehub_tag_operations_total',
  help: 'Total tag operations',
  labelNames: ['operation'],
  registers: [register],
});

// Error tracking
const apiErrors = new promClient.Counter({
  name: 'notehub_api_errors_total',
  help: 'Total API errors by type and route',
  labelNames: ['route', 'error_type', 'status_code'],
  registers: [register],
});



// Search operations (Elasticsearch)
const searchOperations = new promClient.Counter({
  name: 'notehub_search_operations_total',
  help: 'Total search operations',
  labelNames: ['engine', 'status'],
  registers: [register],
});

const searchDuration = new promClient.Histogram({
  name: 'notehub_search_duration_seconds',
  help: 'Duration of search operations',
  labelNames: ['engine'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Middleware to track HTTP request metrics
 */
export function metricsMiddleware(req, res, next) {
  // Skip metrics endpoint itself
  if (req.path === '/metrics' || req.path === '/api/metrics') {
    return next();
  }

  // Track active connections
  activeConnections.inc();

  // Start timer for request duration
  const start = Date.now();

  // Normalize route to avoid high cardinality
  const route = normalizeRoute(req.path);

  // Override res.end to capture metrics after response
  const originalEnd = res.end;
  res.end = (...args) => {
    // Calculate duration
    const duration = (Date.now() - start) / 1000; // Convert to seconds

    // Record metrics
    httpRequestDuration.observe(
      {
        method: req.method,
        route: route,
        status_code: res.statusCode,
      },
      duration,
    );

    httpRequestTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });

    // Track errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      apiErrors.inc({
        route,
        error_type: errorType,
        status_code: res.statusCode,
      });
    }

    // Decrement active connections
    activeConnections.dec();

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
}

// Pre-compiled regex patterns for better performance
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const NUMERIC_ID_REGEX = /\/\d+/g;
const STATIC_FILE_REGEX = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/;

/**
 * Normalize route paths to avoid high cardinality in metrics
 * Replace IDs and dynamic parts with placeholders
 */
function normalizeRoute(path) {
  // Skip static files
  if (path.startsWith('/uploads/') || STATIC_FILE_REGEX.test(path)) {
    return '/static';
  }

  // Replace UUIDs
  path = path.replace(UUID_REGEX, ':id');

  // Replace numeric IDs
  path = path.replace(NUMERIC_ID_REGEX, '/:id');

  // Common API routes
  if (path.startsWith('/api/v1/')) {
    return path;
  }
  if (path.startsWith('/api/')) {
    return path;
  }

  // Root and frontend routes
  if (path === '/' || path === '') {
    return '/';
  }

  return '/frontend';
}

/**
 * Update database metrics
 */
export function recordDbQuery(operation, duration, success = true) {
  const status = success ? 'success' : 'error';

  dbQueryDuration.observe({ operation, status }, duration / 1000); // Convert to seconds
  dbQueryTotal.inc({ operation, status });
}

/**
 * Update cache metrics
 */
export function recordCacheOperation(operation, result) {
  cacheOperations.inc({ operation, result });
}

/**
 * Update application-specific metrics
 */
export function updateApplicationMetrics(metrics) {
  if (metrics.notes !== undefined) {
    notesTotal.set(metrics.notes);
  }
  if (metrics.users !== undefined) {
    usersTotal.set(metrics.users);
  }
  if (metrics.tags !== undefined) {
    tagsTotal.set(metrics.tags);
  }
  if (metrics.activeSessions !== undefined) {
    authActiveSessions.set(metrics.activeSessions);
  }
}

/**
 * Record authentication attempt
 */
export function recordAuthAttempt(method, success, reason = 'none') {
  const status = success ? 'success' : 'failure';
  authAttempts.inc({ method, status, reason });
}

/**
 * Record 2FA operation
 */
export function record2FAOperation(operation, success) {
  const status = success ? 'success' : 'failure';
  twoFactorUsage.inc({ operation, status });
}

/**
 * Record note operation
 */
export function recordNoteOperation(operation, success = true) {
  const status = success ? 'success' : 'failure';
  noteOperations.inc({ operation, status });
}

/**
 * Record tag operation
 */
export function recordTagOperation(operation) {
  tagUsage.inc({ operation });
}

/**
 * Record search operation
 */
export function recordSearchOperation(engine, duration, success = true) {
  const status = success ? 'success' : 'failure';
  searchOperations.inc({ engine, status });
  searchDuration.observe({ engine }, duration / 1000); // Convert to seconds
}

/**
 * Metrics endpoint handler
 */
export async function metricsEndpoint(_req, res) {
  try {
    // Set response headers
    res.setHeader('Content-Type', register.contentType);

    // Get metrics
    const metrics = await register.metrics();

    // Send metrics
    res.end(metrics);
  } catch (error) {
    logger.error('Error collecting metrics', { error: error.message });
    res.status(500).end('Error collecting metrics');
  }
}
