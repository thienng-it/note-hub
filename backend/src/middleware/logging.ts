/**
 * Logging Middleware
 *
 * Express middleware for logging API requests and responses.
 */
import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';

/**
 * Request logging middleware
 * Logs API requests with method, path, status code, and duration
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Skip logging for health check in production (too noisy)
  if (req.path === '/api/health' && process.env.NODE_ENV === 'production') {
    next();
    return;
  }

  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: res.locals.requestId,
    };

    // Log at appropriate level based on status code
    if (res.statusCode >= 500) {
      logger.error('API Request - Server Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('API Request - Client Error', logData);
    } else {
      logger.info('API Request', logData);
    }
  });

  next();
}

export default {
  requestLogger,
};
