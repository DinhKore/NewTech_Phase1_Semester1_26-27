import type { Logger } from '../shared/logger/logger';
import type { User } from '../modules/auth/auth.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Correlation id, also returned in the `X-Request-Id` response header. */
      id: string;
      /** Logger bound to this request's id. */
      log: Logger;
      /** Set by the `authenticate` middleware. */
      user?: User;
    }
  }
}

export {};
