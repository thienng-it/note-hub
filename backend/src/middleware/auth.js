/**
 * JWT Authentication Middleware.
 */
const jwtService = require('../services/jwtService');
const { User } = require('../models');

/**
 * Middleware that requires a valid JWT token.
 */
const jwtRequired = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  // Validate Bearer token format
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Invalid authorization header format' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Invalid authorization header format' });
  }

  const token = parts[1];
  const result = jwtService.validateToken(token);

  if (!result.valid) {
    return res.status(401).json({ error: result.error || 'Invalid token' });
  }

  // Get user from database
  const user = await User.findOne({
    where: { id: result.userId },
    attributes: ['id', 'username', 'email', 'bio', 'theme', 'totp_secret', 'created_at', 'last_login']
  });

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Add user to request
  req.user = user;
  req.userId = user.id;

  next();
};

/**
 * Optional JWT middleware - doesn't require auth but adds user if present.
 */
const jwtOptional = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return next();
  }

  const token = parts[1];
  const result = jwtService.validateToken(token);

  if (result.valid) {
    const user = await User.findOne({
      where: { id: result.userId },
      attributes: ['id', 'username', 'email', 'bio', 'theme', 'totp_secret', 'created_at', 'last_login']
    });
    if (user) {
      req.user = user;
      req.userId = user.id;
    }
  }

  next();
};

/**
 * Admin-only middleware.
 */
const adminRequired = async (req, res, next) => {
  if (!req.user || req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

module.exports = {
  jwtRequired,
  jwtOptional,
  adminRequired
};
