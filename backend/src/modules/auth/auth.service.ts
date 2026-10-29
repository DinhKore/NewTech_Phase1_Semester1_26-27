import { UnauthorizedError } from '../../shared/errors/app-error';
import type { Logger } from '../../shared/logger/logger';
import type { LoginResult, User } from './auth.types';
import type { GoogleIdentityVerifier } from './google-identity-verifier';
import type { TokenService } from './token.service';
import type { UserRepository } from './user.repository';

export interface AuthServiceDeps {
  users: UserRepository;
  googleVerifier: GoogleIdentityVerifier;
  tokens: TokenService;
  /** Lower-case emails that receive the admin role. */
  adminEmails: readonly string[];
  logger: Logger;
}

export class AuthService {
  private readonly deps: AuthServiceDeps;

  constructor(deps: AuthServiceDeps) {
    this.deps = deps;
  }

  async loginWithGoogle(idToken: string): Promise<LoginResult> {
    const profile = await this.deps.googleVerifier.verify(idToken);
    const role = this.deps.adminEmails.includes(profile.email) ? 'admin' : 'user';

    const user = this.deps.users.upsertFromGoogle({
      googleSub: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      role,
    });

    const { token, expiresInSeconds } = this.deps.tokens.issue(user);
    this.deps.logger.info('user logged in', { userId: user.id, role: user.role });
    return { accessToken: token, tokenType: 'Bearer', expiresIn: expiresInSeconds, user };
  }

  /** Validates a bearer token and loads the CURRENT user (so role changes/deletions apply immediately). */
  authenticate(accessToken: string): User {
    const userId = this.deps.tokens.verify(accessToken);
    const user = this.deps.users.findById(userId);
    if (!user) throw new UnauthorizedError('Tài khoản không còn tồn tại.');
    return user;
  }
}
