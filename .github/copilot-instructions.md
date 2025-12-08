# GitHub Copilot Instructions for NoteHub

## Project Overview

NoteHub is a modern, secure, and feature-rich personal notes application with a React SPA frontend and Node.js/Express API backend. The application follows a clean separation between frontend and backend with JWT-based authentication.

### Tech Stack

**Frontend:**
- Vite + React 19 + TypeScript
- TailwindCSS v4 for styling
- React Router for navigation
- Vitest + Testing Library for testing
- i18next for internationalization

**Backend:**
- Node.js 18+ with Express
- Sequelize ORM with SQLite (dev) / MySQL (prod)
- JWT authentication with refresh token rotation
- Redis for caching (optional)
- Elasticsearch for search (optional)
- Google OAuth 2.0 (optional)

**Development Tools:**
- Biome for linting and formatting (no ESLint/Prettier)
- Jest for backend testing
- Vitest for frontend testing
- Docker + docker-compose for deployment

## Project Structure

```
note-hub/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── api/                 # API client with JWT handling
│   │   ├── components/          # Reusable React components
│   │   ├── context/             # Auth and Theme contexts
│   │   ├── pages/               # Page components
│   │   ├── types/               # TypeScript type definitions
│   │   ├── services/            # Frontend services
│   │   ├── i18n/                # Internationalization configs
│   │   └── utils/               # Utility functions
│   └── biome.json               # Biome config for linting
├── backend/                     # Node.js/Express API
│   ├── src/
│   │   ├── routes/              # API route handlers
│   │   ├── services/            # Business logic layer
│   │   ├── middleware/          # Express middleware (auth, logging, etc.)
│   │   ├── config/              # Database and app configuration
│   │   ├── models/              # Sequelize models
│   │   └── utils/               # Utility functions
│   ├── tests/                   # Jest test suite
│   └── biome.json               # Biome config for linting
└── docs/                        # Comprehensive documentation
```

## Architecture Principles

### Backend Architecture

1. **Layered Architecture:**
   - **Routes Layer:** Handle HTTP requests, validate inputs, call services
   - **Service Layer:** Implement business logic, independent of HTTP
   - **Data Access Layer:** Sequelize models and database queries
   - **Middleware Layer:** Authentication, logging, validation, error handling

2. **Key Patterns:**
   - Use `responseHandler` utility for consistent API responses
   - Always validate JWT tokens using `jwtRequired` middleware
   - Use `db.queryOne` and `db.query` for raw SQL queries
   - Implement graceful degradation for optional services (Redis, Elasticsearch)
   - Follow RESTful conventions for API endpoints

3. **Database:**
   - Use Sequelize ORM for complex queries and relationships
   - Use raw SQL (with parameterization) for performance-critical queries
   - Support both SQLite (dev) and MySQL (prod) with read replicas
   - Implement database connection pooling

### Frontend Architecture

1. **Component Structure:**
   - Page components in `pages/` directory
   - Reusable components in `components/` directory
   - Use React hooks (useState, useEffect, useCallback, etc.)
   - Implement proper TypeScript typing for all props and state

2. **State Management:**
   - Use Context API for global state (AuthContext, ThemeContext)
   - Local state with useState for component-specific data
   - Custom hooks for reusable logic

3. **API Integration:**
   - All API calls go through `api/client.ts`
   - Automatic JWT token handling with refresh
   - Error handling with proper user feedback

## Code Style Guidelines

### General Conventions

1. **Formatting (Biome):**
   - 2-space indentation
   - Single quotes for strings
   - Semicolons always required
   - Trailing commas in multi-line structures
   - 100 character line width
   - Auto-organize imports

2. **Naming Conventions:**
   - **Files:** camelCase for utilities, PascalCase for components
   - **Variables:** camelCase (e.g., `userId`, `notesList`)
   - **Constants:** UPPER_SNAKE_CASE (e.g., `JWT_SECRET`, `MAX_FILE_SIZE`)
   - **Functions:** camelCase, descriptive verbs (e.g., `validateToken`, `fetchNotes`)
   - **Components:** PascalCase (e.g., `NotesPage`, `ProtectedRoute`)
   - **Types/Interfaces:** PascalCase (e.g., `Note`, `User`, `ApiResponse`)

