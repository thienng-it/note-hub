/**
 * Logger Configuration
 *
 * Centralized logging using Winston for structured, level-based logging.
 * Supports multiple formats and transports for different environments.
 * Includes optional Graylog integration via GELF protocol.
 */

import os from 'node:os';
import winston from 'winston';
import WinstonGraylog2 from 'winston-graylog2';

// Log level type definition
type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

// Get log configuration from environment
const LOG_LEVEL = (process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === 'production' ? 'error' : 'info')) as LogLevel;
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
let logFormat: winston.Logform.Format;
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

// Extended Winston Logger interface with custom methods
interface CustomLogger extends winston.Logger {
  api: (method: string, path: string, statusCode: number, duration: number) => void;
  db: (operation: string, table: string, duration?: number) => void;
  auth: (event: string, userId: number | string, details?: Record<string, unknown>) => void;
  security: (event: string, details?: Record<string, unknown>) => void;
  config: {
    level: string;
    format: string;
  };
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
}) as CustomLogger;

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

// Optional: Add Graylog transport for centralized logging
if (process.env.GRAYLOG_ENABLED === 'true') {
  const graylogHost = process.env.GRAYLOG_HOST || 'localhost';
  const graylogPort = Number.parseInt(process.env.GRAYLOG_PORT || '12201', 10);
  const graylogProtocol = process.env.GRAYLOG_PROTOCOL || 'udp';
  const graylogFacility = process.env.GRAYLOG_FACILITY || 'notehub-backend';

  try {
    const graylogOptions = {
      name: 'Graylog',
      level: LOG_LEVEL,
      silent: false,
      handleExceptions: true,
      graylog: {
        servers: [{ host: graylogHost, port: graylogPort }],
        hostname: process.env.HOSTNAME || os.hostname(),
        facility: graylogFacility,
        bufferSize: 1400,
        protocol: graylogProtocol === 'tcp' ? ('tcp' as const) : ('udp' as const),
      },
      staticMeta: {
        environment: process.env.NODE_ENV || 'development',
        application: 'notehub-backend',
        version: process.env.npm_package_version || '1.0.0',
      },
    };

    logger.add(new WinstonGraylog2(graylogOptions));
    logger.info('Graylog transport enabled', {
      host: graylogHost,
      port: graylogPort,
      protocol: graylogProtocol,
      facility: graylogFacility,
    });
  } catch (error) {
    // Graceful degradation - if Graylog transport fails, continue without it
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to initialize Graylog transport:', errorMessage);
    console.error('Continuing with console logging only');
  }
}

// Create convenience methods for common logging patterns
logger.api = (method: string, path: string, statusCode: number, duration: number): void => {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
  });
};

logger.db = (operation: string, table: string, duration?: number): void => {
  logger.debug('DB Operation', {
    operation,
    table,
    duration: duration ? `${duration}ms` : undefined,
  });
};

logger.auth = (event: string, userId: number | string, details?: Record<string, unknown>): void => {
  logger.info('Auth Event', {
    event,
    userId,
    ...details,
  });
};

logger.security = (event: string, details?: Record<string, unknown>): void => {
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
export default logger;
