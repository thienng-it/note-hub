# NoteHub E2E Tests

Comprehensive E2E test suite using CodeceptJS with Playwright for the NoteHub application.

## Quick Start

```bash
# Install dependencies
cd e2e
npm install

# Install Playwright browsers
npx playwright install chromium

# Run tests (headless)
npm test

# Run tests with browser visible
npm run test:headed

# Run specific test file
npx codeceptjs run tests/01_auth_test.js
```

## Prerequisites

1. **Backend running** at `http://localhost:5000`
2. **Frontend running** at `http://localhost:5173`

Start the services:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - E2E tests
cd e2e && npm test
```

## Test Structure

```
e2e/
├── codecept.conf.js       # Main configuration
├── steps_file.js          # Custom actor methods
├── helpers/
│   ├── auth_helper.js     # Authentication helper
│   └── api_helper.js      # API helper for test setup
├── pages/
│   ├── login.page.js      # Login page object
│   ├── register.page.js   # Registration page object
│   ├── notes.page.js      # Notes page object
│   ├── tasks.page.js      # Tasks page object
│   ├── profile.page.js    # Profile page object
│   └── admin.page.js      # Admin page object
├── fixtures/
│   ├── users.json         # Test user data
│   ├── notes.json         # Test note data
│   └── tasks.json         # Test task data
└── tests/
    ├── 01_auth_test.js          # Authentication tests
    ├── 02_register_test.js      # Registration tests
    ├── 03_notes_crud_test.js    # Notes CRUD tests
    ├── 04_notes_features_test.js # Notes features tests
    ├── 05_notes_folders_test.js # Notes folders tests
    ├── 06_notes_sharing_test.js # Notes sharing tests
    ├── 07_tasks_crud_test.js    # Tasks CRUD tests
    ├── 08_tasks_features_test.js # Tasks features tests
    ├── 09_profile_test.js       # Profile tests
    ├── 10_settings_test.js      # Settings tests
    ├── 11_admin_test.js         # Admin dashboard tests
    ├── 12_2fa_test.js           # 2FA tests
    ├── 13_edge_cases_test.js    # Edge cases tests
    └── 14_critical_path_test.js # Critical path tests
```

## Test Coverage

| Test File | Scenarios | Coverage |
|-----------|-----------|----------|
| 01_auth_test.js | 18 | Login, logout, OAuth, security |
| 02_register_test.js | 14 | Registration, validation |
| 03_notes_crud_test.js | 15 | Create, read, update, delete notes |
| 04_notes_features_test.js | 16 | Search, filter, favorites, pins |
| 05_notes_folders_test.js | 11 | Folder management |
| 06_notes_sharing_test.js | 10 | Public sharing, permissions |
| 07_tasks_crud_test.js | 17 | Task management |
| 08_tasks_features_test.js | 15 | Filtering, templates |
| 09_profile_test.js | 13 | Profile editing, password |
| 10_settings_test.js | 16 | Theme, language (i18n) |
| 11_admin_test.js | 15 | Admin dashboard, audit logs |
| 12_2fa_test.js | 10 | 2FA setup and management |
| 13_edge_cases_test.js | 18 | Error handling, edge cases |
| 14_critical_path_test.js | 7 | End-to-end user journeys |

**Total: 160+ test scenarios**

## Scripts

```bash
npm test              # Run all tests headless
npm run test:headed   # Run with browser visible
npm run test:debug    # Debug mode
npm run test:parallel # Run tests in parallel
npm run dry-run       # Check test syntax without running
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:5173` | Frontend URL |
| `API_URL` | `http://localhost:5000` | Backend API URL |
| `HEADLESS` | `true` | Run in headless mode |
| `NOTES_ADMIN_PASSWORD` | - | Admin password for admin tests |

## Adding New Tests

See `.agent/workflows/testing-rule.md` for the workflow on adding new tests when bugs are discovered.

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run E2E Tests
  run: |
    cd e2e
    npm ci
    npx playwright install chromium
    npm test
```
