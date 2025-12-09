# User Search Autocomplete Feature

## Overview

This feature adds an autocomplete dropdown to the share note page, allowing users to easily find and select other users when sharing notes.

## Implementation

### Backend API

**Endpoint**: `GET /api/v1/users/search?q={query}`

**Authentication**: Required (JWT token)

**Query Parameters**:
- `q` (string): Search query (minimum 2 characters)

**Response**:
```json
{
  "users": [
    {
      "id": 1,
      "username": "alice"
    },
    {
      "id": 2,
      "username": "alicia"
    }
  ]
}
```

**Security Features**:
1. ✅ Requires authentication
2. ✅ Minimum 2 characters to prevent enumeration
3. ✅ Maximum 10 results to prevent data harvesting
4. ✅ Only returns id and username (no sensitive data)
5. ✅ Excludes current user from results
6. ✅ Rate limited by global API rate limiter (100 req/15 min)
7. ✅ Case-insensitive search
8. ✅ SQL injection protected (parameterized queries)

### Frontend Component

**Location**: `frontend/src/pages/ShareNotePage.tsx`

**Features**:
- Real-time search with 300ms debounce
- Keyboard navigation (↑↓ arrow keys)
- Enter key to select
- Escape key to close
- Click outside to close
- Visual feedback for selected item
- Minimum 2 character hint
- Avatar badges for users

## Security Considerations

See [User Search Security Documentation](../security/USER_SEARCH_SECURITY.md) for detailed security analysis.

## Usage

### Sharing a Note

1. Navigate to note detail page
2. Click "Share" button
3. Start typing username (minimum 2 characters)
4. Select user from dropdown or continue typing
5. Choose "Allow editing" if needed
6. Click "Share Note"

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Type (2+ chars) | Show suggestions |
| ↓ | Navigate down |
| ↑ | Navigate up |
| Enter | Select current item |
| Escape | Close dropdown |

## Related Documentation

- [User Search Security](../security/USER_SEARCH_SECURITY.md)
- [JWT API Documentation](../api/JWT_API.md)
