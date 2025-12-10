# TypeScript Migration Guide

## Overview

This document guides the ongoing migration of the NoteHub backend from JavaScript to TypeScript. The migration is designed to be incremental, allowing the codebase to function with both JavaScript and TypeScript files during the transition.

## Current Status

**Overall Progress: 70% Complete (37/38 core files migrated)**

### ✅ Completed Layers (100%)

**TypeScript Infrastructure** (100%):
- [x] TypeScript compiler configuration (`tsconfig.json`)
- [x] Jest configuration for TypeScript
- [x] Biome linter configuration for TypeScript
- [x] NPM scripts for TypeScript development
- [x] Type definitions for dependencies

**Core Utilities** (100% - 2/2 files) ✅:
- [x] `src/utils/responseHandler.ts` - API response handlers
- [x] `src/utils/common.ts` - Common utility functions

**Middleware** (100% - 9/9 files) ✅:
- [x] `src/middleware/compression.ts` - Response compression
- [x] `src/middleware/auth.ts` - JWT authentication
- [x] `src/middleware/logging.ts` - Request logging
- [x] `src/middleware/metrics.ts` - Prometheus metrics
- [x] `src/middleware/requestId.ts` - Request ID tracking
- [x] `src/middleware/responseAdapter.ts` - Response formatting
- [x] `src/middleware/securityHeaders.ts` - Security headers
- [x] `src/middleware/upload.ts` - File upload handling
- [x] `src/middleware/validation.ts` - Request validation

### 🚀 Nearly Complete Layers (80-90%)

**Services** (90% - 9/10 files):
- [x] `src/services/jwtService.ts` - JWT token management with refresh rotation
- [x] `src/services/authService.ts` - User authentication and password management
- [x] `src/services/noteService.ts` - Note CRUD operations (588 lines - largest file!)
- [x] `src/services/taskService.ts` - Task management operations
- [x] `src/services/challengeStorage.ts` - WebAuthn challenge storage
- [x] `src/services/googleOAuthService.ts` - Google OAuth 2.0 integration
- [x] `src/services/githubOAuthService.ts` - GitHub OAuth integration
- [x] `src/services/passkeyService.ts` - WebAuthn/FIDO2 passkey support
- [x] `src/services/aiService.ts` - AI text processing (OpenAI/Gemini/Ollama)
- [ ] 1 additional service file (if exists)

**Configuration Modules** (80% - 8/10 files):
- [x] `src/config/constants.ts` - Application constants
- [x] `src/config/logger.ts` - Winston logger configuration
- [x] `src/config/swagger.ts` - OpenAPI/Swagger configuration
- [x] `src/config/cluster.ts` - Multi-core clustering support
- [x] `src/config/connectionPool.ts` - Database connection pooling
- [x] `src/config/cacheStrategy.ts` - Advanced caching strategies
- [x] `src/config/redis.ts` - Redis cache client
- [x] `src/config/database.d.ts` - Database type declarations
- [ ] `src/config/database.js` - Database initialization (optional)
- [ ] `src/config/elasticsearch.js` - Elasticsearch setup (optional)

**Routes** (67% - 6/9 files):
- [x] `src/routes/upload.ts` - Image upload routes (85 lines)
- [x] `src/routes/ai.ts` - AI text processing routes (98 lines)
- [x] `src/routes/users.ts` - User search and profile routes (96 lines)
- [x] `src/routes/tasks.ts` - Task management routes (198 lines)
- [x] `src/routes/profile.ts` - User profile management (291 lines)
- [x] `src/routes/passkey.ts` - WebAuthn/FIDO2 authentication (331 lines)
- [ ] `src/routes/admin.js` - Admin operations (399 lines) - TODO
- [ ] `src/routes/notes.js` - Note management API (414 lines) - TODO
- [ ] `src/routes/auth.js` - Authentication flows (681 lines) - TODO
- [ ] `src/services/noteService.js` - Notes business logic (TODO)
- [ ] `src/services/taskService.js` - Tasks business logic (TODO)
- [ ] `src/services/googleOAuthService.js` - Google OAuth (TODO)
- [ ] `src/services/githubOAuthService.js` - GitHub OAuth (TODO)
- [ ] `src/services/passkeyService.js` - WebAuthn passkeys (TODO)
- [ ] `src/services/aiService.js` - AI features (TODO)
- [ ] `src/services/challengeStorage.js` - Challenge storage (TODO)

**Models** (0% migrated):
- [ ] `src/models/index.js` - Sequelize models (TODO)

**Routes** (0% migrated):
- [ ] `src/routes/auth.js` - Authentication routes (TODO)
- [ ] `src/routes/notes.js` - Notes routes (TODO)
- [ ] `src/routes/tasks.js` - Tasks routes (TODO)
- [ ] `src/routes/profile.js` - Profile routes (TODO)
- [ ] `src/routes/users.js` - Users routes (TODO)
- [ ] `src/routes/admin.js` - Admin routes (TODO)
- [ ] `src/routes/passkey.js` - Passkey routes (TODO)
- [ ] `src/routes/ai.js` - AI routes (TODO)
- [ ] `src/routes/upload.js` - Upload routes (TODO)

