/**
 * NoteHub Backend - Main Entry Point
 *
 * Node.js/Express API server for NoteHub application.
 * Supports both SQLite (default) and MySQL databases.
 * Uses Sequelize ORM for database operations.
 */
const path = require('path');
const fs = require('fs');

// Load .env from project root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Logger must be imported after dotenv config
const logger = require('./config/logger');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Database: supports both legacy DB layer and Sequelize ORM
const db = require('./config/database');
const { initializeSequelize, syncDatabase, closeDatabase } = require('./models');

// Cache and search services
const cache = require('./config/redis');
const elasticsearch = require('./config/elasticsearch');

// Import routes
const authRoutes = require('./routes/auth');
const passkeyRoutes = require('./routes/passkey');
const notesRoutes = require('./routes/notes');
const tasksRoutes = require('./routes/tasks');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware with CSP configured for SPA
app.use(helmet({
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
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', apiLimiter);

// Rate limiting for static files (less restrictive)
const staticLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Higher limit for static assets
  message: { error: 'Too many requests' }
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request ID middleware for tracking
const requestIdMiddleware = require('./middleware/requestId');
app.use(requestIdMiddleware);

// Additional security headers
const securityHeadersMiddleware = require('./middleware/securityHeaders');
app.use(securityHeadersMiddleware);

// Request logging middleware
const { requestLogger } = require('./middleware/logging');
app.use(requestLogger);

// Response adapter for backward compatibility
const { markAsV1, legacyResponseAdapter } = require('./middleware/responseAdapter');
app.use(legacyResponseAdapter);

// API v1 routes (standardized response format)
app.use('/api/v1/auth', markAsV1, authRoutes);
app.use('/api/v1/auth/passkey', markAsV1, passkeyRoutes);
app.use('/api/v1/notes', markAsV1, notesRoutes);
app.use('/api/v1/tasks', markAsV1, tasksRoutes);
app.use('/api/v1/profile', markAsV1, profileRoutes);
app.use('/api/v1/admin', markAsV1, adminRoutes);
app.use('/api/v1/ai', markAsV1, aiRoutes);
app.use('/api/v1/upload', markAsV1, uploadRoutes);

// Health check endpoints with standardized response
const responseHandler = require('./utils/responseHandler');
const packageJson = require('../package.json');

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
      replication: replicationStatus.enabled ? 'enabled' : 'disabled'
    },
    replication: replicationStatus.enabled ? {
      replicas: replicationStatus.replicaCount,
      healthy: replicationStatus.healthyReplicas
    } : undefined,
    user_count: userCount?.count || 0
  };
}

// Backward-compatible health endpoint (without version prefix for Docker healthchecks)
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = await getHealthStatus();
    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.get('/api/v1/health', markAsV1, async (req, res) => {
  try {
    const healthStatus = await getHealthStatus();
    responseHandler.success(res, healthStatus, { message: 'Service is healthy' });
  } catch (error) {
    responseHandler.error(res, 'Service is unhealthy', {
      statusCode: 503,
      errorCode: 'SERVICE_UNAVAILABLE',
      details: { error: error.message }
    });
  }
});

// Version endpoint
app.get('/api/v1/version', markAsV1, (req, res) => {
  responseHandler.success(res, {
    version: packageJson.version,
    name: packageJson.name,
    description: packageJson.description
  }, { message: 'Version information' });
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
app.use('/api/*', (req, res) => {
  responseHandler.notFound(res, 'Endpoint');
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: res.locals.requestId
  });
  
  responseHandler.error(res, 'Internal server error', {
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? { message: err.message } : undefined
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

    app.listen(PORT, () => {
      logger.info('🚀 NoteHub API server started', {
        port: PORT,
        database: db.isSQLite ? 'SQLite' : 'MySQL',
        orm: 'Sequelize',
        cache: cache.isEnabled() ? 'Redis (enabled)' : 'Disabled',
        search: elasticsearch.isEnabled() ? 'Elasticsearch (enabled)' : 'SQL LIKE (fallback)',
        environment: process.env.NODE_ENV || 'development',
        logLevel: logger.config.level,
        logFormat: logger.config.format
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
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
if (require.main === module) {
  start();
}

module.exports = app;
