/**
 * Logger Configuration
 *
 * Centralized logging using Winston for structured, level-based logging.
 * Supports multiple formats and transports for different environments.
 */
const winston = require('winston');
const path = require('path');

// Get log configuration from environment
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'error' : 'info');
const LOG_FORMAT = process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'json' : 'simple');

// Define custom log formats
const simpleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
});

const detailedFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n  Meta: ${JSON.stringify(meta, null, 2)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
});

// Select format based on configuration
let logFormat;
switch (LOG_FORMAT) {
  case 'json':
    logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );
    break;
  case 'detailed':
    logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      detailedFormat
    );
    break;
  case 'simple':
  default:
    logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      simpleFormat
    );
    break;
}

// Create logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  transports: [
    // Console output
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    })
  ],
  exitOnError: false
});

// Optional: Add file transport for production
if (process.env.NODE_ENV === 'production' && process.env.LOG_FILE_PATH) {
  logger.add(new winston.transports.File({
    filename: process.env.LOG_FILE_PATH,
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    handleExceptions: true,
    handleRejections: true
  }));
}

// Create convenience methods for common logging patterns
logger.api = (method, path, statusCode, duration) => {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    duration: `${duration}ms`
  });
};

logger.db = (operation, table, duration) => {
  logger.debug('DB Operation', {
    operation,
    table,
    duration: duration ? `${duration}ms` : undefined
  });
};

logger.auth = (event, userId, details) => {
  logger.info('Auth Event', {
    event,
    userId,
    ...details
  });
};

logger.security = (event, details) => {
  logger.warn('Security Event', {
    event,
    ...details
  });
};

// Attach configuration to logger instance for easy access
logger.config = {
  level: LOG_LEVEL,
  format: LOG_FORMAT
};

// Export logger
module.exports = logger;
