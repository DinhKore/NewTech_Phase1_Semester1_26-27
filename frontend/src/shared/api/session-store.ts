const TOKEN_KEY = 'course_assistant.access_token';

type UnauthorizedListener = () => void;
const listeners = new Set<UnauthorizedListener>();

/**
 * Holds the access token and lets the HTTP client tell the auth layer that the session expired,
 * without the API layer importing React code.
 */
export const sessionStore = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
  onUnauthorized(listener: UnauthorizedListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  notifyUnauthorized(): void {
    listeners.forEach((listener) => listener());
  },
};