3. **Comments:**
   - Use JSDoc for functions with complex parameters
   - Add inline comments for complex logic only
   - Avoid obvious comments that restate code
   - Keep comments up-to-date with code changes

### TypeScript Guidelines

1. **Type Safety:**
   - Define explicit types for all function parameters and return values
   - Use TypeScript interfaces for data structures (see `frontend/src/types/`)
   - Avoid using `any` type - use `unknown` if type is truly unknown
   - Use type guards for runtime type checking
   - Prefer interfaces over types for object shapes

2. **Common Types:**
   ```typescript
   // Always define proper types for API responses
   interface Note {
     id: number;
     title: string;
     content: string;
     tags: Tag[];
     is_favorite: boolean;
     is_pinned: boolean;
     created_at: string;
     updated_at: string;
   }

   interface User {
     id: number;
     username: string;
     email: string;
     bio?: string;
     theme: 'light' | 'dark';
   }
   ```

3. **React Component Types:**
   ```typescript
   // Use proper typing for component props
   interface ComponentProps {
     title: string;
     onSave: (data: FormData) => Promise<void>;
     isLoading?: boolean;
   }

   export function Component({ title, onSave, isLoading = false }: ComponentProps) {
     // Component implementation
   }
   ```

### Backend Guidelines (Node.js/Express)

1. **Module System:**
   - Use CommonJS (`require`/`module.exports`) - NOT ES6 modules
   - Organize requires at the top of file
   - Group requires: built-in → third-party → local

2. **Error Handling:**
   ```javascript
   // Always use responseHandler for consistent responses
   const responseHandler = require('../utils/responseHandler');
   
   try {
     const result = await someOperation();
     return responseHandler.success(res, result, 'Operation successful');
   } catch (error) {
     console.error('Error in operation:', error);
     return responseHandler.error(res, error.message);
   }
   ```

3. **Authentication:**
   ```javascript
   // Use jwtRequired middleware for protected routes
   const { jwtRequired } = require('../middleware/auth');
   
   router.get('/notes', jwtRequired, async (req, res) => {
     // req.user and req.userId are available
     const notes = await notesService.getUserNotes(req.userId);
     return responseHandler.success(res, notes);
   });
   ```

4. **Database Queries:**
   ```javascript
   // Use parameterized queries to prevent SQL injection
   const db = require('../config/database');
   
   // For raw queries
   const notes = await db.query(
     'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC',
     [userId]
   );
   
   // For single row
   const note = await db.queryOne(
     'SELECT * FROM notes WHERE id = ? AND user_id = ?',
     [noteId, userId]
   );
   ```

5. **Service Layer:**
   ```javascript
   // Keep business logic in service files
   // services/notesService.js
   async function createNote(userId, noteData) {
     // Validate input
     if (!noteData.title || !noteData.content) {
       throw new Error('Title and content are required');
     }
     
     // Business logic
     const note = await db.queryOne(
       'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?) RETURNING *',
       [userId, noteData.title, noteData.content]
     );
     
     return note;
   }
   ```

### Frontend Guidelines (React + TypeScript)

1. **Component Structure:**
   ```typescript
   import { useState, useEffect } from 'react';
   import { useTranslation } from 'react-i18next';
   
   interface ComponentProps {
     initialValue?: string;
   }
   
   export function Component({ initialValue = '' }: ComponentProps) {
     const { t } = useTranslation();
     const [value, setValue] = useState(initialValue);
     
     useEffect(() => {
       // Effect logic
     }, []);
     
     return (
       <div className="container">
         {/* Component JSX */}
       </div>
     );
   }
   ```

2. **API Calls:**
   ```typescript
   // Use the centralized API client
   import { notesApi } from '../api/client';
   
   async function loadNotes() {
     try {
       const notes = await notesApi.list('all');
       setNotes(notes);
     } catch (error) {
       setError(error instanceof Error ? error.message : 'Failed to load notes');
     }
   }
   ```

