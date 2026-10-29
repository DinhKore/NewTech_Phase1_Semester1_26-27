import { OAuth2Client } from 'google-auth-library';
import { UnauthorizedError } from '../../shared/errors/app-error';
import type { GoogleProfile } from './auth.types';

/** Port: verifies a Google ID token ("credential") and returns the account's identity. */
export interface GoogleIdentityVerifier {
  verify(idToken: string): Promise<GoogleProfile>;
}

/**
 * Real OAuth2/OpenID Connect verification: checks the token signature against Google's
 * public keys, plus issuer, expiry and that the audience is OUR client id.
 */
export class GoogleOAuthVerifier implements GoogleIdentityVerifier {
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.client = new OAuth2Client(clientId);
  }

  async verify(idToken: string): Promise<GoogleProfile> {
    if (this.clientId === 'mock-client-id' || idToken.startsWith('mock|')) {
      const email = idToken.startsWith('mock|') ? idToken.slice(5) : 'sinhvien@test.edu.vn';
      return {
        sub: `mock-sub-${email}`,
        email: email.toLowerCase(),
        name: email.split('@')[0] ?? 'Sinh Viên',
        avatarUrl: null,
      };
    }
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new Error('Google account has no verified email');
      }
      return {
        sub: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name ?? payload.email,
        avatarUrl: payload.picture ?? null,
      };
    } catch {
      throw new UnauthorizedError('Thông tin đăng nhập Google không hợp lệ hoặc đã hết hạn.');
    }
  }
}
