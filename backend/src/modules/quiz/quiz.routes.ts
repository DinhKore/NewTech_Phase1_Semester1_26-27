import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import type { AuthMiddleware } from '../auth/auth.middleware';
import type { QuizController } from './quiz.controller';

export function createQuizRouter(controller: QuizController, auth: AuthMiddleware): Router {
  const router = Router();
  router.use(auth.authenticate);
  router.post('/', asyncHandler(controller.generate));
  return router;
}
