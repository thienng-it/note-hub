/**
 * Request ID Middleware
 * 
 * Generates a unique request ID for each incoming request.
 * This helps with debugging and log correlation.
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to add unique request ID to each request
 */
function requestIdMiddleware(req, res, next) {
  // Check if request ID already exists in headers (from proxy/load balancer)
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Store in response locals for access in route handlers
  res.locals.requestId = requestId;
  
  // Add to response headers for client tracking
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

module.exports = requestIdMiddleware;
