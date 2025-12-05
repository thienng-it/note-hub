/**
 * Frontend Logger Utility
 *
 * Centralized logging for the React frontend with environment-aware behavior.
 * Provides structured logging with different log levels.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    // Get log level from environment or default based on mode
    const envLogLevel = import.meta.env.VITE_LOG_LEVEL || 
                       (import.meta.env.MODE === 'production' ? 'error' : 'info');
    this.level = envLogLevel as LogLevel;
    this.isDevelopment = import.meta.env.MODE === 'development';
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.level === 'silent') return false;

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.level);
    const requestedIndex = levels.indexOf(level);
    
    return requestedIndex >= currentIndex;
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;
    
    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    
    return `${prefix} ${message}`;
  }

  /**
   * Debug level logging - detailed information for debugging
   * Only shown when LOG_LEVEL=debug (respects explicit configuration)
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Info level logging - general information
   * Shown in development and info level
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  /**
   * Warning level logging - potentially harmful situations
   * Shown in development, info, and warn levels
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  /**
   * Error level logging - error events
   * Always shown unless level is silent
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  /**
   * API request logging helper
   */
  api(method: string, path: string, statusCode?: number, duration?: number): void {
    const context: LogContext = { method, path };
    if (statusCode) context.statusCode = statusCode;
    if (duration) context.duration = `${duration}ms`;

    if (statusCode && statusCode >= 400) {
      this.warn('API Request Failed', context);
    } else {
      this.debug('API Request', context);
    }
  }

  /**
   * User action logging helper
   */
  action(action: string, details?: LogContext): void {
    this.info(`User Action: ${action}`, details);
  }

  /**
   * Navigation logging helper
   */
  navigation(from: string, to: string): void {
    this.debug('Navigation', { from, to });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { LogLevel, LogContext };