**Entry Point**:
- [ ] `src/index.js` - Main application entry (TODO)

**Tests** (0% migrated):
- [ ] All test files in `tests/` directory (TODO)

### Overall Progress: ~57% Complete (30+ of 38+ core files)

## TypeScript Setup

### Compiler Configuration

**File**: `backend/tsconfig.json`

Key settings:
- **Target**: ES2022 (modern JavaScript features)
- **Module**: CommonJS (Node.js compatibility)
- **Strict Mode**: Enabled for maximum type safety
- **Source Maps**: Enabled for debugging
- **Declaration Files**: Generated for library usage

### NPM Scripts

```json
{
  "build": "tsc",                          // Compile TypeScript to JavaScript
  "dev": "ts-node src/index.ts",          // Run TypeScript directly
  "dev:watch": "nodemon --exec ts-node src/index.ts", // Watch mode
  "typecheck": "tsc --noEmit",            // Type checking without compilation
  "start": "node dist/index.js",          // Run compiled JavaScript
  "start:js": "node src/index.js"         // Run original JavaScript (fallback)
}
```

### Type Definitions

**Location**: `backend/src/types/`

Core type definitions:
- `types/index.ts` - Main type definitions (User, Note, Task, etc.)
- `types/express.d.ts` - Express request/response extensions

## Migration Workflow

### Step-by-Step Process

1. **Choose a file to migrate** (start with utilities, then move to services)

2. **Create TypeScript version**:
   ```bash
   cp src/path/file.js src/path/file.ts
   ```

3. **Add TypeScript annotations**:
   ```typescript
   // Before (JavaScript)
   function getUser(userId) {
     return db.queryOne('SELECT * FROM users WHERE id = ?', [userId]);
   }
   
   // After (TypeScript)
   import type { User } from '../types';
   
   async function getUser(userId: number): Promise<User | null> {
     return db.queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
   }
   ```

4. **Fix type errors**:
   ```bash
   npm run typecheck
   ```

5. **Update imports in dependent files**:
   ```typescript
   // Update other files that import this module
   import { getUser } from './services/userService'; // .js or .ts
   ```

6. **Test the migrated file**:
   ```bash
   npm test -- file-name.test.ts
   ```

7. **Keep original .js file temporarily** for backward compatibility

8. **Remove .js file** once all dependents are migrated

### Migration Priority

**Phase 1: Foundation** (Current)
1. Type definitions
2. Utility functions
3. Configuration modules
4. Core middleware

**Phase 2: Business Logic**
5. Services (start with jwtService, authService)
6. Models
7. Middleware (complete remaining)

**Phase 3: API Layer**
8. Routes (start with auth routes)
9. Main application entry point

**Phase 4: Testing**
10. Test files
11. Test utilities

## Common Patterns

### Express Middleware

```typescript
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';

export async function myMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Middleware logic
    next();
  } catch (error) {
    next(error);
  }
}

// For authenticated routes
export async function authenticatedMiddleware(
  req: AuthRequest,  // Use custom type with user property
  res: Response,
  next: NextFunction
): Promise<void> {
  // Can access req.user and req.userId
  console.log(req.user?.username);
  next();
}
```

### Database Queries

```typescript
import type { User, Note } from '../types';

// Single row query
async function getUser(userId: number): Promise<User | null> {
  const user = await db.queryOne<User>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  return user || null;
}

// Multiple rows query
async function getNotes(userId: number): Promise<Note[]> {
  const notes = await db.query<Note>(
    'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return notes;
}
```

### Service Methods

```typescript
import type { Note, NoteWithTags, ServiceResult } from '../types';

export class NoteService {
  async createNote(
    userId: number,
    noteData: Partial<Note>
  ): Promise<ServiceResult<NoteWithTags>> {
    try {
      // Validation
      if (!noteData.title || !noteData.content) {
        return {
          success: false,
          error: 'Title and content are required',
          statusCode: 400,
        };
      }
      
      // Create note
      const note = await db.queryOne<Note>(/* SQL */);
      
      return {
        success: true,
        data: note as NoteWithTags,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
      };
    }
  }
}
```

### Route Handlers

```typescript
import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { success, error } from '../utils/responseHandler';

export async function getNotesHandler(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.userId!; // Non-null assertion after auth middleware
    const notes = await noteService.getUserNotes(userId);
    return success(res, notes);
  } catch (err) {
    return error(res, 'Failed to fetch notes', { statusCode: 500 });
  }
}
```

## Type Safety Best Practices

### 1. Avoid `any` Type

