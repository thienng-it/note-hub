/**
 * Prometheus Metrics Middleware
 *
 * Collects and exposes application metrics for Prometheus scraping.
 * Provides default Node.js metrics and custom application metrics.
 */
const promClient = require('prom-client');
const logger = require('../config/logger');

// Create a Registry to register metrics
const register = new promClient.Registry();

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

// Notes metrics
const notesTotal = new promClient.Gauge({
  name: 'notehub_notes_total',
  help: 'Total number of notes in the system',
  registers: [register],
});

// Users metrics
const usersTotal = new promClient.Gauge({
  name: 'notehub_users_total',
  help: 'Total number of users in the system',
  registers: [register],
});

// Tasks metrics
const tasksTotal = new promClient.Gauge({
  name: 'notehub_tasks_total',
  help: 'Total number of tasks in the system',
  registers: [register],
});

/**
 * Middleware to track HTTP request metrics
 */
function metricsMiddleware(req, res, next) {
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

    // Decrement active connections
    activeConnections.dec();

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Normalize route paths to avoid high cardinality in metrics
 * Replace IDs and dynamic parts with placeholders
 */
function normalizeRoute(path) {
  // Skip static files
  if (
    path.startsWith('/uploads/') ||
    path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/)
  ) {
    return '/static';
  }

  // Replace UUIDs
  path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');

  // Replace numeric IDs
  path = path.replace(/\/\d+/g, '/:id');

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
function recordDbQuery(operation, duration, success = true) {
  const status = success ? 'success' : 'error';

  dbQueryDuration.observe({ operation, status }, duration / 1000); // Convert to seconds
  dbQueryTotal.inc({ operation, status });
}

/**
 * Update cache metrics
 */
function recordCacheOperation(operation, result) {
  cacheOperations.inc({ operation, result });
}

/**
 * Update application-specific metrics
 */
function updateApplicationMetrics(metrics) {
  if (metrics.notes !== undefined) {
    notesTotal.set(metrics.notes);
  }
  if (metrics.users !== undefined) {
    usersTotal.set(metrics.users);
  }
  if (metrics.tasks !== undefined) {
    tasksTotal.set(metrics.tasks);
  }
}

/**
 * Metrics endpoint handler
 */
async function metricsEndpoint(_req, res) {
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

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  recordDbQuery,
  recordCacheOperation,
  updateApplicationMetrics,
  register,
};
