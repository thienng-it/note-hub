# OpenAPI Documentation Guide

## Overview

NoteHub now includes comprehensive OpenAPI 3.0 documentation for the entire REST API. This documentation is available in multiple formats and can be used with popular API tools like Postman, Insomnia, and Swagger UI.

## Available Documentation Formats

### 1. OpenAPI YAML Specification

**Location**: `backend/openapi.yaml`

This is the source-of-truth OpenAPI 3.0 specification file that documents all API endpoints, request/response schemas, authentication methods, and examples.

**Usage**:
- Import into API design tools (Swagger Editor, Stoplight, etc.)
- Generate client SDKs
- Validate API responses
- Generate documentation websites

### 2. Swagger UI (Interactive Documentation)

**Coming Soon**: Swagger UI will be available at `/api/docs` when the server is running.

**Features**:
- Interactive API explorer
- Try out API endpoints directly from the browser
- View request/response examples
- Authentication testing

### 3. Postman Collection

**Location**: `backend/collections/notehub-api.postman_collection.json`

A ready-to-use Postman collection with all API endpoints pre-configured.

**Import Steps**:
1. Open Postman
2. Click "Import" button
3. Select the file or drag-and-drop
4. The collection will appear in your workspace

**Features**:
- Organized by endpoint categories (Authentication, Notes, Tasks, etc.)
- Pre-configured with environment variables
- Example requests for all endpoints
- Bearer token authentication support

**Environment Variables**:
- `baseUrl`: API base URL (default: `http://localhost:5000`)
- `accessToken`: JWT access token (set after login)

### 4. Insomnia Collection

**Location**: `backend/collections/notehub-api.insomnia.json`

A complete Insomnia workspace with all API endpoints.

**Import Steps**:
1. Open Insomnia
2. Go to Preferences → Data → Import Data
3. Select the JSON file
4. Import the workspace

**Features**:
- Request folders organized by API tags
- Environment variables for easy configuration
- Authentication templates
- Query parameter examples

## Generating Collections

To regenerate the Postman and Insomnia collections from the OpenAPI spec:

```bash
cd backend
npm run generate:collections
```

This script:
1. Reads the `openapi.yaml` specification
2. Converts it to Postman collection format
3. Generates an Insomnia workspace
4. Saves both files to `backend/collections/`

## API Documentation Structure

### Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

**Getting Tokens**:
1. Register: `POST /api/v1/auth/register`
2. Login: `POST /api/v1/auth/login`
3. Use the `access_token` from the response

**Token Lifecycle**:
- Access tokens expire in 24 hours
- Refresh tokens expire in 7 days
- Use `POST /api/v1/auth/refresh` to get a new access token

### Endpoints by Category

#### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and receive tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (invalidate refresh token)

#### Notes
- `GET /api/v1/notes` - List all notes (with filters)
- `POST /api/v1/notes` - Create a new note
- `GET /api/v1/notes/:id` - Get a specific note
- `PUT /api/v1/notes/:id` - Update a note
- `DELETE /api/v1/notes/:id` - Delete a note

#### Tasks
- `GET /api/v1/tasks` - List all tasks (with filters)
- `POST /api/v1/tasks` - Create a new task
- `GET /api/v1/tasks/:id` - Get a specific task
- `PUT /api/v1/tasks/:id` - Update a task
- `DELETE /api/v1/tasks/:id` - Delete a task

#### Profile
- `GET /api/v1/profile` - Get user profile
- `PUT /api/v1/profile` - Update user profile

#### Health
- `GET /api/v1/health` - API health check

## Request/Response Format

### Success Response

All successful API responses follow this format:

```json
{
  "success": true,
  "message": "Success",
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2025-12-10T06:00:00.000Z",
    "version": "v1",
    "requestId": "uuid"
  }
}
```

### Error Response

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { /* optional error details */ }
  },
  "meta": {
    "timestamp": "2025-12-10T06:00:00.000Z",
    "version": "v1",
    "requestId": "uuid"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401) - Invalid or missing authentication token
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Request validation failed
- `INTERNAL_ERROR` (500) - Internal server error

