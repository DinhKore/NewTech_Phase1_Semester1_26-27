import { httpClient } from '../../shared/api/http-client';
import type { LoginResponse, User } from './auth.types';

export const authApi = {
  /** Exchanges the Google ID token ("credential") for this app's own JWT. */
  loginWithGoogle(credential: string): Promise<LoginResponse> {
    return httpClient.request<LoginResponse>('/api/auth/google', { method: 'POST', json: { credential } });
  },

  async fetchCurrentUser(signal?: AbortSignal): Promise<User> {
    const { user } = await httpClient.request<{ user: User }>('/api/auth/me', { signal });
    return user;
  },
};