3. **Internationalization:**
   ```typescript
   // Always use translation keys for user-facing text
   import { useTranslation } from 'react-i18next';
   
   const { t } = useTranslation();
   
   return (
     <button>{t('common.save')}</button>
   );
   ```

4. **Form Handling:**
   ```typescript
   const handleSubmit = async (e: FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
     setError('');
     
     try {
       await api.submitForm(formData);
       navigate('/success');
     } catch (error) {
       setError(error instanceof Error ? error.message : 'An error occurred');
     } finally {
       setIsLoading(false);
     }
   };
   ```

## Security Best Practices

### Authentication & Authorization

1. **JWT Handling:**
   - Access tokens are short-lived (15 minutes)
   - Refresh tokens are long-lived (7 days)
   - Implement automatic token refresh in API client
   - Store tokens in memory only (not localStorage)

2. **Password Security:**
   - Use bcryptjs with 14 rounds for hashing
   - Implement opportunistic hash upgrades on login
   - Enforce strong password policy (12+ chars, mixed case, numbers, special chars)

3. **Two-Factor Authentication:**
   - Support TOTP-based 2FA
   - Store TOTP secrets encrypted
   - Validate 2FA codes within time window

4. **Input Validation:**
   - Validate all user inputs on both client and server
   - Sanitize HTML content to prevent XSS
   - Use parameterized queries to prevent SQL injection
   - Validate file uploads (type, size)

### API Security

1. **Middleware Stack:**
   ```javascript
   // Always include these in order:
   app.use(helmet()); // Security headers
   app.use(cors()); // CORS configuration
   app.use(express.json()); // Body parsing
   app.use(requestId); // Request tracking
   app.use(logging); // Request logging
   app.use(securityHeaders); // Custom security headers
   ```

2. **Rate Limiting:**
   - Implement rate limiting for authentication endpoints
   - Use Redis for distributed rate limiting when available

3. **Error Handling:**
   - Never expose stack traces in production
   - Log errors with context but sanitize sensitive data
   - Return generic error messages to clients

## Testing Guidelines

### Backend Testing (Jest)

1. **Test Structure:**
   ```javascript
   describe('Feature', () => {
     beforeAll(async () => {
       // Setup test database
     });
     
     afterAll(async () => {
       // Cleanup
     });
     
     it('should perform expected behavior', async () => {
       // Arrange
       const input = { /* test data */ };
       
       // Act
       const result = await functionUnderTest(input);
       
       // Assert
       expect(result).toMatchObject({ /* expected */ });
     });
   });
   ```

2. **Integration Tests:**
   - Test API endpoints with supertest
   - Use test database (separate from dev)
   - Clean up test data after each test
   - Test both success and error cases

### Frontend Testing (Vitest)

1. **Component Tests:**
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { describe, it, expect } from 'vitest';
   
   describe('Component', () => {
     it('renders correctly', () => {
       render(<Component />);
       expect(screen.getByText('Expected Text')).toBeInTheDocument();
     });
   });
   ```

2. **Test Coverage:**
   - Aim for 80%+ coverage on critical paths
   - Test user interactions (clicks, form submissions)
   - Test error states and loading states
   - Use snapshot tests for complex UI components

## Common Patterns

### API Response Format

```javascript
// Success response
{
  success: true,
  data: { /* response data */ },
  message: 'Operation successful' // optional
}

// Error response
{
  success: false,
  error: 'Error message',
  details: { /* error details */ } // optional
}
```

### Pagination

```javascript
// Request with pagination
GET /api/notes?page=1&limit=20

// Response
{
  success: true,
  data: {
    notes: [...],
    pagination: {
      page: 1,
      limit: 20,
      total: 150,
      totalPages: 8
    }
  }
}
```

### Feature Flags

```javascript
// Check if optional features are enabled
const isRedisEnabled = !!process.env.REDIS_URL;
const isElasticsearchEnabled = !!process.env.ELASTICSEARCH_NODE;
const isGoogleOAuthEnabled = !!(
  process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET
);

