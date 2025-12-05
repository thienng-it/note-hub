# Security Enhancements

## Overview

This document describes the recent security improvements made to the NoteHub backend service, including request tracking, enhanced headers, input validation, and error handling improvements.

## Request ID Tracking

### Purpose
Every API request is assigned a unique identifier (UUID v4) for tracking, debugging, and security auditing.

### Implementation
- **Header**: Request ID is returned in the `X-Request-ID` response header
- **Logs**: All log entries include the request ID for correlation
- **Responses**: Request ID is included in the response metadata for v1 endpoints

### Usage

**Client-side tracking:**
```javascript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

// Get request ID from header
const requestId = response.headers.get('X-Request-ID');

// Or from response body (v1 only)
const data = await response.json();
console.log('Request ID:', data.meta.requestId);
```

**Server-side logging:**
```javascript
[2025-12-05 16:00:00] INFO: API Request {
  "method": "POST",
  "path": "/api/v1/auth/login",
  "statusCode": 200,
  "duration": "150ms",
  "ip": "192.168.1.1",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Benefits
1. **Debugging**: Trace a single request through logs across microservices
2. **Support**: Users can provide request ID when reporting issues
3. **Monitoring**: Track request flows and identify bottlenecks
4. **Security**: Audit trail for security investigations

## Security Headers

### Enhanced HTTP Headers

The API now includes comprehensive security headers on all responses:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-API-Version` | v1 | Indicates API version for client compatibility |
| `X-Request-ID` | UUID | Unique request identifier |
| `X-Content-Type-Options` | nosniff | Prevents MIME type sniffing attacks |
| `X-DNS-Prefetch-Control` | off | Disables DNS prefetching for privacy |
| `X-Download-Options` | noopen | Prevents IE from opening files directly |
| `X-Frame-Options` | SAMEORIGIN | Prevents clickjacking attacks |
| `X-XSS-Protection` | 1; mode=block | Enables XSS filter in older browsers |
| `Strict-Transport-Security` | max-age=31536000; includeSubDomains | Forces HTTPS (production only) |
| `Content-Security-Policy` | (see below) | Prevents XSS and injection attacks |

### Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self';
font-src 'self';
object-src 'none';
media-src 'self';
frame-src 'none';
```

This policy:
- Restricts resources to same origin
- Allows inline scripts/styles for SPA compatibility
- Permits images from data URLs and HTTPS
- Blocks objects (Flash, Java applets)
- Prevents iframe embedding

## Input Validation

### Validation Middleware

New validation middleware provides consistent input checking:

```javascript
const { validateRequiredFields, validateEmail, validateLength, sanitizeStrings } = require('../middleware/validation');

