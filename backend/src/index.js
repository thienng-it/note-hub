/**
 * NoteHub Backend - Main Entry Point
 * 
 * Node.js/Express API server for NoteHub application.
 * Supports both SQLite (default) and MySQL databases.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const tasksRoutes = require('./routes/tasks');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');

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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await db.queryOne(`SELECT COUNT(*) as count FROM users`);
    res.json({
      status: 'healthy',
      database: 'connected',
      user_count: userCount?.count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
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
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function start() {
  try {
    await db.connect();
    await db.initSchema();
    
    app.listen(PORT, () => {
      console.log(`🚀 NoteHub API server running on port ${PORT}`);
      console.log(`📦 Database: ${db.isSQLite ? 'SQLite' : 'MySQL'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  start();
}

module.exports = app;
