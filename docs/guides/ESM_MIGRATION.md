# Backend ESM Migration Guide

## Overview

The NoteHub backend has been successfully migrated from CommonJS to ECMAScript Modules (ESM). This document describes the changes made and how to work with the new ESM codebase.

## What Changed

### Package Configuration

**backend/package.json:**
```json
{
  "type": "module",
  ...
}
```

Adding `"type": "module"` tells Node.js to treat all `.js` files as ESM modules.

### Import/Export Syntax

**Before (CommonJS):**
```javascript
const express = require('express');
const { someFunc } = require('./utils');

module.exports = router;
module.exports = { func1, func2 };
```

**After (ESM):**
```javascript
import express from 'express';
import { someFunc } from './utils.js';

export default router;
export { func1, func2 };
```

### Key Differences

1. **File Extensions Required:**
   - All relative imports MUST include the `.js` extension
   - `import db from './config/database.js'` (note the `.js`)
   
2. **No __dirname or __filename:**
   - ESM modules don't have these globals
   - Use this pattern instead:
   ```javascript
   import { fileURLToPath } from 'node:url';
   import path from 'node:path';
   
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);
   ```

3. **Dynamic Imports:**
   - Use `await import()` for dynamic imports
   - Must be inside an async function
   ```javascript
   const module = (await import('./module.js')).default;
   ```

4. **JSON Imports:**
   - Can't use `import` directly for JSON files in some Node versions
   - Use `createRequire` for package.json:
   ```javascript
   import { createRequire } from 'node:module';
   const require = createRequire(import.meta.url);
   const packageJson = require('../package.json');
   ```

5. **Top-level await:**
   - ESM supports top-level await (no need to wrap in async function)
   - But be careful - it blocks module loading

## Files Modified

### Core Application Files
- `src/index.js` - Main server entry point
- `src/config/database.js` - Database configuration
- `src/config/logger.js` - Winston logger setup
- `src/config/redis.js` - Redis cache configuration
- `src/config/elasticsearch.js` - Elasticsearch configuration
- `src/config/constants.js` - Application constants (now uses named exports)

### Models
- `src/models/index.js` - Sequelize models with proper ESM exports

### Middleware
- All middleware files in `src/middleware/`
- `auth.js`, `logging.js`, `metrics.js`, `validation.js`, `upload.js`, etc.

### Services
- All service files in `src/services/`
- `jwtService.js`, `authService.js`, `noteService.js`, `aiService.js`, etc.

### Routes
- All route files in `src/routes/`
- `auth.js`, `notes.js`, `tasks.js`, `admin.js`, etc.

### Scripts
- `scripts/seed_db.js` - Database seeding script
- `scripts/migrate_add_admin_fields.js` - Migration script

### Utilities
- `src/utils/responseHandler.js` - Now exports named functions
- `src/utils/common.js` - Named exports

## Breaking Changes

### For Developers

1. **responseHandler Import:**
   ```javascript
   // Old
   const responseHandler = require('../utils/responseHandler');
   
   // New
   import * as responseHandler from '../utils/responseHandler.js';
   ```

2. **Constants Import:**
   ```javascript
   // Old
   const { REDIS, CACHE_TTL } = require('../config/constants');
   
   // New (unchanged, still named imports)
   import { REDIS, CACHE_TTL } from '../config/constants.js';
   ```

3. **Dynamic Requires:**
   - All dynamic requires have been converted to dynamic imports
   - Example in `database.js`:
   ```javascript
   // Old
   const Database = require('better-sqlite3');
   
   // New
   const Database = (await import('better-sqlite3')).default;
   ```

## Testing

### Test Files
- Test files still need to be migrated to ESM
- Jest configuration updated to support ESM:
  ```javascript
  export default {
    testEnvironment: 'node',
    transform: {},
    extensionsToTreatAsEsm: ['.js'],
    ...
  };
  ```

### Running Tests
```bash
cd backend
npm test
```

## Common Issues and Solutions

### Issue: "Cannot find module" errors
**Solution:** Make sure all relative imports include `.js` extension

### Issue: "__dirname is not defined"
**Solution:** Add the ESM shim at the top of the file:
```javascript
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### Issue: "ERR_IMPORT_ASSERTION_TYPE_MISSING for JSON"
**Solution:** Use createRequire for JSON files:
```javascript
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = require('./data.json');
```

### Issue: "The requested module does not provide an export named 'default'"
**Solution:** Check if the module exports default or named exports:
```javascript
// If module exports named functions
import * as module from './module.js';
// or
import { specificFunction } from './module.js';

// If module has default export
import module from './module.js';
```

## Best Practices

1. **Always use .js extension in imports**
   ```javascript
   import db from './config/database.js';  // ✅ Good
   import db from './config/database';    // ❌ Bad
   ```

2. **Use named exports for utilities**
   ```javascript
   // utils/helpers.js
   export function helper1() { }
   export function helper2() { }
   
   // Import
   import { helper1, helper2 } from './utils/helpers.js';
   ```

3. **Use default export for main class/function**
   ```javascript
   // services/userService.js
   export default class UserService { }
   
   // Import
   import UserService from './services/userService.js';
   ```

4. **Organize imports**
   - Node built-in modules first
   - External packages second
   - Local modules third
   ```javascript
   import path from 'node:path';
   import fs from 'node:fs';
   
   import express from 'express';
   import cors from 'cors';
   
   import db from './config/database.js';
   import logger from './config/logger.js';
   ```

5. **Use async/await for dynamic imports**
   ```javascript
   async function loadModule() {
     const module = await import('./module.js');
     return module.default;
   }
   ```

## Migration Checklist

When adding new files:
- [ ] Use `import`/`export` syntax (not `require`/`module.exports`)
- [ ] Include `.js` extension in relative imports
- [ ] Export properly (default or named)
- [ ] Use ESM shims if you need `__dirname` or `__filename`
- [ ] Test that imports work correctly
- [ ] Run linter: `npm run lint:fix`

## Running the Application

```bash
# Install dependencies
cd backend
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Run database seed
npm run seed
```

## Advantages of ESM

1. **Standard:** ESM is the JavaScript standard for modules
2. **Better tree-shaking:** Unused code can be eliminated more effectively
3. **Static analysis:** Imports can be analyzed at build time
4. **Top-level await:** Can use await at the module level
5. **Better tooling support:** Modern tools work better with ESM
6. **Future-proof:** CommonJS is legacy, ESM is the future

## References

- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [MDN - JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Pure ESM Package Guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
