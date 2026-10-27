import { Router, Response } from 'express';
import { AuthService, AuthRequest } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';

export const createAdminRouter = (authService: AuthService, dbService: DatabaseService) => {
    const router = Router();

    router.get('/metrics', authService.authenticate, authService.requireAdmin, (req: AuthRequest, res: Response): any => {
        try {
            const metrics = dbService.getAIMetrics();
            return res.status(200).json(metrics);
        } catch (err) {
            return res.status(500).json({ error: 'Lỗi tải thống kê admin' });
        }
    });

    return router;
};