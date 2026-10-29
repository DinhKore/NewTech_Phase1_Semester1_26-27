import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import type { AuthController } from './auth.controller';
import type { AuthMiddleware } from './auth.middleware';

export function createAuthRouter(controller: AuthController, auth: AuthMiddleware): Router {
  const router = Router();
  router.post('/google', asyncHandler(controller.loginWithGoogle));
  router.get('/me', auth.authenticate, controller.me);
  return router;
}
