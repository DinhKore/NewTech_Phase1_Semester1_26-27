import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import type { AuthMiddleware } from '../auth/auth.middleware';
import type { ChatController } from './chat.controller';

export function createChatRouter(controller: ChatController, auth: AuthMiddleware): Router {
  const router = Router();
  router.use(auth.authenticate);

  router.get('/sessions', controller.listSessions);
  router.post('/sessions', controller.createSession);
  router.patch('/sessions/:id', controller.renameSession);
  router.delete('/sessions/:id', controller.deleteSession);
  router.get('/sessions/:id/messages', controller.listMessages);

  router.post('/stream', asyncHandler(controller.stream));
  return router;
}
