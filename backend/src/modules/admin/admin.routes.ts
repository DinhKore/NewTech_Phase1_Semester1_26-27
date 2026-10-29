import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AuthMiddleware } from '../auth/auth.middleware';
import type { MetricsService } from './metrics.service';

const MetricsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export function createAdminRouter(metricsService: MetricsService, auth: AuthMiddleware): Router {
  const router = Router();
  router.use(auth.authenticate, auth.requireRole('admin'));

  router.get('/metrics', (req: Request, res: Response): void => {
    const { limit } = MetricsQuerySchema.parse(req.query);
    res.status(200).json(metricsService.overview(limit));
  });

  return router;
}
