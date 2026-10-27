// backend/services/AuthService.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService, UserRecord } from './DatabaseService';

export interface AuthRequest extends Request {
    user?: { id: number; email: string; name: string; role: 'admin' | 'user' };
}

export class AuthService {
    private jwtSecret: string;
    private dbService: DatabaseService;

    constructor(dbService: DatabaseService, secret: string = 'newtech_super_secret_jwt_key_2026') {
        this.dbService = dbService;
        this.jwtSecret = process.env.JWT_SECRET || secret;
    }

    // Đăng nhập hoặc tạo mới user, ký cấp JWT
    public login(email: string, name?: string, role: 'admin' | 'user' = 'user'): { user: UserRecord; token: string } {
        const user = this.dbService.upsertUser(email, name || 'User', role);
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            this.jwtSecret,
            { expiresIn: '7d' }
        );
        return { user, token };
    }

    // Middleware kiểm tra JWT hợp lệ
    public authenticate = (req: AuthRequest, res: Response, next: NextFunction): any => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Chưa đăng nhập. Vui lòng cung cấp JWT token!' });
        }

        jwt.verify(token, this.jwtSecret, (err, decodedUser) => {
            if (err) {
                return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
            }
            req.user = decodedUser as any;
            next();
        });
    };

    // Middleware kiểm tra Role Admin
    public requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): any => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Từ chối truy cập: Bạn không có quyền Quản trị viên (Admin)!' });
        }
        next();
    };
}