# API Changelog

## Version 1.1.0 (2025-11-23)

### New Features

#### Complete RESTful API
Added missing CRUD operations to achieve full REST compliance:

**Notes API**:
- ✨ `PUT/PATCH /api/notes/{id}` - Update existing note
- ✨ `DELETE /api/notes/{id}` - Delete note (owner only)

**Tasks API**:
- ✨ `GET /api/tasks/{id}` - Get individual task
- ✨ `PUT/PATCH /api/tasks/{id}` - Update existing task
- ✨ `DELETE /api/tasks/{id}` - Delete task

#### OpenAPI/Swagger Documentation
- ✨ Interactive API documentation at `/api/docs`
- Swagger UI for testing endpoints
- Complete request/response schemas
- Authentication examples
- Try-it-out functionality

#### Email Support
- ✨ Optional email field in user registration
- ✨ Login with username OR email (single field accepts both)
- Email uniqueness validation
- API endpoints support email in login
- Backward compatible (email is optional)

### Breaking Changes
None - All changes are backward compatible.

### API Endpoints Summary

**Total Endpoints**: 14

**Authentication** (3):
- `POST /api/auth/login` - Updated to accept username or email
- `POST /api/auth/refresh` - No changes
- `GET /api/auth/validate` - No changes

**Notes** (6):
- `GET /api/notes` - No changes
- `GET /api/notes/{id}` - No changes
- `POST /api/notes` - No changes
- `PUT/PATCH /api/notes/{id}` - **NEW**
- `DELETE /api/notes/{id}` - **NEW**

**Tasks** (5):
- `GET /api/tasks` - No changes
- `GET /api/tasks/{id}` - **NEW**
- `POST /api/tasks` - No changes
- `PUT/PATCH /api/tasks/{id}` - **NEW**
- `DELETE /api/tasks/{id}` - **NEW**

### Update Examples

#### Update Note
```bash
curl -X PUT http://localhost:5000/api/notes/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "body": "Updated content",
    "tags": "updated,tag",
    "pinned": true
  }'
```

#### Delete Task
```bash
curl -X DELETE http://localhost:5000/api/tasks/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Login with Email
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "password123"
  }'
```

### Migration Guide

#### For Existing API Users

1. **No action required** - All existing endpoints work as before
2. **Optional**: Update login to support email addresses
3. **Optional**: Use new UPDATE and DELETE endpoints

#### For New API Users

1. Visit `/api/docs` for interactive documentation
2. Obtain JWT token via `/api/auth/login`
3. Use Bearer token in Authorization header
4. Full CRUD operations available for notes and tasks

### Security

- All new endpoints require JWT authentication
- DELETE operations restricted to owners
- Email addresses validated and sanitized
- No new security vulnerabilities introduced

### Testing

All new endpoints have been tested:
- Unit tests for services
- Integration tests for routes
- API endpoint tests
- Total: 49 tests passing

### Documentation

- **OpenAPI Spec**: Available at `/apispec.json`
- **Swagger UI**: Available at `/api/docs`
- **JWT API Guide**: See `docs/JWT_API.md`
- **Architecture**: See `docs/ARCHITECTURE.md`

---

## Version 1.0.0 (Initial Release)

### Initial Features

**Authentication**:
- JWT token authentication
- Access tokens (1 hour)
- Refresh tokens (30 days)
- 2FA support

**Notes API**:
- List notes with filtering
- Get individual note
- Create note
- Tag support

**Tasks API**:
- List tasks with filtering
- Create task
- Priority levels
- Due dates

**Total Endpoints**: 8

---

*Last Updated: 2025-11-23*