// Implement graceful degradation
if (isRedisEnabled) {
  // Use cache
} else {
  // Fallback to database
}
```

## Anti-Patterns to Avoid

1. **Don't:**
   - Mix ES6 imports with CommonJS in backend (use require/module.exports)
   - Store secrets in code (use environment variables)
   - Use `any` type in TypeScript without good reason
   - Skip error handling in async functions
   - Commit node_modules or build artifacts
   - Use raw SQL without parameterization
   - Store JWT tokens in localStorage (use memory only)

2. **Don't hardcode:**
   - API URLs (use environment variables)
   - File paths (use path.join)
   - Configuration values (use config files)
   - Translation strings (use i18n)

3. **Don't skip:**
   - Input validation on server side
   - Error handling in try-catch blocks
   - Tests for new features
   - Documentation updates
   - Biome linting before commit

## Development Workflow

1. **Before Starting:**
   - Review related documentation in `docs/`
   - Check existing patterns in similar files
   - Run tests to ensure baseline passes

2. **During Development:**
   - Make small, focused commits
   - Run linter frequently: `npm run lint`
   - Test changes locally
   - Update types/interfaces as needed
   - update/add translation keys as we support i18n

3. **Before Committing:**
   - Run full linting: `npm run lint`
   - Run tests: `npm test`
   - Fix any linting errors
   - Update documentation if needed

4. **Commit Messages:**
   ```
   <type>(<scope>): <subject>
   
   Types: feat, fix, docs, style, refactor, test, chore
   Example: feat(auth): add Google OAuth support
   ```

## Environment Variables

### Backend Required:
- `JWT_SECRET` - JWT signing secret
- `REFRESH_TOKEN_SECRET` - Refresh token secret
- `NOTES_ADMIN_PASSWORD` - Admin account password

### Backend Optional:
- `REDIS_URL` - Redis connection string for caching
- `ELASTICSEARCH_NODE` - Elasticsearch URL for search
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL
- `DATABASE_URL` - MySQL connection string (production)

### Frontend:
- `VITE_API_URL` - Backend API URL (default: http://localhost:5000)

## Performance Considerations

1. **Caching Strategy:**
   - Use Redis for frequently accessed data (notes list, tags)
   - Implement cache invalidation on updates
   - Fall back to database when cache unavailable

2. **Database Optimization:**
   - Use composite indexes for common query patterns
   - Implement read replicas for scalability
   - Use connection pooling

3. **Frontend Optimization:**
   - Lazy load routes with React.lazy()
   - Implement virtual scrolling for long lists
   - Optimize images and assets
   - Use React.memo for expensive components

## Useful Commands

```bash
# Backend
cd backend
npm run dev         # Start development server
npm test           # Run tests
npm run lint       # Run linter
npm run lint:fix   # Fix linting issues
npm run seed       # Seed database

# Frontend
cd frontend
npm run dev        # Start development server
npm test           # Run tests
npm run lint       # Run linter
npm run lint:fix   # Fix linting issues
npm run build      # Production build

# Docker
docker compose up -d              # Start all services
docker compose --profile mysql up # Start with MySQL
docker compose logs -f backend    # View backend logs
```

## Additional Resources

- [API Documentation](docs/api/JWT_API.md) - Current REST API reference
- [Security Guide](docs/security/SECURITY.md) - Security best practices
- [Test Suite Summary](docs/testing/TEST_SUITE_SUMMARY.md) - Testing documentation
- [Database Replication Guide](docs/guides/DATABASE_REPLICATION.md) - Read replica setup
- [Google OAuth Setup](docs/guides/GOOGLE_SSO_SETUP.md) - SSO configuration

**Note:** Some documentation files may reference older Python/Flask implementation. Always refer to the actual Node.js/Express codebase in `backend/src/` and React/TypeScript code in `frontend/src/` for current patterns and conventions.

## Summary

When working on NoteHub:
1. Follow the layered architecture (routes → services → data)
2. Use Biome for all formatting and linting
3. Write TypeScript with explicit types on frontend
4. Use CommonJS (require) on backend
5. Implement proper error handling everywhere
6. Test your changes with Jest/Vitest
7. Follow security best practices
8. Use i18n for all user-facing text
9. Keep documentation up-to-date
10. Make small, focused commits with good messages
