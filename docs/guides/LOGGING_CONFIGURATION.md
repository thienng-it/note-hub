# Logging Configuration Guide

This guide explains how logging is configured in NoteHub for both backend and frontend.

## Overview

NoteHub uses structured logging with different log levels to provide better observability and debugging capabilities. The logging system is environment-aware and can be configured through environment variables.

## Backend Logging (Winston)

The backend uses [Winston](https://github.com/winstonjs/winston), a popular Node.js logging library that supports multiple transports and formats.

### Configuration

Configure logging through environment variables in your `.env` file:

```bash
# Log level: debug, info, warn, error, or silent
LOG_LEVEL=info

# Log format: json, simple, or detailed
LOG_FORMAT=simple
```

### Log Levels

- **`debug`**: Detailed information for debugging (only shown in development)
- **`info`**: General informational messages (default for development)
- **`warn`**: Warning messages for potentially harmful situations
- **`error`**: Error events (default for production)
- **`silent`**: Disable all logging

### Log Formats

#### Simple Format (Development Default)
Human-readable format with timestamps:
```
[2025-12-05 10:34:22] INFO: API Request {"method":"GET","path":"/api/notes","statusCode":200}
```

#### JSON Format (Production Default)
Machine-readable structured JSON:
```json
{
  "level": "info",
  "message": "API Request",
  "method": "GET",
  "path": "/api/notes",
  "statusCode": 200,
  "timestamp": "2025-12-05 10:34:22"
}
```

#### Detailed Format (Debugging)
Verbose format with pretty-printed metadata:
```
[2025-12-05 10:34:22] INFO: API Request
  Meta: {
    "method": "GET",
    "path": "/api/notes",
    "statusCode": 200
  }
```

### Usage in Backend Code

Import and use the logger:

```javascript
const logger = require('./config/logger');

// Basic logging
logger.info('Server started', { port: 5000 });
logger.warn('Rate limit exceeded', { ip: '192.168.1.1' });
logger.error('Database connection failed', { error: err.message });
logger.debug('Processing request', { userId: 123 });

// Convenience methods for common patterns
logger.api('GET', '/api/notes', 200, 45); // method, path, status, duration
logger.auth('login', userId, { email: 'user@example.com' });
logger.security('failed_login_attempt', { ip: '192.168.1.1' });
logger.db('SELECT', 'notes', 12); // operation, table, duration
```

### Request Logging Middleware

All API requests are automatically logged by the request logging middleware. It logs:
- HTTP method and path
- Response status code
- Request duration
- Client IP and User-Agent

Health check requests (`/api/health`) are not logged in production to reduce noise.

### Production File Logging

To enable file-based logging in production, set:

```bash
LOG_FILE_PATH=/var/log/notehub/app.log
```

This will write logs to a rotating file (max 10MB, 5 files kept).

## Frontend Logging (TypeScript)

The frontend uses a custom TypeScript logger utility that provides environment-aware logging.

### Configuration

Configure frontend logging through Vite environment variables:

```bash
# In .env or .env.local
VITE_LOG_LEVEL=info
```

### Log Levels

Same as backend: `debug`, `info`, `warn`, `error`, `silent`

- **Development**: Defaults to `info` level
- **Production**: Defaults to `error` level (only errors shown)

### Usage in Frontend Code

Import and use the logger:

```typescript
import { logger } from '../utils/logger';

// Basic logging
logger.info('Component mounted', { componentName: 'NotesPage' });
logger.warn('API call slow', { duration: '2000ms' });
logger.error('Failed to load data', new Error('Network error'));
logger.debug('State updated', { newState: state });

// Convenience methods
logger.api('GET', '/api/notes', 200, 45);
logger.action('note_created', { noteId: 123 });
logger.navigation('/notes', '/notes/edit/123');
```

### Frontend Logger Features

1. **Environment-aware**: Automatically adjusts verbosity based on development/production mode
2. **Structured**: Logs include timestamps and context objects
3. **Type-safe**: Full TypeScript support with proper types
4. **Silent in production**: Error-only logging in production builds
5. **Zero console noise**: Debug logs are completely hidden in production

## Docker Compose Logging

When running in Docker, logs are output to stdout/stderr and can be viewed with:

```bash
# View all logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# View last 100 lines
docker compose logs --tail=100 backend
```

## Best Practices

### Backend

1. **Use appropriate log levels**:
   - `error`: Unexpected errors that need attention
   - `warn`: Potential issues that should be monitored
   - `info`: Important state changes and events
   - `debug`: Detailed debugging information

2. **Include context**: Always add relevant context objects
   ```javascript
   // Good
   logger.error('User login failed', { userId, reason: 'invalid_password' });
   
   // Bad
   logger.error('Login failed');
   ```

3. **Don't log sensitive data**: Never log passwords, tokens, or PII
   ```javascript
   // Bad
   logger.info('User data', { password: '...' });
   
   // Good
   logger.info('User authenticated', { userId: user.id });
   ```

4. **Use structured logging**: Pass objects for metadata instead of string concatenation
   ```javascript
   // Good
   logger.info('Note created', { noteId, userId, title });
   
   // Bad
   logger.info('Note ' + noteId + ' created by user ' + userId);
   ```

### Frontend

1. **Minimize production logs**: Keep production logs to errors only
2. **Use debug for development**: Verbose development logs should use `debug` level
3. **Log user actions**: Track important user actions for analytics
4. **Include error details**: Always pass the error object to `logger.error()`

## Environment-Specific Configuration

### Development
```bash
LOG_LEVEL=info
LOG_FORMAT=simple
```
- Verbose logging
- Human-readable format
- All log levels visible

### Production
```bash
LOG_LEVEL=error
LOG_FORMAT=json
LOG_FILE_PATH=/var/log/notehub/app.log
```
- Error-only logging
- Machine-readable JSON
- Logs saved to file for analysis

### Debugging
```bash
LOG_LEVEL=debug
LOG_FORMAT=detailed
```
- Maximum verbosity
- Detailed format with full context
- All internal operations visible

## Monitoring and Analysis

### Development
Use the console to view logs in real-time during development.

### Production

1. **Docker logs**: `docker compose logs`
2. **File logs**: Analyze `/var/log/notehub/app.log`
3. **Log aggregation**: Send JSON logs to services like:
   - **Graylog** (recommended - see [Graylog Setup Guide](../../GRAYLOG_SETUP.md))
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Splunk
   - Datadog
   - CloudWatch

#### Graylog Integration (Recommended)

NoteHub includes built-in support for Graylog, a powerful open-source log aggregation platform.

**Quick Setup:**

1. Deploy Graylog stack (see [GRAYLOG_SETUP.md](../../GRAYLOG_SETUP.md)):
   ```bash
   docker compose --env-file .env.graylog -f docker-compose.graylog.yml up -d
   ```

2. Enable Graylog in NoteHub's `.env`:
   ```bash
   GRAYLOG_ENABLED=true
   GRAYLOG_HOST=localhost
   GRAYLOG_PORT=12201
   GRAYLOG_PROTOCOL=udp
   GRAYLOG_FACILITY=notehub-backend
   ```

3. Restart NoteHub backend:
   ```bash
   docker compose restart backend
   ```

**Benefits:**
- Real-time log streaming and search
- Powerful filtering and aggregation
- Custom dashboards and alerts
- Runs on the same VPS (port 9000)
- No external dependencies or costs

For complete setup instructions, see [Graylog Setup Guide](../../GRAYLOG_SETUP.md).

### Example: Viewing errors only
```bash
# In development
docker compose logs backend | grep ERROR

# From log file
grep '"level":"error"' /var/log/notehub/app.log | jq
```

## Troubleshooting

### No logs appearing

1. Check `LOG_LEVEL` is not set to `silent`
2. Verify logger is imported correctly
3. Ensure console transport is enabled

### Too much logging in production

1. Set `LOG_LEVEL=error` in production `.env`
2. Consider disabling health check logging (already done by default)

### Logs missing context

Make sure to pass context objects:
```javascript
logger.info('Event occurred', { eventId, userId, details });
```

## Migration from console.log

To migrate existing code:

1. **Backend**: Replace `console.log` with `logger.info` or `logger.debug`
2. **Frontend**: Import `logger` and use appropriate methods
3. **Error logging**: Replace `console.error` with `logger.error`

### Example Migration

Before:
```javascript
console.log('Server started on port', PORT);
console.error('Database error:', err);
```

After:
```javascript
logger.info('Server started', { port: PORT });
logger.error('Database error', { error: err.message, stack: err.stack });
```

## References

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [12-Factor App: Logs](https://12factor.net/logs)
