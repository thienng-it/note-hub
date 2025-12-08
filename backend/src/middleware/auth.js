/**
 * JWT Authentication Middleware.
 */
const jwtService = require('../services/jwtService');
const db = require('../config/database');
const responseHandler = require('../utils/responseHandler');

/**
 * Middleware that requires a valid JWT token.
 */
const jwtRequired = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return responseHandler.unauthorized(res, 'No authorization header');
  }

  // Validate Bearer token format
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return responseHandler.unauthorized(res, 'Invalid authorization header format');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return responseHandler.unauthorized(res, 'Invalid authorization header format');
  }

  const token = parts[1];
  const result = jwtService.validateToken(token);

  if (!result.valid) {
    return responseHandler.unauthorized(res, result.error || 'Invalid token');
  }

  // Get user from database
  const user = await db.queryOne(
    `SELECT id, username, email, bio, theme, totp_secret, created_at, last_login FROM users WHERE id = ?`,
    [result.userId],
  );

  if (!user) {
    return responseHandler.unauthorized(res, 'User not found');
  }

  // Add user to request
  req.user = user;
  req.userId = user.id;

  next();
};

/**
 * Optional JWT middleware - doesn't require auth but adds user if present.
 */
const jwtOptional = async (req, _res, next) => {
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
    const user = await db.queryOne(
      `SELECT id, username, email, bio, theme, totp_secret, created_at, last_login FROM users WHERE id = ?`,
      [result.userId],
    );
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
    return responseHandler.forbidden(res, 'Admin privileges required');
  }
  next();
};

module.exports = {
  jwtRequired,
  jwtOptional,
  adminRequired,
};
