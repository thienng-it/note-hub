# Backend Test Failures Analysis

## Summary

As of December 9, 2025, there are 66 failing tests out of 123 total tests in the backend test suite. This document analyzes the failures and provides recommendations for fixes.

## Test Status

- **Passing**: 57 tests (46.3%)
- **Failing**: 66 tests (53.7%)
- **Total**: 123 tests

## Passing Test Suites
1. ✅ `tests/upload.test.js` - File upload functionality
2. ✅ `tests/timestamps.test.js` - Database timestamp handling
3. ✅ `tests/ai.test.js` - AI integration
4. ✅ `tests/auth.test.js` - Basic authentication

## Failing Test Suites

### 1. tests/redis-caching.test.js
**Status**: FIXED ✅
**Issue**: JWT tokens were created with incorrect payload format
- Used `userId` instead of `user_id`
- Missing `type: 'access'` field
- No expiration time set

**Fix Applied**:
```javascript
// Before (incorrect):
userToken = jwt.sign({ userId: 1, username: 'testuser' }, process.env.JWT_SECRET);

// After (correct):
userToken = jwt.sign({ user_id: 1, type: 'access' }, process.env.JWT_SECRET, {
  expiresIn: '24h',
});
```

### 2. tests/2fa-management.test.js
**Status**: FIXED ✅
**Issue**: Same JWT token format issue as redis-caching tests

**Fix Applied**: Updated token generation to match jwtService format

### 3. tests/google-oauth.test.js
**Status**: PARTIALLY FIXED ⚠️
**Issues**:
1. ✅ Response format expectations corrected (enabled vs configured, auth_url vs authUrl)
2. ❌ Callback endpoint returning 500 errors
3. ❌ Mock googleapis library not properly simulating OAuth flow

**Remaining Work**:
- Fix googleapis mock to properly simulate:
  - Token exchange
  - User info retrieval
  - ID token verification
- Update test expectations for standardized response format
- Handle error cases in callback endpoint

**Example Error**:
```
Expected: 200
Received: 500

● POST /api/auth/google/callback › should create new user from Google account
```

### 4. tests/database-replication.test.js
**Status**: NOT FIXED ❌
**Issue**: Database replication feature tests failing

**Likely Causes**:
- Mock database not properly simulating replication behavior
- Replication status checks failing
- Read/write routing not working in test environment

**Recommended Fix**:
- Review replication implementation in `src/config/databaseReplication.js`
- Ensure mocks properly simulate master/replica behavior
- Add proper connection pool mocking

### 5. tests/health.test.js
**Status**: NOT FIXED ❌
**Issue**: Health check endpoint tests failing

**Likely Causes**:
- Database connectivity checks failing in test environment
- Mock database not returning expected health status
- Replication status checks interfering with health checks

**Recommended Fix**:
- Mock database health checks properly
- Ensure replication status mock returns valid data
- Update expectations to match actual health endpoint response format

### 6. tests/refresh-token-rotation.test.js
**Status**: NOT FIXED ❌
**Issue**: Refresh token rotation tests failing

**Likely Causes**:
- Token rotation logic not working with mocked database
- Token ID (JTI) handling issues
- Mock database not properly storing/retrieving refresh tokens

**Recommended Fix**:
- Review `jwtService.rotateRefreshToken()` implementation
- Ensure mock database properly handles token storage
- Verify token ID generation and validation

## Common Issues Across Tests

### 1. JWT Token Format
**Problem**: Tests were creating tokens with incorrect payload structure
**Impact**: Authentication middleware rejected tokens, causing 401 errors
**Solution**: Use jwtService format with `user_id` and `type` fields

### 2. Response Format
**Problem**: Tests expected raw response data but got standardized v1 format
**Impact**: Tests failed because response.body.field was undefined
**Solution**: 
- For v1 endpoints using responseHandler: access `response.body.data.field`
- For v1 endpoints using raw res.json: access `response.body.field`
- Legacy endpoints (non-v1): access `response.body.field` directly

### 3. Mock Database Configuration
**Problem**: Mock database not fully simulating SQLite/MySQL behavior
**Impact**: Database-dependent tests failing
**Solution**: Improve mock database to handle:
- Multiple sequential queries
- Transaction handling
- Replication simulation

## Recommendations

### Immediate Priorities (P0)
1. ✅ Fix JWT token format in all tests
2. ✅ Remove `continue-on-error` from CI workflow
3. ❌ Fix Google OAuth callback tests
4. ❌ Fix database replication tests

### Short Term (P1)
1. Fix refresh token rotation tests
2. Fix health check tests
3. Add integration tests with real database (SQLite in-memory)
4. Improve test documentation

### Long Term (P2)
1. Migrate from mocked database to real SQLite in-memory for integration tests
2. Add end-to-end tests with real HTTP requests
3. Add performance benchmarks
4. Improve test coverage (currently ~32%)

## Test Environment Issues

### Database Mocking
Current approach uses Jest mocks for database layer:
```javascript
jest.mock('../src/config/database', () => ({
  connect: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  run: jest.fn(),
}));
```

**Problems**:
- Doesn't simulate real database behavior
- Complex query sequences hard to mock
- Transaction behavior not captured

**Recommendation**: Use SQLite in-memory database for integration tests:
```javascript
process.env.NOTES_DB_PATH = ':memory:';
const db = require('../src/config/database');
await db.connect();
```

### External Service Mocking
Current approach mocks entire libraries (googleapis, ioredis):
```javascript
jest.mock('googleapis', () => ({ ... }));
```

**Problems**:
- Complex to maintain
- Doesn't catch integration issues
- May not reflect actual API behavior

**Recommendation**: 
- Use dedicated mocking libraries (nock, msw)
- Create shared mock fixtures
- Test against sandbox environments where available

## CI/CD Impact

### Before Fixes
- Tests marked as `continue-on-error: true`
- Failures hidden from PR checks
- Technical debt accumulating

### After Fixes
- Tests must pass for CI to succeed
- Failures block PRs
- Forces test maintenance

## Next Steps

1. **Complete remaining test fixes** (estimated 2-4 hours):
   - Google OAuth callback tests
   - Database replication tests
   - Health check tests
   - Refresh token rotation tests

2. **Improve test infrastructure** (estimated 4-8 hours):
   - Migrate to SQLite in-memory for integration tests
   - Create shared test fixtures
   - Add test utilities for common operations

3. **Monitor CI/CD**:
   - Watch for new test failures
   - Fix failures promptly
   - Maintain high test quality

## Test Quality Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Code Coverage | 32% | 80% |
| Test Pass Rate | 46% | 100% |
| Test Execution Time | ~12s | <15s |
| Flaky Tests | Unknown | 0 |

## Conclusion

The test suite has several issues primarily related to:
1. ✅ JWT token format (FIXED)
2. ❌ Complex mocking of external services
3. ❌ Database replication testing
4. ✅ Response format expectations (PARTIALLY FIXED)

With the JWT token fixes applied and continue-on-error removed from CI, the test suite is in better shape but still needs work on the remaining failing tests.

## References

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
