import { env } from '../../config/env';
import { ApiError, isAbortError } from './api-error';
import { sessionStore } from './session-store';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  query?: Record<string, string | number | undefined>;
  json?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${env.apiBaseUrl}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: { error?: { code?: string; message?: string; requestId?: string } } | undefined;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  if (response.status === 401) sessionStore.notifyUnauthorized();

  const error = payload?.error;
  return new ApiError(
    response.status,
    error?.code ?? 'HTTP_ERROR',
    error?.message ?? `Yêu cầu thất bại (HTTP ${response.status}).`,
    error?.requestId,
  );
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers();
  const token = sessionStore.getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  } else if (options.formData) {
    body = options.formData; // the browser sets the multipart boundary itself
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng hoặc backend.');
  }

  if (!response.ok) throw await toApiError(response);
  return response;
}

export const httpClient = {
  /** JSON request. Resolves to `undefined` for 204 responses. */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await send(path, options);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  },

  /** Raw response, for streaming endpoints (SSE). */
  stream(path: string, options: RequestOptions = {}): Promise<Response> {
    return send(path, options);
  },
};
