# JWT API Documentation

## Overview

NoteHub provides a RESTful API with JWT (JSON Web Token) authentication for programmatic access to notes, tasks, and user data. This allows integration with external applications, mobile apps, or automation scripts.

## Authentication

### Token Types

The API uses two types of JWT tokens:

1. **Access Token**: Short-lived token (1 hour) for API requests
2. **Refresh Token**: Long-lived token (30 days) to obtain new access tokens

### Login

**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "username": "your_username",
  "password": "your_password",
  "totp_code": "123456"  // Optional, required if 2FA is enabled
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "user@example.com"
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "error": "Invalid credentials"
}
```

**Error Response** (401 Unauthorized with 2FA):
```json
{
  "error": "2FA code required",
  "requires_2fa": true
}
```

### Refresh Token

**Endpoint**: `POST /api/auth/refresh`

**Request**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Validate Token

**Endpoint**: `GET /api/auth/validate`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "user@example.com",
    "created_at": "2025-01-01T00:00:00+00:00"
  }
}
```

## Making Authenticated Requests

All API endpoints (except login and refresh) require authentication via JWT.

**Include the access token in the Authorization header**:
```
Authorization: Bearer <your_access_token>
```

### Example with curl:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://your-app.com/api/notes
```

### Example with Python:
```python
import requests

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

