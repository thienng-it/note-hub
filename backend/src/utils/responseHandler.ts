/**
 * Standardized Response Handler
 *
 * Provides consistent response format across all API endpoints.
 * Includes metadata for debugging, pagination, and API versioning.
 * 
 * Note: Uses relative imports as per project structure.
 * If path mapping is configured in tsconfig.json, these can be updated to use aliases.
 */

import type { Response } from 'express';
import type { PaginationMeta } from '../types';

interface SuccessOptions {
  statusCode?: number;
  message?: string;
  meta?: Record<string, any>;
}

interface ErrorOptions {
  statusCode?: number;
  errorCode?: string;
  details?: any;
}

/**
 * Success response wrapper
 */
export function success<T = any>(
  res: Response,
  data: T,
  options: SuccessOptions = {}
): Response {
  const { statusCode = 200, message = 'Success', meta = {} } = options;

  const response = {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      ...meta,
    },
  };

  // Add request ID if available
  if (res.locals.requestId) {
    response.meta.requestId = res.locals.requestId;
  }

  return res.status(statusCode).json(response);
}

/**
 * Error response wrapper
 */
export function error(
  res: Response,
  message: string,
  options: ErrorOptions = {}
): Response {
  const { statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null } = options;

  const response = {
    success: false,
    error: {
      message,
      code: errorCode,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  // Add request ID if available
  if (res.locals.requestId) {
    response.meta.requestId = res.locals.requestId;
  }

  return res.status(statusCode).json(response);
}

/**
 * Validation error response
 */
export function validationError(res: Response, errors: any): Response {
  return error(res, 'Validation failed', {
    statusCode: 400,
    errorCode: 'VALIDATION_ERROR',
    details: errors,
  });
}

/**
 * Not found error response
 */
export function notFound(res: Response, resource = 'Resource'): Response {
  return error(res, `${resource} not found`, {
    statusCode: 404,
    errorCode: 'NOT_FOUND',
  });
}

/**
 * Unauthorized error response
 */
export function unauthorized(res: Response, message = 'Unauthorized'): Response {
  return error(res, message, {
    statusCode: 401,
    errorCode: 'UNAUTHORIZED',
  });
}

/**
 * Forbidden error response
 */
export function forbidden(res: Response, message = 'Forbidden'): Response {
  return error(res, message, {
    statusCode: 403,
    errorCode: 'FORBIDDEN',
  });
}

/**
 * Created response for POST endpoints
 */
export function created<T = any>(
  res: Response,
  data: T,
  message = 'Resource created successfully'
): Response {
  return success(res, data, {
    statusCode: 201,
    message,
  });
}

/**
 * No content response for DELETE endpoints
 */
export function noContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Paginated response wrapper
 */
export function paginated<T = any>(
  res: Response,
  data: T[],
  pagination: Omit<PaginationMeta, 'totalPages' | 'hasNext' | 'hasPrev'>
): Response {
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
        hasPrev: page > 1,
      },
    },
  });
}

export default {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  created,
  noContent,
  paginated,
};
