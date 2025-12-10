/**
 * Request ID Middleware
 *
 * Generates a unique request ID for each incoming request.
 * This helps with debugging and log correlation.
 */
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add unique request ID to each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if request ID already exists in headers (from proxy/load balancer)
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Store in response locals for access in route handlers
  res.locals.requestId = requestId;

  // Add to response headers for client tracking
  res.setHeader('X-Request-ID', requestId);

  next();
}

export default requestIdMiddleware;