## Pagination

List endpoints support pagination with these query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Paginated Response**:

```json
{
  "success": true,
  "data": [ /* items */ ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Filtering

### Notes Filtering

Query parameters:
- `filter` - Filter type: `all`, `favorites`, `pinned`, `hidden`
- `search` - Search query (searches title and content)
- `tag` - Filter by tag name

Example:
```
GET /api/v1/notes?filter=favorites&tag=work&search=meeting
```

### Tasks Filtering

Query parameters:
- `status` - Filter by status: `pending`, `in_progress`, `completed`
- `priority` - Filter by priority: `low`, `medium`, `high`

Example:
```
GET /api/v1/tasks?status=in_progress&priority=high
```

## Rate Limiting

Authentication endpoints are rate-limited:
- 10 requests per 15 minutes per IP address

Rate limit headers in response:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1641910800
```

## Testing the API

### Using cURL

**Register**:
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Login**:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "SecurePass123!"
  }'
```

**List Notes** (authenticated):
```bash
curl -X GET http://localhost:5000/api/v1/notes \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman

1. Import the collection: `backend/collections/notehub-api.postman_collection.json`
2. Set environment variable `baseUrl` to `http://localhost:5000`
3. Execute the "Login" request
4. Copy the `access_token` from the response
5. Set environment variable `accessToken` to the copied token
6. Try other requests (authentication is automatic)

### Using Insomnia

1. Import the workspace: `backend/collections/notehub-api.insomnia.json`
2. Check the environment variables (baseUrl should be `http://localhost:5000`)
3. Execute the "Login" request
4. Copy the `access_token` from the response
5. Update the `accessToken` environment variable
6. Try other requests

## Extending the Documentation

### Adding New Endpoints

1. Update `backend/openapi.yaml` with the new endpoint
2. Define request/response schemas in the `components.schemas` section
3. Add appropriate tags for organization
4. Include examples for better clarity
5. Regenerate collections: `npm run generate:collections`

### Example Endpoint Definition

```yaml
/api/v1/resource:
  post:
    tags:
      - Resource
    summary: Create a new resource
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ResourceCreate'
          example:
            name: "Example Resource"
            value: 123
    responses:
      '201':
        description: Resource created successfully
        content:
          application/json:
            schema:
              allOf:
                - $ref: '#/components/schemas/SuccessResponse'
                - type: object
                  properties:
                    data:
                      $ref: '#/components/schemas/Resource'
      '400':
        $ref: '#/components/responses/ValidationError'
```

## Best Practices

1. **Always include authentication** - Add `Authorization: Bearer <token>` header for protected endpoints
2. **Handle errors gracefully** - Check the `success` field in responses
3. **Use pagination** - Don't fetch all data at once
4. **Set proper Content-Type** - Use `application/json` for JSON requests
5. **Validate inputs** - Check data before sending requests
6. **Log request IDs** - Use the `requestId` from `meta` for debugging
7. **Refresh tokens proactively** - Don't wait for 401 errors

## Troubleshooting

### Common Issues

**401 Unauthorized**:
- Check if token is included in Authorization header
- Verify token hasn't expired
- Try refreshing the token using `/api/v1/auth/refresh`

**400 Validation Error**:
- Check request body format
- Verify all required fields are included
- Ensure data types are correct

**404 Not Found**:
- Verify the resource ID exists
- Check if you have permission to access the resource

**500 Internal Server Error**:
- Check server logs for details
- Verify database connection
- Check if required services (Redis, Elasticsearch) are running if enabled

## Additional Resources

- [API Versioning Guide](API_VERSIONING.md)
- [JWT API Documentation](JWT_API.md)
- [API Changelog](API_CHANGELOG.md)
- [Main Documentation](../INDEX.md)

## Support

For issues or questions about the API:
1. Check the OpenAPI specification for endpoint details
2. Review the examples in the collections
3. Check server logs for error details
4. Open an issue on GitHub with reproduction steps
