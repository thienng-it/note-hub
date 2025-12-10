/**
 * JWT Authentication Middleware.
 */
import type { NextFunction, Response } from 'express';
import db from '../config/database';
import jwtService from '../services/jwtService';
import type { AuthRequest, User, UserPublic } from '../types';
import responseHandler from '../utils/responseHandler';

/**
 * Middleware that requires a valid JWT token.
 */
export const jwtRequired = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<undefined | Response> => {
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
  const user = await db.queryOne<User>(
    `SELECT id, username, email, bio, theme, hidden_notes, preferred_language, totp_secret, is_admin, is_locked, created_at, last_login FROM users WHERE id = ?`,
    [result.userId as number],
  );

  if (!user) {
    return responseHandler.unauthorized(res, 'User not found');
  }

  // Check if user account is locked
  if (user.is_locked) {
    return responseHandler.forbidden(res, 'Account is locked. Please contact an administrator.');
  }

  // Add user to request (casting to UserPublic for API exposure, but keeping totp_secret internally)
  req.user = user as UserPublic;
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
    const user = await db.queryOne<User>(
      `SELECT id, username, email, bio, theme, hidden_notes, preferred_language, totp_secret, is_admin, is_locked, created_at, last_login FROM users WHERE id = ?`,
      [result.userId as number],
    );
    if (user && !user.is_locked) {
      req.user = user as UserPublic;
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
): Promise<undefined | Response> => {
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
