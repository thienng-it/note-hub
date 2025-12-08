/**
 * Response Adapter Middleware
 *
 * Adapts standardized v1 responses back to legacy format for backward compatibility.
 * This allows the same route handlers to work for both /api/ and /api/v1/ routes.
 */

/**
 * Middleware to detect if request is to a v1 endpoint
 */
function markAsV1(_req, res, next) {
  res.locals.isV1 = true;
  next();
}

/**
 * Intercept res.json to adapt responses for legacy endpoints
 */
function legacyResponseAdapter(_req, res, next) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method
  res.json = (data) => {
    // If this is a v1 endpoint, use standard format
    if (res.locals.isV1) {
      return originalJson(data);
    }

    // For legacy endpoints, convert from v1 format back to legacy format
    if (data && typeof data === 'object') {
      // If it's already in v1 standardized format, extract the legacy format
      if (data.success !== undefined) {
        if (data.success) {
          // Success response - return just the data
          return originalJson(data.data);
        } else {
          // Error response - return { error: message } format
          let errorMessage = data.error?.message || 'Error';

          // For validation errors, extract the more specific message from details if available
          if (data.error?.code === 'VALIDATION_ERROR' && data.error?.details) {
            const details = data.error.details;

            // Handle missing fields
            if (details.missingFields) {
              const fields = details.missingFields;

              // Check if a custom message was provided that's more specific than the default
              const hasCustomMessage =
                details.message && !details.message.startsWith('Missing required fields:');

              if (hasCustomMessage) {
                // Use the provided custom message
                errorMessage = details.message;
              } else {
                // Construct standard legacy messages for common cases
                if (fields.includes('username') && fields.includes('password')) {
                  errorMessage = 'Username and password required';
                } else if (fields.includes('refresh_token')) {
                  errorMessage = 'Refresh token required';
                } else {
                  errorMessage = `Missing required fields: ${fields.join(', ')}`;
                }
              }
            }
            // Handle field-specific validation errors
            else if (details.field && details.message) {
              // Transform validation messages to match legacy format
              const msg = details.message;
              // Convert "username must be at least 3 characters long" to "Username must be at least 3 characters"
              if (msg.includes('must be at least') && msg.includes('characters long')) {
                const field = details.field.charAt(0).toUpperCase() + details.field.slice(1);
                const match = msg.match(/at least (\d+) characters/);
                if (match) {
                  errorMessage = `${field} must be at least ${match[1]} characters`;
                } else {
                  errorMessage = msg;
                }
              } else {
                errorMessage = msg;
              }
            }
            // Use the details message if more specific than generic
            else if (details.message && details.message !== 'Validation failed') {
              errorMessage = details.message;
            }
          }

          const legacyError = { error: errorMessage };

          // Preserve special fields for auth errors
          if (data.error?.details?.requires_2fa) {
            legacyError.requires_2fa = true;
          }

          return originalJson(legacyError);
        }
      }
    }

    // Pass through if not in v1 format
    return originalJson(data);
  };

  next();
}

module.exports = {
  markAsV1,
  legacyResponseAdapter,
};
