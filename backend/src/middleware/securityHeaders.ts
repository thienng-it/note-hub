/**
 * Additional Security Headers Middleware
 *
 * Adds extra security headers beyond what helmet provides.
 * Includes API versioning headers and other best practices.
 */
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add additional security headers
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // API Version header
  res.setHeader('X-API-Version', 'v1');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Disable DNS prefetching for privacy
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Disable download for opening files directly in browser
  res.setHeader('X-Download-Options', 'noopen');

  // Remove X-Powered-By header (if not already removed by helmet)
  res.removeHeader('X-Powered-By');

  // Prevent page from being displayed in iframe on other sites
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Indicate that API requires HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

export default securityHeadersMiddleware;
