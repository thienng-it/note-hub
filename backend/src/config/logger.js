/**
 * Logger Configuration
 *
 * Centralized logging using Winston for structured, level-based logging.
 * Supports multiple formats and transports for different environments.
 * Includes optional Grafana Loki integration for centralized logging.
 */
const winston = require('winston');
const LokiTransport = require('winston-loki');
const os = require('node:os');

// Get log configuration from environment
const LOG_LEVEL =
  process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'error' : 'info');
const LOG_FORMAT =
  process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'json' : 'simple');

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
      winston.format.json(),
    );
    break;
  case 'detailed':
    logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      detailedFormat,
    );
    break;
  default:
    logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      simpleFormat,
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
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Optional: Add file transport for production
if (process.env.NODE_ENV === 'production' && process.env.LOG_FILE_PATH) {
  logger.add(
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true,
    }),
  );
}

// Optional: Add Grafana Loki transport for centralized logging
if (process.env.LOKI_ENABLED === 'true') {
  const lokiHost = process.env.LOKI_HOST || 'http://localhost:3100';
  const lokiUsername = process.env.LOKI_USERNAME;
  const lokiPassword = process.env.LOKI_PASSWORD;
  const lokiLabels = {
    application: process.env.LOKI_APP_LABEL || 'notehub-backend',
    environment: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || os.hostname(),
  };

  try {
    const lokiOptions = {
      host: lokiHost,
      labels: lokiLabels,
      level: LOG_LEVEL,
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => {
        console.error('Loki connection error:', err.message);
      },
      // Optional: Add basic authentication if credentials are provided
      ...(lokiUsername && lokiPassword
        ? {
            basicAuth: `${lokiUsername}:${lokiPassword}`,
          }
        : {}),
    };

    logger.add(new LokiTransport(lokiOptions));
    logger.info('Loki transport enabled', {
      host: lokiHost,
      labels: lokiLabels,
      authenticated: !!(lokiUsername && lokiPassword),
    });
  } catch (error) {
    // Graceful degradation - if Loki transport fails, continue without it
    console.error('Failed to initialize Loki transport:', error.message);
    console.error('Continuing with console logging only');
  }
}

// Create convenience methods for common logging patterns
logger.api = (method, path, statusCode, duration) => {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
  });
};

logger.db = (operation, table, duration) => {
  logger.debug('DB Operation', {
    operation,
    table,
    duration: duration ? `${duration}ms` : undefined,
  });
};

logger.auth = (event, userId, details) => {
  logger.info('Auth Event', {
    event,
    userId,
    ...details,
  });
};

logger.security = (event, details) => {
  logger.warn('Security Event', {
    event,
    ...details,
  });
};

// Attach configuration to logger instance for easy access
logger.config = {
  level: LOG_LEVEL,
  format: LOG_FORMAT,
};

// Export logger
module.exports = logger;
