/**
 * Input Validation Middleware
 *
 * Provides common validation functions for request input.
 */
import * as responseHandler from '../utils/responseHandler.js';

/**
 * Validate required fields in request body
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Function} Express middleware
 */
export function validateRequiredFields(requiredFields) {
  return (req, res, next) => {
    const missingFields = [];

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
 * @param {string} fieldName - Name of the field to validate (default: 'email')
 * @returns {Function} Express middleware
 */
export function validateEmail(fieldName = 'email') {
  return (req, res, next) => {
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
 * @param {string} fieldName - Name of the field to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum length
 * @param {number} options.max - Maximum length
 * @returns {Function} Express middleware
 */
export function validateLength(fieldName, options = {}) {
  const { min, max } = options;

  return (req, res, next) => {
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
 * @param {Array<string>} fields - Fields to sanitize
 * @returns {Function} Express middleware
 */
export function sanitizeStrings(fields) {
  return (req, _res, next) => {
    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = req.body[field].trim();
      }
    }
    next();
  };
}