// Example usage
router.post('/register',
  sanitizeStrings(['username', 'email']),           // Trim whitespace
  validateRequiredFields(['username', 'password']), // Check required
  validateLength('username', { min: 3, max: 50 }), // Length check
  validateEmail('email'),                          // Email format
  async (req, res) => {
    // Request has been validated
  }
);
```

### Available Validators

#### validateRequiredFields(fields)
Checks that specified fields are present in request body.

```javascript
validateRequiredFields(['username', 'password', 'email'])
```

#### validateEmail(fieldName)
Validates email format using regex.

```javascript
validateEmail('email')
```

#### validateLength(fieldName, options)
Validates string length with min/max constraints.

```javascript
validateLength('username', { min: 3, max: 50 })
validateLength('password', { min: 12 })
```

#### sanitizeStrings(fields)
Trims whitespace from string fields.

```javascript
sanitizeStrings(['username', 'email', 'bio'])
```

### Validation Responses

Validation errors return a standardized format:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  },
  "meta": {
    "timestamp": "2025-12-05T16:00:00.000Z",
    "version": "v1",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Rate Limiting

### API Rate Limits

Rate limiting protects against abuse:

| Endpoint Type | Window | Max Requests |
|--------------|--------|--------------|
| API routes (`/api/*`) | 15 minutes | 100 |
| Static files | 15 minutes | 500 |

### Rate Limit Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

### Rate Limit Exceeded Response

```json
{
  "error": "Too many requests, please try again later"
}
```

**HTTP Status**: 429 Too Many Requests

## Error Handling

### Standardized Error Codes

All errors use consistent codes for programmatic handling:

```javascript
// Authentication errors
UNAUTHORIZED           // Invalid credentials or token
REQUIRES_2FA          // 2FA code required
FORBIDDEN             // Insufficient permissions

// Validation errors
VALIDATION_ERROR      // Input validation failed

// Resource errors
NOT_FOUND             // Resource not found

// Server errors
INTERNAL_ERROR        // Unexpected server error
SERVICE_UNAVAILABLE   // Service temporarily down
```

### Error Response Structure

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE",
    "details": {
      // Optional additional context
    }
  },
  "meta": {
    "timestamp": "2025-12-05T16:00:00.000Z",
    "version": "v1",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Error Logging

All errors are logged with context:

```javascript
logger.error('Server error:', {
  error: err.message,
  stack: err.stack,
  path: req.path,
  method: req.method,
  requestId: res.locals.requestId
});
```

## Authentication Improvements

### Enhanced JWT Validation

- Validates token format before processing
- Returns specific error messages
- Uses standardized error responses
- Includes request ID in auth failures

### Example Auth Error

```json
{
  "success": false,
  "error": {
    "message": "Invalid authorization header format",
    "code": "UNAUTHORIZED"
  },
  "meta": {
    "timestamp": "2025-12-05T16:00:00.000Z",
    "version": "v1",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Logging Improvements

### Structured Logging

All logs now include:
- Request ID for correlation
- HTTP method and path
- Status code and duration
- Client IP address
- User agent (when relevant)

### Log Levels

Logs are categorized by severity:

| Level | Status Codes | Usage |
|-------|-------------|-------|
| INFO | 200-299 | Successful operations |
| WARN | 400-499 | Client errors (bad requests) |
| ERROR | 500-599 | Server errors |

### Example Log Entries

```
[2025-12-05 16:00:00] INFO: API Request {
  "method": "GET",
  "path": "/api/v1/notes",
  "statusCode": 200,
  "duration": "45ms",
  "ip": "192.168.1.1",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}

[2025-12-05 16:00:05] WARN: API Request - Client Error {
  "method": "POST",
  "path": "/api/v1/auth/login",
  "statusCode": 401,
  "duration": "12ms",
  "ip": "192.168.1.1",
  "requestId": "660e8400-e29b-41d4-a716-446655440001"
}

[2025-12-05 16:00:10] ERROR: API Request - Server Error {
  "method": "POST",
  "path": "/api/v1/notes",
  "statusCode": 500,
  "duration": "250ms",
  "ip": "192.168.1.1",
  "requestId": "770e8400-e29b-41d4-a716-446655440002"
}
```

## Best Practices

### For Developers

1. **Always use validation middleware** for user input
2. **Return standardized errors** using the response handler
3. **Log errors with request IDs** for debugging
4. **Include security headers** on all responses
5. **Sanitize input** before processing
6. **Use error codes** for programmatic error handling

### For Clients

1. **Store request IDs** when errors occur
2. **Check `success` field** before processing responses
3. **Handle rate limits** with exponential backoff
4. **Use error codes** for automated error handling
5. **Log security-relevant events** (auth failures, etc.)

### For Operations

1. **Monitor request IDs** across distributed systems
2. **Alert on error rate thresholds**
3. **Review security logs** regularly
4. **Update rate limits** based on usage patterns
5. **Rotate logs** and maintain audit trails

## Security Checklist

- [x] Request ID tracking implemented
- [x] Security headers configured
- [x] Input validation middleware created
- [x] Rate limiting enabled
- [x] Error handling standardized
- [x] Authentication errors improved
- [x] Structured logging implemented
- [x] CSP policy configured
- [x] HTTPS enforced in production
- [x] JWT validation enhanced

## Future Improvements

Planned security enhancements:

1. **API Key Authentication**: Alternative to JWT for service-to-service auth
2. **IP Whitelisting**: Restrict admin endpoints to trusted IPs
3. **Audit Log Export**: Export security events for compliance
4. **Advanced Rate Limiting**: Per-user and per-endpoint limits
5. **Security Headers Reporting**: CSP violation reporting
6. **Request Signature Validation**: HMAC-based request signing
7. **Automated Security Scanning**: Regular vulnerability assessments
