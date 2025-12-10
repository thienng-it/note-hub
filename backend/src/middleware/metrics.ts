/**
 * Prometheus Metrics Middleware
 *
 * Collects and exposes application metrics for Prometheus scraping.
 * Provides default Node.js metrics and custom application metrics.
 */

import type { NextFunction, Request, Response } from 'express';
import promClient from 'prom-client';
import logger from '../config/logger';

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
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip metrics endpoint itself
  if (req.path === '/metrics' || req.path === '/api/metrics') {
    next();
    return;
  }

  // Track active connections
  activeConnections.inc();

  // Start timer for request duration
  const start = Date.now();

  // Normalize route to avoid high cardinality
  const route = normalizeRoute(req.path);

  // Override res.end to capture metrics after response
  const originalEnd = res.end.bind(res);
  res.end = ((...args: unknown[]): Response => {
    // Calculate duration
    const duration = (Date.now() - start) / 1000; // Convert to seconds

    // Record metrics
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration,
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    // Decrement active connections
    activeConnections.dec();

    // Call original end
    return originalEnd(...(args as Parameters<typeof originalEnd>));
  }) as unknown as typeof res.end;

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
function normalizeRoute(path: string): string {
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
export function recordDbQuery(operation: string, duration: number, success = true): void {
  const status = success ? 'success' : 'error';

  dbQueryDuration.observe({ operation, status }, duration / 1000); // Convert to seconds
  dbQueryTotal.inc({ operation, status });
}

/**
 * Update cache metrics
 */
export function recordCacheOperation(operation: string, result: string): void {
  cacheOperations.inc({ operation, result });
}

/**
 * Update application-specific metrics
 */
export function updateApplicationMetrics(metrics: {
  notes?: number;
  users?: number;
  tasks?: number;
}): void {
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
export async function metricsEndpoint(_req: Request, res: Response): Promise<void> {
  try {
    // Set response headers
    res.setHeader('Content-Type', register.contentType);

    // Get metrics
    const metrics = await register.metrics();

    // Send metrics
    res.end(metrics);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Error collecting metrics', { error: err.message });
    res.status(500).end('Error collecting metrics');
  }
}

export default {
  metricsMiddleware,
  metricsEndpoint,
  recordDbQuery,
  recordCacheOperation,
  updateApplicationMetrics,
  register,
};
