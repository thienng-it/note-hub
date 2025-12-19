# Kiro CLI Instructions for NoteHub

## Project Overview

NoteHub is a modern, secure, and feature-rich personal notes application with a React SPA frontend and Node.js/Express API backend. The application follows a clean separation between frontend and backend with JWT-based authentication.

### Tech Stack

**Frontend:**
- Vite + React 19 + TypeScript
- Modern CSS with modular architecture (base, utilities, components, layout, pages, chat)
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
- Biome for linting and formatting
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
│   │   ├── styles/              # Modular CSS files
│   │   │   ├── base.css         # Variables, resets, typography
│   │   │   ├── utilities.css    # Reusable utility classes
│   │   │   ├── components.css   # UI component styles
│   │   │   ├── layout.css       # Page structure and navigation
│   │   │   ├── pages.css        # Page-specific styles
│   │   │   └── chat.css         # Chat-specific styles
│   │   ├── utils/               # Utility functions
│   │   └── index.css            # Main CSS entry (imports all modules)
│   └── biome.json               # Biome config for linting
├── backend/                     # Node.js/Express API
│   ├── src/
│   │   ├── routes/              # API route handlers
│   │   ├── services/            # Business logic layer
│   │   ├── middleware/          # Express middleware
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

3. **Database Migrations:**
   - **All database schema changes MUST include automatic migration**
   - Migrations integrated into database initialization process
   - Check if schema changes exist before applying
   - Use `IF NOT EXISTS` for table creation and column checks
   - Ensure migrations are idempotent (safe to run multiple times)

### Frontend Architecture

1. **Component Structure:**
   - Page components in `pages/` directory
   - Reusable components in `components/` directory
   - Use React hooks (useState, useEffect, useCallback, etc.)
   - Implement proper TypeScript typing for all props and state
   - **ALWAYS add snapshot tests for new components**

2. **CSS Architecture:**
   - **Modular CSS system** - All styles organized in `src/styles/`
   - **Import order matters** - base → utilities → components → layout → pages → chat
   - **Never add classes to index.css** - Use appropriate modular file
   - **Glass effect classes** - Consistent glassmorphism design system
   - **Dark mode support** - All components have `.dark` variants
   - **Responsive design** - Mobile-first with breakpoints at 640px, 768px, 1024px

3. **CSS File Organization:**
   ```
   src/styles/
   ├── base.css         # Variables, resets, typography, print styles
   ├── utilities.css    # Glass effects, transitions, shadows, flex, text
   ├── components.css   # Cards, inputs, buttons, alerts, modals, tables
   ├── layout.css       # Navigation, sidebar, responsive containers
   ├── pages.css        # Page-specific styles
   └── chat.css         # Chat page specific styles
   ```

4. **State Management:**
   - Use Context API for global state (AuthContext, ThemeContext)
   - Local state with useState for component-specific data
   - Custom hooks for reusable logic

5. **API Integration:**
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
   - **Constants:** UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)
   - **Functions:** camelCase, descriptive verbs (e.g., `validateToken`)
   - **Components:** PascalCase (e.g., `NotesPage`, `ProtectedRoute`)
   - **CSS Classes:** kebab-case with prefixes (e.g., `.glass-card`, `.btn-apple`)

### CSS Guidelines

1. **Adding New Styles:**
   - **NEVER add classes to index.css** - It only imports modules
   - Choose the correct modular file:
     - `base.css` - Variables, resets, global styles
     - `utilities.css` - Reusable utility classes (glass effects, flex, text)
     - `components.css` - UI components (buttons, inputs, cards, modals)
     - `layout.css` - Page structure (navigation, sidebar, containers)
     - `pages.css` - Page-specific styles
     - `chat.css` - Chat-specific styles

2. **Glass Effect Classes:**
   ```css
   /* Use existing glass classes */
   .glass-card          /* Standard card with glass effect */
   .glass-panel         /* Panel with elevated glass effect */
   .glass-input         /* Glass effect input field */
   .glass-button        /* Glass effect button */
   .glass-modal         /* Modal with glass effect */
   
   /* Glass utilities */
   .glass-i             /* Icon wrapper */
   .glass-span          /* Inline glass badge */
   .glass-div           /* Basic glass container */
   ```

