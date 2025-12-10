/**
 * Compression Middleware
 *
 * Enables response compression using gzip/deflate for improved performance.
 * Reduces bandwidth usage and speeds up response times.
 */

import compression from 'compression';
import type { Request, Response } from 'express';

/**
 * Configure compression middleware with optimal settings
 */
export const compressionMiddleware = compression({
  // Only compress responses above 1KB
  threshold: 1024,

  // Compression level (0-9, where 6 is default and balanced)
  level: 6,

  // Filter function to determine which responses to compress
  filter: (req: Request, res: Response): boolean => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress responses with Cache-Control: no-transform
    const cacheControl = res.getHeader('Cache-Control');
    if (typeof cacheControl === 'string' && cacheControl.includes('no-transform')) {
      return false;
    }

    // Use compression's default filter for standard content types
    return compression.filter(req, res);
  },

  // Memory level (1-9, where 8 is default)
  memLevel: 8,

  // Window size (8-15, where 15 is default and provides best compression)
  windowBits: 15,
});

export default compressionMiddleware;