```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
function processData(data: { value: string }): string {
  return data.value;
}

// ✅ Better with generics
function processData<T extends { value: any }>(data: T): T['value'] {
  return data.value;
}
```

### 2. Use Strict Null Checks

```typescript
// ❌ Bad
function getUser(id: number): User {
  return db.findUser(id); // Might return null
}

// ✅ Good
function getUser(id: number): User | null {
  return db.findUser(id);
}

// Usage with type guard
const user = getUser(1);
if (user) {
  console.log(user.username); // Safe access
}
```

### 3. Leverage Union Types

```typescript
type Status = 'pending' | 'in_progress' | 'completed';
type Priority = 'low' | 'medium' | 'high';

function updateTaskStatus(taskId: number, status: Status): Promise<void> {
  // TypeScript ensures only valid status values
}
```

### 4. Use Type Guards

```typescript
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'number' && typeof obj.username === 'string';
}

function processEntity(entity: User | Note) {
  if (isUser(entity)) {
    console.log(entity.username); // TypeScript knows it's a User
  } else {
    console.log(entity.title); // TypeScript knows it's a Note
  }
}
```

### 5. Proper Error Handling

```typescript
async function fetchData(): Promise<string> {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    // Use type guard for error
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw error;
  }
}
```

## Tools and Commands

### Type Checking

```bash
# Check types without compilation
npm run typecheck

# Check specific file
npx tsc --noEmit src/path/file.ts
```

### Compilation

```bash
# Compile all TypeScript files
npm run build

# Watch mode
npm run build -- --watch
```

### Linting

```bash
# Check code style and types
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Test specific file
npm test -- file-name.test.ts

# Watch mode
npm test:watch
```

## Common Issues and Solutions

### Issue 1: Module Import Errors

**Problem**:
```typescript
import db from '../config/database.js';
// Error: Cannot find module or its type declarations
```

**Solution**:
```typescript
// Option 1: Import without extension (recommended)
import db from '../config/database';

// Option 2: Create type declaration file
// src/config/database.d.ts
declare module '../config/database' {
  export interface Database {
    query<T>(sql: string, params?: any[]): Promise<T[]>;
    // ... other methods
  }
  const db: Database;
  export default db;
}
```

### Issue 2: Express Request Type Extensions

**Problem**: Adding custom properties to Express Request

**Solution**:
```typescript
// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: UserPublic;
      userId?: number;
    }
  }
}
export {};
```

### Issue 3: Async Function Return Types

**Problem**:
```typescript
async function fetchUser(id: number) {
  return db.queryOne(/* ... */);
}
// Return type is Promise<any>
```

**Solution**:
```typescript
async function fetchUser(id: number): Promise<User | null> {
  const user = await db.queryOne<User>(/* ... */);
  return user || null;
}
```

### Issue 4: Third-Party Library Types

**Problem**: Missing type definitions for a library

**Solution**:
```bash
# Install types
npm install --save-dev @types/library-name

# Or create custom types
// src/types/library-name.d.ts
declare module 'library-name' {
  export function someFunction(): void;
}
```

## Testing TypeScript Code

### Jest Configuration

The Jest configuration has been updated to support TypeScript:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // ...
};
```

### Writing Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { User } from '../src/types';

describe('UserService', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should create a new user', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    const user: User = await userService.create(userData);
    
    expect(user).toBeDefined();
    expect(user.username).toBe('testuser');
  });
});
```

## Gradual Migration Strategy

The migration allows both JavaScript and TypeScript files to coexist:

1. **Dual Mode**: Keep `.js` files while creating `.ts` equivalents
2. **Import Flexibility**: TypeScript can import JavaScript modules
3. **Progressive Enhancement**: Migrate modules incrementally
4. **Backward Compatibility**: Compiled JavaScript is CommonJS compatible

## Contributing to Migration

### How to Help

1. **Pick a file** from the TODO list above
2. **Follow the migration workflow** in this document
3. **Test thoroughly** - ensure all tests pass
4. **Submit a PR** with:
   - Migrated TypeScript file
   - Updated imports in dependent files
   - Tests still passing
   - Updated migration status in this document

### Code Review Checklist

- [ ] All function parameters have types
- [ ] Return types are explicitly defined
- [ ] No use of `any` type (unless absolutely necessary)
- [ ] Error handling uses proper type guards
- [ ] Tests pass with new TypeScript file
- [ ] No TypeScript compiler errors
- [ ] Biome linter passes
- [ ] Documentation updated if needed

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Express with TypeScript](https://expressjs.com/en/advanced/developing-template-engines.html)
- [Jest with TypeScript](https://jestjs.io/docs/getting-started#via-ts-jest)

## Questions?

For questions or assistance with the migration:
1. Check this guide for common patterns
2. Review existing TypeScript files for examples
3. Consult the TypeScript documentation
4. Ask in the development team chat

---

**Last Updated**: 2025-12-10
**Migration Progress**: ~15% Complete
**Target Completion**: TBD
