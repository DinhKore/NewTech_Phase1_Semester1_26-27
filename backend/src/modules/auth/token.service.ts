import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../shared/errors/app-error';
import type { User } from './auth.types';

const ISSUER = 'course-assistant';
const AUDIENCE = 'course-assistant-web';
const ALGORITHM = 'HS256';

export interface IssuedToken {
  token: string;
  expiresInSeconds: number;
}

/** Port: issues and verifies the application's own access tokens. */
export interface TokenService {
  issue(user: User): IssuedToken;
  /** Returns the user id stored in the token or throws UnauthorizedError. */
  verify(token: string): number;
}

export class JwtTokenService implements TokenService {
  private readonly secret: string;
  private readonly expiresInSeconds: number;

  constructor(secret: string, expiresInSeconds: number) {
    this.secret = secret;
    this.expiresInSeconds = expiresInSeconds;
  }

  issue(user: User): IssuedToken {
    const token = jwt.sign({ email: user.email, role: user.role }, this.secret, {
      algorithm: ALGORITHM,
      subject: String(user.id),
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: this.expiresInSeconds,
    });
    return { token, expiresInSeconds: this.expiresInSeconds };
  }

  verify(token: string): number {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      const userId = typeof payload === 'string' ? NaN : Number(payload.sub);
      if (!Number.isInteger(userId)) throw new Error('Token has no valid subject');
      return userId;
    } catch {
      throw new UnauthorizedError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }
}
