/**
 * Express Request/Response Type Extensions
 */

import type { UserPublic } from './index';

declare global {
  namespace Express {
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
}

export {};
