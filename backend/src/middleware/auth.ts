/**
 * JWT Authentication Middleware.
 */
import type { NextFunction, Response } from 'express';
import db from '../config/database';
import jwtService from '../services/jwtService';
import type { AuthRequest } from '../types';
import responseHandler from '../utils/responseHandler';

/**
 * Middleware that requires a valid JWT token.
 */
export const jwtRequired = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return responseHandler.unauthorized(res, 'No authorization header');
  }

  // Validate ****** token format
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return responseHandler.unauthorized(res, 'Invalid authorization header format');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !parts[1]) {
    return responseHandler.unauthorized(res, 'Invalid authorization header format');
  }

  const token = parts[1];
  const result = jwtService.validateToken(token);

  if (!result.valid) {
    return responseHandler.unauthorized(res, result.error || 'Invalid token');
  }

  // Get user from database
  const user = await db.queryOne(
    `SELECT id, username, email, bio, theme, hidden_notes, preferred_language, totp_secret, is_admin, is_locked, created_at, last_login FROM users WHERE id = ?`,
    [result.userId],
  );

  if (!user) {
    return responseHandler.unauthorized(res, 'User not found');
  }

  // Check if user account is locked
  if (user.is_locked) {
    return responseHandler.forbidden(res, 'Account is locked. Please contact an administrator.');
  }

  // Add user to request
  req.user = user;
  req.userId = user.id;

  next();
};

/**
 * Optional JWT middleware - doesn't require auth but adds user if present.
 */
export const jwtOptional = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !parts[1]) {
    return next();
  }

  const token = parts[1];
  const result = jwtService.validateToken(token);

  if (result.valid) {
    const user = await db.queryOne(
      `SELECT id, username, email, bio, theme, hidden_notes, preferred_language, totp_secret, is_admin, is_locked, created_at, last_login FROM users WHERE id = ?`,
      [result.userId],
    );
    if (user && !user.is_locked) {
      req.user = user;
      req.userId = user.id;
    }
  }

  next();
};

/**
 * Admin-only middleware.
 */
export const adminRequired = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  if (!req.user || !req.user.is_admin) {
    return responseHandler.forbidden(res, 'Admin privileges required');
  }
  next();
};

export default {
  jwtRequired,
  jwtOptional,
  adminRequired,
};
