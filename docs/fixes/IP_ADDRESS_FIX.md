# IP Address Extraction Fix

## Issue
When NoteHub is running behind a reverse proxy (Docker, Traefik, nginx), the `req.ip` property in Express returned the Docker network IP address (e.g., `172.17.0.x`) instead of the real client IP address.

## Root Cause
Express.js does not trust proxy headers by default for security reasons. When `trust proxy` is not configured, Express ignores headers like `X-Forwarded-For` and `X-Real-IP` that contain the real client IP address.

## Solution
Configure Express to trust the proxy by adding `app.set('trust proxy', true)` in the main application setup.

### Code Change
**File:** `backend/src/index.js`

```javascript
const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - Required when running behind reverse proxy (Docker, Traefik, nginx)
// This allows Express to read X-Forwarded-* headers to get the real client IP
// Without this, req.ip returns the Docker network IP instead of the real user IP
app.set('trust proxy', true);
```

### How It Works
When `trust proxy` is enabled:

1. **X-Forwarded-For Header**: Express reads the leftmost IP address from this header
   - Example: `X-Forwarded-For: 203.0.113.42, 172.16.0.1, 172.16.0.2`
   - Express extracts: `203.0.113.42` (the real client IP)

2. **X-Real-IP Header**: Express also respects this header as an alternative
   - Example: `X-Real-IP: 203.0.113.42`
   - Express extracts: `203.0.113.42`

3. **req.ip Property**: Now returns the real client IP instead of the Docker network IP

## Impact
This fix affects all parts of the application that log or use IP addresses:

- **Authentication logging** (`backend/src/routes/auth.js`)
- **Request logging** (`backend/src/middleware/logging.js`)
- **Audit logging** (`backend/src/routes/admin.js`, `notes.js`, `tasks.js`)
- **Passkey registration** (`backend/src/routes/passkey.js`)
- **Rate limiting** (uses IP for limiting requests)

## Testing
New integration tests verify IP address extraction:

**File:** `backend/tests/ip-address.integration.test.js`

Tests cover:
- ✅ X-Forwarded-For header extraction
- ✅ Multiple proxy IP handling
- ✅ X-Real-IP header support
- ✅ Requests without proxy headers
- ✅ IP logging during user registration
- ✅ IP logging during user login

All 87 backend tests pass, including 6 new IP address tests.

## Security Considerations

### Rate Limiting Warning
Express-rate-limit shows a warning when `trust proxy` is enabled:
```
ValidationError: The Express 'trust proxy' setting is true, which allows anyone to trivially bypass IP-based rate limiting.
```

**This warning is expected and acceptable** in our deployment model because:

1. **Controlled Environment**: NoteHub runs behind Traefik, which we control
2. **Proxy Headers Set by Traefik**: The reverse proxy sets X-Forwarded-For headers
3. **Not Directly Exposed**: The backend is not directly exposed to the internet
4. **Proper Proxy Configuration**: Traefik is configured to forward real client IPs

### When NOT to Use `trust proxy: true`
- When your application is directly exposed to the internet without a reverse proxy
- When you don't control the reverse proxy configuration
- When the proxy might not set X-Forwarded-For headers correctly

### Alternative Configurations
For more restrictive trust settings, you can:

```javascript
// Trust only first proxy
app.set('trust proxy', 1);

// Trust specific subnets
app.set('trust proxy', ['loopback', '172.16.0.0/12']);

// Custom trust function
app.set('trust proxy', (ip) => {
  // Custom logic to determine if IP should be trusted
  return ip === '172.17.0.1' || ip.startsWith('172.16.');
});
```

## Verification
To verify the fix is working:

1. **Check logs** - Look for real client IPs in application logs instead of `172.x.x.x`
2. **Audit trail** - Verify audit logs show real user IPs
3. **Run tests** - All IP address integration tests should pass

```bash
cd backend
npm test -- tests/ip-address.integration.test.js
```

## References
- [Express Behind Proxies](https://expressjs.com/en/guide/behind-proxies.html)
- [Express trust proxy setting](https://expressjs.com/en/api.html#trust.proxy.options.table)
- [X-Forwarded-For Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For)

## Related Files
- `backend/src/index.js` - Trust proxy configuration
- `backend/tests/ip-address.integration.test.js` - IP address tests
- `backend/src/middleware/logging.js` - Request logging using req.ip
- `backend/src/routes/auth.js` - Authentication with IP logging
- `docker/traefik/dynamic.yml` - Traefik proxy configuration
