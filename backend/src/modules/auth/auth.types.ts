export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
}

/** Identity claims extracted from a verified Google ID token. */
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  /** Lifetime in seconds. */
  expiresIn: number;
  user: User;
}