3. **Dark Mode Support:**
   ```css
   /* Always add dark mode variants */
   .my-component {
     background: rgba(255, 255, 255, 0.8);
   }
   .dark .my-component {
     background: rgba(30, 41, 59, 0.8);
   }
   ```

4. **Responsive Design:**
   ```css
   /* Mobile-first approach */
   .component {
     /* Mobile styles (default) */
   }
   
   @media (min-width: 768px) {
     .component {
       /* Tablet styles */
     }
   }
   
   @media (min-width: 1024px) {
     .component {
       /* Desktop styles */
     }
   }
   ```

### TypeScript Guidelines

1. **Type Safety:**
   - Define explicit types for all function parameters and return values
   - Use TypeScript interfaces for data structures (see `frontend/src/types/`)
   - Avoid using `any` type - use `unknown` if type is truly unknown
   - Use type guards for runtime type checking

2. **Common Types:**
   ```typescript
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
   ```

### Backend Guidelines (Node.js/Express)

1. **Module System:**
   - Use CommonJS (`require`/`module.exports`) - NOT ES6 modules
   - Organize requires at the top of file
   - Group requires: built-in → third-party → local

2. **Error Handling:**
   ```javascript
   const responseHandler = require('../utils/responseHandler');
   
   try {
     const result = await someOperation();
     return responseHandler.success(res, result, 'Operation successful');
   } catch (error) {
     console.error('Error in operation:', error);
     return responseHandler.error(res, error.message);
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
     
     return (
       <div className="glass-card">
         {/* Component JSX */}
       </div>
     );
   }
   ```

2. **CSS Class Usage:**
   ```typescript
   // Use existing glass classes
   <div className="glass-panel">
     <h2 className="glass-title">Title</h2>
     <input className="glass-input" />
     <button className="btn-apple">Save</button>
   </div>
   ```

## Testing Guidelines

### Frontend Testing (Vitest)

1. **Snapshot Tests - MANDATORY:**
   ```typescript
   import { render, waitFor } from '@testing-library/react';
   import { describe, it, expect } from 'vitest';
   
   describe('Component Snapshots', () => {
     it('matches snapshot - default state', async () => {
       const { container } = render(<Component />);
       
       await waitFor(() => {
         expect(screen.getByText('Expected Content')).toBeInTheDocument();
       });
       
       expect(container).toMatchSnapshot();
     });
   });
   ```

2. **Updating Snapshots:**
   ```bash
   cd frontend
   npm test -- -u                    # Update all snapshots
   npm test -- ComponentName -u      # Update specific test
   git diff src/**/__snapshots__/    # Review changes
   ```

### Backend Testing (Jest)

1. **Integration Tests:**
   ```javascript
   describe('Feature', () => {
     it('should perform expected behavior', async () => {
       const result = await functionUnderTest(input);
       expect(result).toMatchObject({ /* expected */ });
     });
   });
   ```

## Development Workflow

### ⚠️ MANDATORY: Code Quality Requirements

1. **Linting is MANDATORY:**
   ```bash
   npm run lint        # Check for errors
   npm run lint:fix    # Auto-fix issues
   ```

2. **Testing is MANDATORY:**
   ```bash
   npm test           # All tests must pass (green ✅)
   npm test -- -u     # Update snapshots after UI changes
   ```

3. **Before ANY Commit:**
   ```bash
   # Frontend
   cd frontend && npm run lint && npm test
   
   # Backend
   cd backend && npm run lint && npm test
   ```

### CSS Development Workflow

1. **Before Adding Styles:**
   - Check if a similar class already exists in `src/styles/`
   - Use existing glass effect classes when possible
   - Review `CSS_CLASS_REFERENCE.md` for available classes

2. **When Adding New Styles:**
   - Identify the correct modular file (utilities, components, layout, pages)
   - Add the class to the appropriate section
   - Include dark mode variant if needed
   - Add responsive breakpoints if needed
   - Test in both light and dark mode
   - Test on mobile, tablet, and desktop

3. **After CSS Changes:**
   - Run build to verify no errors: `npm run build`
   - Update snapshot tests if UI changed: `npm test -- -u`
   - Review visual changes in browser
   - Check dark mode toggle works
   - Verify responsive breakpoints

