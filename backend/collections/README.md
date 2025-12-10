# API Collections

This directory contains pre-configured API collections for testing the NoteHub API with popular API clients.

## Available Collections

### 📮 Postman Collection

**File**: `notehub-api.postman_collection.json`

A comprehensive Postman collection with all NoteHub API endpoints organized by category.

**Import to Postman**:
1. Open Postman
2. Click "Import" button in the top left
3. Drag and drop `notehub-api.postman_collection.json` or click "Upload Files"
4. The collection will appear in your workspace

**Setup**:
1. Create a new environment or use the global environment
2. Add variable: `baseUrl` = `http://localhost:5000`
3. Add variable: `accessToken` = (leave empty for now)

**Usage**:
1. Send the "Login" request under Authentication folder
2. Copy the `access_token` from the response
3. Set the `accessToken` variable to the copied value
4. All authenticated requests will now work automatically

**Features**:
- ✅ All endpoints organized by category
- ✅ Environment variables for easy configuration
- ✅ Automatic authentication header injection
- ✅ Request examples with sample data
- ✅ Tests for response validation

### 🌙 Insomnia Collection

**File**: `notehub-api.insomnia.json`

A complete Insomnia workspace with all API endpoints and environment configuration.

**Import to Insomnia**:
1. Open Insomnia
2. Go to Preferences → Data → Import Data
3. Select `notehub-api.insomnia.json`
4. Click "Import"
5. The workspace will be created with all requests

**Setup**:
The environment is pre-configured with:
- `baseUrl`: `http://localhost:5000`
- `accessToken`: (empty - fill after login)

**Usage**:
1. Navigate to Authentication folder
2. Send the "Login" request
3. Copy the `access_token` from response
4. Click the environment dropdown (top left)
5. Select "Manage Environments"
6. Update `accessToken` with the copied value
7. All authenticated requests will use this token

**Features**:
- ✅ Request folders by API category
- ✅ Environment variables
- ✅ Bearer token authentication
- ✅ Query parameter examples
- ✅ Request body templates

## API Categories

Both collections include the following endpoint categories:

### 🔐 Authentication
- Register new user
- Login (get tokens)
- Refresh access token
- Logout (invalidate token)

### 📝 Notes
- List all notes (with filters)
- Create new note
- Get note by ID
- Update note
- Delete note
- Search notes
- Filter by tags

### ✅ Tasks
- List all tasks (with filters)
- Create new task
- Get task by ID
- Update task
- Delete task
- Filter by status/priority

### 👤 Profile
- Get user profile
- Update profile settings
- Change password
- Enable/disable 2FA

### 👥 Users
- List users (admin)
- Get user by ID
- Update user (admin)
- Delete user (admin)

### 🔧 Admin
- View system stats
- Manage users
- Disable user 2FA
- Lock/unlock accounts

### 🏥 Health
- API health check
- Service status

## Environment Variables

### Postman

Create a Postman environment with these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `baseUrl` | `http://localhost:5000` | API base URL |
| `accessToken` | (set after login) | JWT access token |

**Optional variables**:
| Variable | Value | Description |
|----------|-------|-------------|
| `refreshToken` | (set after login) | JWT refresh token |
| `userId` | (set after login) | Current user ID |

### Insomnia

Insomnia environment is pre-configured in the collection:

```json
{
  "baseUrl": "http://localhost:5000",
  "accessToken": ""
}
```

Update `accessToken` after logging in.

## Quick Start Guide

### 1. Start the Server

```bash
cd backend
npm install
npm run dev
```

Server should be running at `http://localhost:5000`

### 2. Import Collection

Choose your preferred tool and import the respective collection file.

### 3. Test the API

**Step 1: Register** (if needed)
```
POST /api/v1/auth/register
Body: {
  "username": "testuser",
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

**Step 2: Login**
```
POST /api/v1/auth/login
Body: {
  "username": "testuser",
  "password": "SecurePass123!"
}
```

**Step 3: Copy Access Token**

From the response:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    ...
  }
}
```

Copy the `access_token` value.

**Step 4: Set Environment Variable**

- **Postman**: Set `accessToken` variable
- **Insomnia**: Update environment `accessToken`

**Step 5: Test Authenticated Endpoints**

Try these requests:
- `GET /api/v1/notes` - List notes
- `POST /api/v1/notes` - Create note
- `GET /api/v1/profile` - Get profile

