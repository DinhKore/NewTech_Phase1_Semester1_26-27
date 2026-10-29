import type { Request, RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error';
import type { AuthService } from './auth.service';
import type { User, UserRole } from './auth.types';

export interface AuthMiddleware {
  /** Requires a valid `Authorization: Bearer <jwt>` header and sets `req.user`. */
  authenticate: RequestHandler;
  /** Use AFTER `authenticate`. Responds 403 when the user's role is not allowed. */
  requireRole: (...roles: UserRole[]) => RequestHandler;
}

export function createAuthMiddleware(authService: AuthService): AuthMiddleware {
  const authenticate: RequestHandler = (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedError('Thiếu access token (Authorization: Bearer ...).');
    }
    req.user = authService.authenticate(token);
    next();
  };

  const requireRole =
    (...roles: UserRole[]): RequestHandler =>
    (req, _res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        throw new ForbiddenError('Bạn không có quyền truy cập tính năng này.');
      }
      next();
    };

  return { authenticate, requireRole };
}

/** Returns the authenticated user or throws (guards against a route missing `authenticate`). */
export function requireUser(req: Request): User {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