## Common Patterns

### API Response Format

```javascript
// Success
{
  success: true,
  data: { /* response data */ },
  message: 'Operation successful'
}

// Error
{
  success: false,
  error: 'Error message'
}
```

### CSS Patterns

```css
/* Glass Card Pattern */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--blur-lg) var(--blur-saturate);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-3xl);
  padding: var(--space-6);
}

/* Button Pattern */
.btn-apple {
  background: linear-gradient(135deg, var(--apple-blue), var(--apple-purple));
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-xl);
  transition: all var(--transition-smooth);
}
```

## Anti-Patterns to Avoid

1. **CSS Anti-Patterns:**
   - ❌ Adding classes to `index.css` (use modular files)
   - ❌ Inline styles in JSX (use CSS classes)
   - ❌ Duplicate class definitions across files
   - ❌ Missing dark mode variants
   - ❌ Hardcoded colors (use CSS variables)

2. **Code Anti-Patterns:**
   - ❌ Using `any` type in TypeScript
   - ❌ Skipping error handling
   - ❌ Storing JWT in localStorage
   - ❌ Committing with linting errors
   - ❌ Committing with failing tests

## Environment Variables

### Backend Required:
- `JWT_SECRET` - JWT signing secret
- `REFRESH_TOKEN_SECRET` - Refresh token secret
- `NOTES_ADMIN_PASSWORD` - Admin account password

### Backend Optional:
- `REDIS_URL` - Redis connection string
- `ELASTICSEARCH_NODE` - Elasticsearch URL
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret

### Frontend:
- `VITE_API_URL` - Backend API URL (default: http://localhost:5000)

## Useful Commands

```bash
# Backend
cd backend
npm run dev         # Start development server
npm test           # Run tests
npm run lint       # Run linter
npm run lint:fix   # Fix linting issues

# Frontend
cd frontend
npm run dev        # Start development server
npm test           # Run tests
npm test -- -u     # Update snapshots
npm run lint       # Run linter
npm run lint:fix   # Fix linting issues
npm run build      # Production build

# Docker
docker compose up -d              # Start all services
docker compose logs -f backend    # View backend logs
```

## Documentation Guidelines

1. **Location:**
   - All documentation files MUST be placed in the `docs/` folder
   - Organize into subdirectories: api/, guides/, architecture/, security/, testing/

2. **CSS Documentation:**
   - `CSS_CLASS_REFERENCE.md` - Quick reference for all CSS classes
   - `CSS_CLEANUP_SUMMARY.md` - History of CSS organization
   - `CSS_FIX_VERIFICATION.md` - Verification reports

## Versioning Guidelines

**Before merging to main:**
```bash
# Update versions in both frontend and backend
cd frontend && npm version patch|minor|major --no-git-tag-version
cd ../backend && npm version patch|minor|major --no-git-tag-version

# Commit version changes
git add frontend/package.json backend/package.json
git commit -m "chore: bump version to x.y.z"
```

## Summary

When working on NoteHub with Kiro CLI:
1. Follow the layered architecture (routes → services → data)
2. Use Biome for all formatting and linting
3. **Use modular CSS system** - Never add classes to index.css
4. **Always include dark mode variants** for new styles
5. Write TypeScript with explicit types
6. Use CommonJS (require) on backend
7. **Test your changes** - All tests must pass (green ✅)
8. **Update snapshots** after UI changes
9. Follow security best practices
10. Use i18n for all user-facing text
11. Write documentation in docs/ folder
12. Bump versions before merging to main

## Quick Reference

### CSS Class Locations
- Glass effects → `utilities.css`
- Buttons, inputs, cards → `components.css`
- Navigation, sidebar → `layout.css`
- Page-specific → `pages.css`
- Variables, resets → `base.css`

### Common Glass Classes
- `.glass-card`, `.glass-panel`, `.glass-container`
- `.glass-input`, `.glass-textarea`, `.glass-select`
- `.btn-apple`, `.btn-apple-secondary`, `.btn-apple-danger`
- `.glass-modal`, `.glass-tooltip`, `.glass-avatar`
- `.glass-table`, `.glass-list`, `.glass-badge`

### Testing Commands
```bash
npm test              # Run all tests
npm test -- -u        # Update snapshots
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```
