import type { Request, Response } from 'express';
import type { AuthService } from './auth.service';
import { requireUser } from './auth.middleware';
import { GoogleLoginBodySchema } from './auth.schemas';

export class AuthController {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  loginWithGoogle = async (req: Request, res: Response): Promise<void> => {
    const { credential } = GoogleLoginBodySchema.parse(req.body);
    const result = await this.authService.loginWithGoogle(credential);
    res.status(200).json(result);
  };

  me = (req: Request, res: Response): void => {
    res.status(200).json({ user: requireUser(req) });
  };
}
