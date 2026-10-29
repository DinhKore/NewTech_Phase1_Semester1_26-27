import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Container } from './container';
import { createErrorHandler, notFoundHandler } from './http/error-handler';
import { createRateLimiters } from './http/rate-limiters';
import { createRequestContext } from './http/request-context';
import { createAdminRouter } from './modules/admin/admin.routes';
import { AuthController } from './modules/auth/auth.controller';
import { createAuthMiddleware } from './modules/auth/auth.middleware';
import { createAuthRouter } from './modules/auth/auth.routes';
import { ChatController } from './modules/chat/chat.controller';
import { createChatRouter } from './modules/chat/chat.routes';
import { DocumentController } from './modules/documents/document.controller';
import { createDocumentRouter } from './modules/documents/document.routes';
import { QuizController } from './modules/quiz/quiz.controller';
import { createQuizRouter } from './modules/quiz/quiz.routes';

export interface AppOptions {
  /** Disable in automated tests so they are not throttled. */
  enableRateLimit?: boolean;
}

/** Builds the Express application from an already-wired container. Does not start listening. */
export function createApp(container: Container, options: AppOptions = {}): Express {
  const { config, logger } = container;
  const limiters = createRateLimiters(options.enableRateLimit ?? true);
  const auth = createAuthMiddleware(container.authService);

  const app = express();
  app.disable('x-powered-by');

  app.use(createRequestContext(logger));
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', limiters.general);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  app.use('/api/auth', limiters.auth, createAuthRouter(new AuthController(container.authService), auth));
  app.use(
    '/api/documents',
    createDocumentRouter(new DocumentController(container.documentService), auth, config.upload.maxBytes),
  );
  app.use('/api/chat', limiters.ai, createChatRouter(new ChatController(container.chatService), auth));
  app.use('/api/quiz', limiters.ai, createQuizRouter(new QuizController(container.quizService), auth));
  app.use('/api/admin', createAdminRouter(container.metricsService, auth));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