response = requests.get('https://your-app.com/api/notes', headers=headers)
data = response.json()
```

### Example with JavaScript:
```javascript
const response = await fetch('https://your-app.com/api/notes', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

## Notes API

### List Notes

**Endpoint**: `GET /api/notes`

**Query Parameters**:
- `view` (optional): `all`, `favorites`, `archived`, `shared` (default: `all`)
- `q` (optional): Search query
- `tag` (optional): Filter by tag name

**Response** (200 OK):
```json
{
  "notes": [
    {
      "id": 1,
      "title": "My Note",
      "body": "Note content",
      "excerpt": "Note content...",
      "pinned": false,
      "favorite": true,
      "archived": false,
      "created_at": "2025-01-01T00:00:00+00:00",
      "updated_at": "2025-01-02T00:00:00+00:00",
      "tags": [
        {"id": 1, "name": "important"},
        {"id": 2, "name": "work"}
      ]
    }
  ]
}
```

### Get Note

**Endpoint**: `GET /api/notes/{note_id}`

**Response** (200 OK):
```json
{
  "note": {
    "id": 1,
    "title": "My Note",
    "body": "Note content",
    "pinned": false,
    "favorite": true,
    "archived": false,
    "created_at": "2025-01-01T00:00:00+00:00",
    "updated_at": "2025-01-02T00:00:00+00:00",
    "tags": [
      {"id": 1, "name": "important"}
    ],
    "can_edit": true
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Note not found"
}
```

**Error Response** (403 Forbidden):
```json
{
  "error": "Access denied"
}
```

### Create Note

**Endpoint**: `POST /api/notes`

**Request**:
```json
{
  "title": "New Note",
  "body": "Note content in markdown",
  "tags": "work,important",
  "pinned": false,
  "favorite": false,
  "archived": false
}
```

**Response** (201 Created):
```json
{
  "note": {
    "id": 2,
    "title": "New Note",
    "body": "Note content in markdown",
    "pinned": false,
    "favorite": false,
    "archived": false,
    "created_at": "2025-01-03T00:00:00+00:00",
    "tags": [
      {"id": 3, "name": "work"},
      {"id": 1, "name": "important"}
    ]
  }
}
```

## Tasks API

### List Tasks

**Endpoint**: `GET /api/tasks`

**Query Parameters**:
- `filter` (optional): `all`, `active`, `completed` (default: `all`)

**Response** (200 OK):
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Complete project",
      "description": "Finish the documentation",
      "completed": false,
      "priority": "high",
      "due_date": "2025-01-10T00:00:00+00:00",
      "created_at": "2025-01-01T00:00:00+00:00",
      "is_overdue": false
    }
  ]
}
```

### Create Task

**Endpoint**: `POST /api/tasks`

**Request**:
```json
{
  "title": "New Task",
  "description": "Task details",
  "priority": "medium",
  "due_date": "2025-01-15"
}
```

**Response** (201 Created):
```json
{
  "task": {
    "id": 2,
    "title": "New Task",
    "description": "Task details",
    "completed": false,
    "priority": "medium",
    "due_date": "2025-01-15T00:00:00+00:00",
    "created_at": "2025-01-03T00:00:00+00:00"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Title is required"
}
```

### 401 Unauthorized
```json
{
  "error": "No authorization header"
}
```

```json
{
  "error": "Invalid token"
}
```

```json
{
  "error": "Token has expired"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Note not found"
}
```

## Token Management

### Token Expiration

- **Access tokens** expire after 1 hour
- **Refresh tokens** expire after 30 days

When an access token expires, use the refresh token to obtain a new one:

```python
# Token expired, refresh it
response = requests.post('https://your-app.com/api/auth/refresh', json={
    'refresh_token': refresh_token
})
new_access_token = response.json()['access_token']
```

### Best Practices

1. **Store tokens securely**: Never expose tokens in client-side code or version control
2. **Use HTTPS**: Always use HTTPS in production to protect tokens in transit
3. **Implement token refresh**: Automatically refresh tokens before they expire
4. **Handle errors gracefully**: Check for 401 errors and refresh tokens when needed
5. **Logout**: Discard tokens when user logs out (server-side token revocation can be added if needed)

## Rate Limiting

Currently, there are no rate limits, but it's recommended to:
- Cache responses where appropriate
- Avoid making excessive requests
- Use pagination for large data sets (to be implemented)

## Future Enhancements

Planned improvements to the API:

- [ ] PATCH/PUT endpoints for updating notes and tasks
- [ ] DELETE endpoints for removing resources
- [ ] Pagination for list endpoints
- [ ] Filtering and sorting options
- [ ] WebSocket support for real-time updates
- [ ] API versioning (v1, v2, etc.)
- [ ] Rate limiting
- [ ] API key authentication as alternative to JWT

## Example: Complete Workflow

### Python Example

```python
import requests
import json

BASE_URL = 'https://your-app.com/api'

# 1. Login
login_response = requests.post(f'{BASE_URL}/auth/login', json={
    'username': 'your_username',
    'password': 'your_password'
})
tokens = login_response.json()
access_token = tokens['access_token']
refresh_token = tokens['refresh_token']

# 2. Set up headers
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# 3. List all notes
notes = requests.get(f'{BASE_URL}/notes', headers=headers).json()
print(f"Found {len(notes['notes'])} notes")

# 4. Create a new note
new_note = requests.post(f'{BASE_URL}/notes', 
    headers=headers,
    json={
        'title': 'API Created Note',
        'body': '# Hello from API\n\nThis note was created via the API!',
        'tags': 'api,automation'
    }
).json()
print(f"Created note with ID: {new_note['note']['id']}")

# 5. Create a task
new_task = requests.post(f'{BASE_URL}/tasks',
    headers=headers,
    json={
        'title': 'Review API integration',
        'priority': 'high',
        'description': 'Test all API endpoints'
    }
).json()
print(f"Created task with ID: {new_task['task']['id']}")

# 6. If token expires, refresh it
def get_new_token(refresh_token):
    response = requests.post(f'{BASE_URL}/auth/refresh', json={
        'refresh_token': refresh_token
    })
    return response.json()['access_token']
```

### JavaScript Example

```javascript
class NoteHubAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(username, password, totpCode = null) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        totp_code: totpCode
      })
    });
    
    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    return data.user;
  }

  async getNotes(filter = {}) {
    const params = new URLSearchParams(filter);
    const response = await fetch(`${this.baseURL}/notes?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch notes');
    return await response.json();
  }

  async createNote(noteData) {
    const response = await fetch(`${this.baseURL}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(noteData)
    });
    
    if (!response.ok) throw new Error('Failed to create note');
    return await response.json();
  }
}

// Usage
const api = new NoteHubAPI('https://your-app.com/api');
await api.login('username', 'password');
const notes = await api.getNotes({ view: 'favorites' });
console.log(notes);
```

## Support

For questions or issues with the API:
1. Check this documentation
2. Review the API test files in `tests/test_api.py`
3. Open an issue on GitHub
4. Contact support

---

**Version**: 1.0  
**Last Updated**: 2025-11-23