## Authentication

### Bearer Token

All authenticated requests require the Authorization header:

```
Authorization: Bearer <your_access_token>
```

Both collections automatically add this header when `accessToken` is set.

### Token Lifecycle

- **Access Token**: Expires in 24 hours
- **Refresh Token**: Expires in 7 days
- **Refresh Endpoint**: `POST /api/v1/auth/refresh`

To refresh:
1. Send refresh token to `/api/v1/auth/refresh`
2. Get new access token
3. Update `accessToken` variable

## Request Examples

### Create Note

```json
POST /api/v1/notes

{
  "title": "My First Note",
  "content": "This is the content of my note.",
  "tags": ["work", "important"],
  "is_favorite": false,
  "is_pinned": false
}
```

### Update Task

```json
PUT /api/v1/tasks/123

{
  "title": "Updated Task Title",
  "status": "in_progress",
  "priority": "high",
  "due_date": "2025-12-31"
}
```

### Search Notes

```
GET /api/v1/notes?search=meeting&filter=favorites&tag=work
```

## Response Format

### Success Response

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

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { /* optional */ }
  },
  "meta": {
    "timestamp": "2025-12-10T06:00:00.000Z",
    "version": "v1",
    "requestId": "uuid"
  }
}
```

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response includes pagination metadata**:
```json
{
  "data": [...],
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

## Filtering and Sorting

### Notes Filters

- `filter`: `all`, `favorites`, `pinned`, `hidden`
- `search`: Search in title and content
- `tag`: Filter by tag name

### Tasks Filters

- `status`: `pending`, `in_progress`, `completed`
- `priority`: `low`, `medium`, `high`

## Generating Collections

To regenerate the collections from the OpenAPI spec:

```bash
cd backend
npm run generate:collections
```

This will:
1. Read `backend/openapi.yaml`
2. Generate `notehub-api.postman_collection.json`
3. Generate `notehub-api.insomnia.json`

## Testing Tips

### 1. Use Collection Variables

Store commonly used values as variables:
- API base URL
- User tokens
- User IDs
- Resource IDs

### 2. Create Test Scripts (Postman)

Add test scripts to automatically:
- Validate response status
- Check response structure
- Extract and store tokens
- Chain requests

Example test script:
```javascript
// Test status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Test response structure
pm.test("Response has data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData.success).to.be.true;
});

// Save token
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("accessToken", jsonData.data.access_token);
}
```

### 3. Use Pre-request Scripts (Postman)

Add logic before sending requests:
```javascript
// Add timestamp to request
pm.variables.set("timestamp", new Date().toISOString());

// Generate random data
pm.variables.set("randomTitle", `Note ${Math.random().toString(36).substring(7)}`);
```

### 4. Organize Requests into Folders

Both collections organize requests by category. Follow this structure when adding new endpoints.

### 5. Document Each Request

Add descriptions to requests explaining:
- Purpose of the endpoint
- Required parameters
- Expected response
- Common errors

## Troubleshooting

### 401 Unauthorized

**Problem**: Getting 401 errors on authenticated endpoints

**Solutions**:
1. Check if `accessToken` is set in environment
2. Verify token hasn't expired (24 hours)
3. Use refresh endpoint to get new token
4. Re-login if refresh token is also expired

### 404 Not Found

**Problem**: Endpoint returns 404

**Solutions**:
1. Check if server is running
2. Verify `baseUrl` is correct
3. Check endpoint path in documentation
4. Ensure resource ID exists

### 500 Internal Server Error

**Problem**: Server returns 500 error

**Solutions**:
1. Check server logs for error details
2. Verify database is running
3. Check if required services (Redis, etc.) are available
4. Validate request body format

## Additional Resources

- [OpenAPI Documentation](../../docs/api/OPENAPI_DOCS.md)
- [API Versioning Guide](../../docs/api/API_VERSIONING.md)
- [JWT API Documentation](../../docs/api/JWT_API.md)
- [Backend README](../README.md)

## Feedback

Found an issue with the collections?
1. Check the [OpenAPI spec](../openapi.yaml) for the latest API definition
2. Regenerate collections with `npm run generate:collections`
3. Open an issue on GitHub if the problem persists

---

**Last Updated**: 2025-12-10
**Collection Version**: 2.0.0
**OpenAPI Version**: 3.0.0
