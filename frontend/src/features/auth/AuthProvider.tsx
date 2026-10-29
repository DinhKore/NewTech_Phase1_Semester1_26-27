import { googleLogout } from '@react-oauth/google';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isAbortError } from '../../shared/api/api-error';
import { sessionStore } from '../../shared/api/session-store';
import { authApi } from './auth.api';
import type { User } from './auth.types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';

interface AuthState {
  status: AuthStatus;
  user: User | null;
}

const initialState = (): AuthState => ({ status: sessionStore.getToken() ? 'loading' : 'anonymous', user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const logout = useCallback(() => {
    googleLogout();
    sessionStore.clear();
    setState({ status: 'anonymous', user: null });
  }, []);

  // Restore the session on page load by asking the server who the token belongs to.
  useEffect(() => {
    if (!sessionStore.getToken()) return;

    const controller = new AbortController();
    authApi
      .fetchCurrentUser(controller.signal)
      .then((user) => setState({ status: 'authenticated', user }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        sessionStore.clear();
        setState({ status: 'anonymous', user: null });
      });
    return () => controller.abort();
  }, []);

  // The HTTP client reports expired/invalid tokens (HTTP 401) here.
  useEffect(() => sessionStore.onUnauthorized(logout), [logout]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const result = await authApi.loginWithGoogle(credential);
    sessionStore.setToken(result.accessToken);
    setState({ status: 'authenticated', user: result.user });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status: state.status, user: state.user, loginWithGoogle, logout }),
    [state, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
