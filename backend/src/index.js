/**
 * NoteHub Backend - Main Entry Point
 *
 * Node.js/Express API server for NoteHub application.
 * Supports both SQLite (default) and MySQL databases.
 * Uses Sequelize ORM for database operations.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM compatibility: define __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ESM compatibility: create require for package.json
const require = createRequire(import.meta.url);

// Load .env from project root
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import cors from 'cors';

import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
// Database: supports both legacy DB layer and Sequelize ORM
import db from './config/database.js';
import elasticsearch from './config/elasticsearch.js';
// Logger must be imported after dotenv config
import logger from './config/logger.js';

// Cache and search services
import cache from './config/redis.js';
import { closeDatabase, initializeSequelize, syncDatabase } from './models/index.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
// Import routes
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import exportRoutes from './routes/export.js';
import foldersRoutes from './routes/folders.js';
import notesRoutes from './routes/notes.js';
import passkeyRoutes from './routes/passkey.js';
import profileRoutes from './routes/profile.js';
import tasksRoutes from './routes/tasks.js';
import uploadRoutes from './routes/upload.js';
import usersRoutes from './routes/users.js';
// Import passkey services
import { isUsingRedis } from './services/challengeStorage.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - Required when running behind reverse proxy (Docker, Traefik, nginx)
// This allows Express to read X-Forwarded-* headers to get the real client IP
// Without this, req.ip returns the Docker network IP instead of the real user IP
app.set('trust proxy', true);

// API version prefix - centralized for easy updates
const API_VERSION = '/api/v1';

// Security middleware with CSP configured for SPA
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }),
);

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  // Skip rate limiting for Socket.IO connections
  skip: (req) => req.path.startsWith('/socket.io'),
});
app.use('/api/', apiLimiter);

// Rate limiting for static files (less restrictive)
const staticLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Higher limit for static assets
  message: { error: 'Too many requests' },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request ID middleware for tracking
import requestIdMiddleware from './middleware/requestId.js';

app.use(requestIdMiddleware);

// Additional security headers
import securityHeadersMiddleware from './middleware/securityHeaders.js';

app.use(securityHeadersMiddleware);

// Request logging middleware
import { requestLogger } from './middleware/logging.js';

app.use(requestLogger);

// Prometheus metrics middleware
import { metricsEndpoint, metricsMiddleware } from './middleware/metrics.js';

app.use(metricsMiddleware);

// Response adapter for backward compatibility
import { legacyResponseAdapter, markAsV1 } from './middleware/responseAdapter.js';

app.use(legacyResponseAdapter);

// API v1 routes (standardized response format)
app.use(`${API_VERSION}/auth`, markAsV1, authRoutes);
app.use(`${API_VERSION}/auth/passkey`, markAsV1, passkeyRoutes);
app.use(`${API_VERSION}/folders`, markAsV1, foldersRoutes);
app.use(`${API_VERSION}/notes`, markAsV1, notesRoutes);
app.use(`${API_VERSION}/tasks`, markAsV1, tasksRoutes);
app.use(`${API_VERSION}/profile`, markAsV1, profileRoutes);
app.use(`${API_VERSION}/users`, markAsV1, usersRoutes);
app.use(`${API_VERSION}/admin`, markAsV1, adminRoutes);
app.use(`${API_VERSION}/ai`, markAsV1, aiRoutes);
app.use(`${API_VERSION}/upload`, markAsV1, uploadRoutes);
app.use(`${API_VERSION}/export`, markAsV1, exportRoutes);
app.use(`${API_VERSION}/chat`, markAsV1, chatRoutes);

// Health check endpoints with standardized response
import * as responseHandler from './utils/responseHandler.js';

// Load package.json using require (created via createRequire)
const packageJson = require('../package.json');

// Prometheus metrics endpoint (must be before other routes to avoid auth)
app.get('/metrics', metricsEndpoint);
app.get('/api/metrics', metricsEndpoint);

// Track activeSessions
let activeSessions = 0;

app.on('connection', (socket) => {
  activeSessions++;

  socket.on('close', () => {
    activeSessions--;
  });
});

// Update application metrics periodically
import { updateApplicationMetrics } from './middleware/metrics.js';

async function updateMetricsJob() {
  try {
    // Wait for database to be ready
    if (!db || !db.db) {
      logger.warn('Database not ready yet, skipping metrics update');
      return;
    }

    // Simplified query - removed tasks and notes by status
    const counts = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM notes) as notes,
        (SELECT COUNT(DISTINCT id) FROM tags) as tags
    `);

    const metrics = counts?.[0] || {
      users: 0,
      notes: 0,
      tags: 0,
    };

    updateApplicationMetrics({
      users: metrics.users || 0,
      notes: metrics.notes || 0,
      tags: metrics.tags || 0,
      activeSessions: activeSessions,
    });
  } catch (error) {
    logger.error('Error updating application metrics', { error: error.message });
  }
}

// Update metrics every 30 seconds
setInterval(updateMetricsJob, 30000);
// Initial update after delay to ensure database is ready
setTimeout(updateMetricsJob, 5000);

// Shared health check logic
async function getHealthStatus() {
  const userCount = await db.queryOne(`SELECT COUNT(*) as count FROM users`);
  const replicationStatus = db.getReplicationStatus();

  return {
    status: 'healthy',
    database: 'connected',
    services: {
      cache: cache.isEnabled() ? 'enabled' : 'disabled',
      search: elasticsearch.isEnabled() ? 'enabled' : 'disabled',
      replication: replicationStatus.enabled ? 'enabled' : 'disabled',
    },
    replication: replicationStatus.enabled
      ? {
          replicas: replicationStatus.replicaCount,
          healthy: replicationStatus.healthyReplicas,
        }
      : undefined,
    user_count: userCount?.count || 0,
  };
}

// Backward-compatible health endpoint (without version prefix for Docker healthchecks)
app.get('/api/health', async (_req, res) => {
  try {
    const healthStatus = await getHealthStatus();
    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

app.get(`${API_VERSION}/health`, markAsV1, async (_req, res) => {
  try {
    const healthStatus = await getHealthStatus();
    responseHandler.success(res, healthStatus, { message: 'Service is healthy' });
  } catch (error) {
    responseHandler.error(res, 'Service is unhealthy', {
      statusCode: 503,
      errorCode: 'SERVICE_UNAVAILABLE',
      details: { error: error.message },
    });
  }
});

// Version endpoint
app.get(`${API_VERSION}/version`, markAsV1, (_req, res) => {
  responseHandler.success(
    res,
    {
      version: packageJson.version,
      name: packageJson.name,
      description: packageJson.description,
    },
    { message: 'Version information' },
  );
});

// Serve static files from React frontend build with rate limiting
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use(staticLimiter, express.static(frontendPath));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', staticLimiter, (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (_req, res) => {
  responseHandler.notFound(res, 'Endpoint');
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error('Server error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: res.locals.requestId,
  });

  responseHandler.error(res, 'Internal server error', {
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? { message: err.message } : undefined,
  });
});

// Initialize database and start server
async function start() {
  try {
    // Initialize Sequelize ORM
    await initializeSequelize();
    await syncDatabase();

    // Also initialize legacy DB for backward compatibility
    await db.connect();
    await db.initSchema();

    // Initialize Redis cache (optional)
    await cache.connect();

    // Initialize Elasticsearch (optional)
    await elasticsearch.connect();

    // Log passkey challenge storage mode
    const challengeStorage = isUsingRedis()
      ? 'Redis (production-ready)'
      : 'In-memory (single-instance only)';
    logger.info('🔐 Passkey challenge storage', { mode: challengeStorage });

    // Create HTTP server for Socket.io integration
    const http = await import('node:http');
    const httpServer = http.createServer(app);

    // Initialize Socket.io for real-time chat
    const { initializeSocketIO } = await import('./config/socketio.js');
    initializeSocketIO(httpServer);

    httpServer.listen(PORT, () => {
      logger.info('🚀 NoteHub API server started', {
        port: PORT,
        database: db.isSQLite ? 'SQLite' : 'MySQL',
        orm: 'Sequelize',
        cache: cache.isEnabled() ? 'Redis (enabled)' : 'Disabled',
        search: elasticsearch.isEnabled() ? 'Elasticsearch (enabled)' : 'SQL LIKE (fallback)',
        passkeyStorage: challengeStorage,
        chat: 'WebSocket (Socket.io enabled)',
        environment: process.env.NODE_ENV || 'development',
        logLevel: logger.config.level,
        logFormat: logger.config.format,
      });
    });

    return httpServer;
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await closeDatabase();
  await db.close();
  await cache.close();
  await elasticsearch.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await closeDatabase();
  await db.close();
  await cache.close();
  await elasticsearch.close();
  process.exit(0);
});

// Only start server if this file is run directly (not imported for testing)
// ESM equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

// Export for testing
export default app;
