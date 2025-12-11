/**
 * Logging Middleware
 *
 * Express middleware for logging API requests and responses.
 */
import logger from '../config/logger.js';

// Paths to exclude from logging in production (too noisy)
const EXCLUDED_PATHS_PRODUCTION = ['/api/health', '/metrics'];

/**
 * Request logging middleware
 * Logs API requests with method, path, status code, and duration
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Skip logging for excluded paths in production (too noisy)
  if (process.env.NODE_ENV === 'production' && EXCLUDED_PATHS_PRODUCTION.includes(req.path)) {
    return next();
  }

  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      durationMs: duration,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: res.locals.requestId,
      userId: req.userId || null,
      contentLength: req.get('content-length') || 0,
      responseLength: res.get('content-length') || 0,
      referer: req.get('referer') || null,
    };

    // Add error details for failed requests
    if (res.statusCode >= 400 && res.locals.errorMessage) {
      logData.error = res.locals.errorMessage;
      logData.errorType = res.locals.errorType || 'unknown';
    }

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
