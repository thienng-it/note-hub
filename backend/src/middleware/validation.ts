/**
 * Input Validation Middleware
 *
 * Provides common validation functions for request input.
 */
import type { NextFunction, Request, Response } from 'express';
import responseHandler from '../utils/responseHandler';

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction): undefined | Response => {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!req.body[field] && req.body[field] !== 0 && req.body[field] !== false) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return responseHandler.validationError(res, {
        missingFields,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Validate email format
 */
export function validateEmail(fieldName = 'email') {
  return (req: Request, res: Response, next: NextFunction): undefined | Response => {
    const email = req.body[fieldName];

    if (!email) {
      return next(); // Skip if not provided (use validateRequiredFields for required check)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return responseHandler.validationError(res, {
        field: fieldName,
        message: 'Invalid email format',
      });
    }

    next();
  };
}

/**
 * Validate string length
 */
export function validateLength(fieldName: string, options: { min?: number; max?: number } = {}) {
  const { min, max } = options;

  return (req: Request, res: Response, next: NextFunction): undefined | Response => {
    const value = req.body[fieldName];

    if (!value) {
      return next(); // Skip if not provided
    }

    if (typeof value !== 'string') {
      return responseHandler.validationError(res, {
        field: fieldName,
        message: `${fieldName} must be a string`,
      });
    }

    if (min !== undefined && value.length < min) {
      return responseHandler.validationError(res, {
        field: fieldName,
        message: `${fieldName} must be at least ${min} characters long`,
      });
    }

    if (max !== undefined && value.length > max) {
      return responseHandler.validationError(res, {
        field: fieldName,
        message: `${fieldName} must be at most ${max} characters long`,
      });
    }

    next();
  };
}

/**
 * Sanitize string input by trimming whitespace
 */
export function sanitizeStrings(fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = req.body[field].trim();
      }
    }
    next();
  };
}

export default {
  validateRequiredFields,
  validateEmail,
  validateLength,
  sanitizeStrings,
};
