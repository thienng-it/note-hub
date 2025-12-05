/**
 * Standardized Response Handler
 * 
 * Provides consistent response format across all API endpoints.
 * Includes metadata for debugging, pagination, and API versioning.
 */

/**
 * Success response wrapper
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Object} options - Additional options
 * @param {number} options.statusCode - HTTP status code (default: 200)
 * @param {string} options.message - Optional success message
 * @param {Object} options.meta - Optional metadata (pagination, etc.)
 */
function success(res, data, options = {}) {
  const {
    statusCode = 200,
    message = 'Success',
    meta = {}
  } = options;

  const response = {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      ...meta
    }
  };

  // Add request ID if available
  if (res.locals.requestId) {
    response.meta.requestId = res.locals.requestId;
  }

  return res.status(statusCode).json(response);
}

/**
 * Error response wrapper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} options - Additional options
 * @param {number} options.statusCode - HTTP status code (default: 500)
 * @param {string} options.errorCode - Application-specific error code
 * @param {Object} options.details - Additional error details
 */
function error(res, message, options = {}) {
  const {
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    details = null
  } = options;

  const response = {
    success: false,
    error: {
      message,
      code: errorCode,
      ...(details && { details })
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1'
    }
  };

  // Add request ID if available
  if (res.locals.requestId) {
    response.meta.requestId = res.locals.requestId;
  }

  return res.status(statusCode).json(response);
}

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array|Object} errors - Validation errors
 */
function validationError(res, errors) {
  return error(res, 'Validation failed', {
    statusCode: 400,
    errorCode: 'VALIDATION_ERROR',
    details: errors
  });
}

/**
 * Not found error response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource that was not found
 */
function notFound(res, resource = 'Resource') {
  return error(res, `${resource} not found`, {
    statusCode: 404,
    errorCode: 'NOT_FOUND'
  });
}

/**
 * Unauthorized error response
 * @param {Object} res - Express response object
 * @param {string} message - Optional custom message
 */
function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, {
    statusCode: 401,
    errorCode: 'UNAUTHORIZED'
  });
}

/**
 * Forbidden error response
 * @param {Object} res - Express response object
 * @param {string} message - Optional custom message
 */
function forbidden(res, message = 'Forbidden') {
  return error(res, message, {
    statusCode: 403,
    errorCode: 'FORBIDDEN'
  });
}

/**
 * Created response for POST endpoints
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Optional success message
 */
function created(res, data, message = 'Resource created successfully') {
  return success(res, data, {
    statusCode: 201,
    message
  });
}

/**
 * No content response for DELETE endpoints
 * @param {Object} res - Express response object
 */
function noContent(res) {
  return res.status(204).send();
}

/**
 * Paginated response wrapper
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {number} pagination.page - Current page
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total items
 */
function paginated(res, data, pagination) {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);

  return success(res, data, {
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  });
}

module.exports = {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  created,
  noContent,
  paginated
};
