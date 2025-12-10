/**
 * Express Request/Response Type Extensions
 *
 * Module augmentation for Express types to add custom properties.
 * This approach is preferred over global namespace declaration.
 */

import type { UserPublic } from './index';

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserPublic;
    userId?: number;
  }

  interface Response {
    locals: {
      requestId?: string;
      [key: string]: any;
    };
  }
}
