import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export const createAuthRouter = (authService: AuthService) => {
    const router = Router();

    router.post('/login', (req: Request, res: Response): any => {
        const { email, name, role } = req.body;
        if (!email) return res.status(400).json({ error: 'Email là bắt buộc.' });

        const result = authService.login(email, name, role);
        return res.status(200).json({
            message: 'Đăng nhập thành công!',
            token: result.token,
            user: result.user
        });
    });

    return router;
};