# API Versioning and Response Format

## Overview

The NoteHub API now supports versioned endpoints with a standardized response format. This provides a consistent, predictable API experience while maintaining backward compatibility with existing integrations.

## API Versions

### Version 1 (v1) - Current

All v1 endpoints are prefixed with `/api/v1/`:
- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/notes/*` - Notes management
- `/api/v1/tasks/*` - Task management
- `/api/v1/profile/*` - User profile
- `/api/v1/admin/*` - Admin operations
- `/api/v1/ai/*` - AI features
- `/api/v1/health` - Health check

### Legacy (Unversioned) - Deprecated

Legacy endpoints at `/api/*` (without version prefix) are still supported for backward compatibility but may be removed in future versions. New integrations should use v1 endpoints.

## Response Format

### Success Response (v1)

All successful responses follow this structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "meta": {
    "timestamp": "2025-12-05T16:00:00.000Z",
    "version": "v1",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Fields:**
- `success`: Boolean indicating success (always `true` for successful responses)
- `message`: Human-readable success message
- `data`: The actual response data
- `meta`: Metadata about the response
  - `timestamp`: ISO 8601 timestamp of the response
  - `version`: API version used
  - `requestId`: Unique identifier for request tracking and debugging

### Error Response (v1)

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {
      // Additional error details (optional)
    }
  },
  "meta": {
    "timestamp": "2025-12-05T16:00:00.000Z",
    "version": "v1",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Fields:**
- `success`: Boolean indicating failure (always `false` for errors)
- `error`: Error information
  - `message`: Human-readable error message
  - `code`: Machine-readable error code for programmatic handling
  - `details`: Additional context about the error (optional)
- `meta`: Same metadata as success responses

### Error Codes

Common error codes include:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or invalid credentials |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Validation Errors

Validation errors provide detailed information about what failed:

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

## Examples

### Login Success (v1)

```bash
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "id": 1,
      "username": "user",
      "email": "user@example.com",
      "has_2fa": false
    }
  },
  "meta": {
    "timestamp": "2025-12-05T16:00:00.000Z",
    "version": "v1",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Login Error (v1)

```bash
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"wrong"}'
```

Response:
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials",
    "code": "UNAUTHORIZED"
  },
  "meta": {
    "timestamp": "2025-12-05T16:00:00.000Z",
    "version": "v1",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Validation Error (v1)

```bash
curl -X POST https://api.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ab","password":"test"}'
```

Response:
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "username",
      "message": "username must be at least 3 characters long"
    }
  },
  "meta": {
    "timestamp": "2025-12-05T16:00:00.000Z",
    "version": "v1",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Backward Compatibility

Legacy endpoints (`/api/*`) continue to work with the original response format:

```json
{
  "access_token": "eyJhbGc...",
  "user": { ... }
}
```

Or for errors:
```json
{
  "error": "Error message"
}
```

## Migration Guide

### Updating Existing Integrations

To migrate from legacy to v1 endpoints:

1. **Update endpoint URLs**: Change `/api/` to `/api/v1/`
   ```diff
   - POST /api/auth/login
   + POST /api/v1/auth/login
   ```

2. **Update response handling**: Access data through the new structure
   ```diff
   - const token = response.access_token;
   + const token = response.data.access_token;
   ```

3. **Update error handling**: Check the `success` field and use error codes
   ```javascript
   if (!response.success) {
     console.error(`Error ${response.error.code}: ${response.error.message}`);
     if (response.error.details) {
       console.error('Details:', response.error.details);
     }
   }
   ```

4. **Use request IDs for debugging**: Log the `requestId` from responses
   ```javascript
   console.log('Request ID:', response.meta.requestId);
   ```

## Security Headers

All API responses include security headers:

- `X-Request-ID`: Unique identifier for the request
- `X-API-Version`: API version used (e.g., "v1")
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: SAMEORIGIN
- `X-XSS-Protection`: 1; mode=block
- `Strict-Transport-Security`: max-age=31536000; includeSubDomains (production only)

## Best Practices

1. **Always use v1 endpoints** for new integrations
2. **Check the `success` field** before processing responses
3. **Use error codes** for programmatic error handling
4. **Log request IDs** for debugging and support
5. **Handle validation errors** by displaying `details` to users
6. **Set appropriate timeouts** and implement retry logic for network errors
7. **Include version in API client** libraries and SDKs

## Future Versions

When a new API version is released:
- New version will be available at `/api/v2/*`
- v1 endpoints will continue to work for at least 12 months
- Deprecation notices will be provided 6 months in advance
- Migration guides will be published with each new version
