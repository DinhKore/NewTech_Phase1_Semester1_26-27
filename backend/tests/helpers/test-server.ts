import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../src/app';
import { loadConfig, type AppConfig } from '../../src/config/env';
import { buildContainer, type Container } from '../../src/container';
import { Logger } from '../../src/shared/logger/logger';
import { FakeEmbeddingClient, FakeGoogleVerifier, FakeLlmClient, FakePdfExtractor, fakeCredential } from './fakes';

export const ADMIN_EMAIL = 'admin@test.dev';

export function createTestConfig(overrides: Record<string, string> = {}): AppConfig {
  return loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_PATH: ':memory:',
    GOOGLE_CLIENT_ID: 'test-client-id',
    JWT_SECRET: 'x'.repeat(48),
    ADMIN_EMAILS: ADMIN_EMAIL,
    GEMINI_API_KEY: 'test-api-key',
    RAG_MIN_SCORE: '0.3',
    ...overrides,
  });
}

export interface ApiResponse {
  status: number;
  headers: Headers;
  /** Parsed JSON when the response is JSON, otherwise the raw text. */
  body: any;
  text: string;
}

export interface RequestOptions {
  method?: string;
  token?: string;
  json?: unknown;
  form?: FormData;
}

export interface TestServer {
  baseUrl: string;
  container: Container;
  llm: FakeLlmClient;
  request(path: string, options?: RequestOptions): Promise<ApiResponse>;
  login(email: string): Promise<string>;
  uploadPdf(token: string, filename: string, content: string): Promise<ApiResponse>;
  close(): Promise<void>;
}

export async function startTestServer(configOverrides: Record<string, string> = {}): Promise<TestServer> {
  const config = createTestConfig(configOverrides);
  const llm = new FakeLlmClient();
  const container = buildContainer(config, new Logger('silent', false), {
    llm,
    embeddings: new FakeEmbeddingClient(),
    googleVerifier: new FakeGoogleVerifier(),
    pdfExtractor: new FakePdfExtractor(),
  });
  const app = createApp(container, { enableRateLimit: false });

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const request = async (path: string, options: RequestOptions = {}): Promise<ApiResponse> => {
    const headers: Record<string, string> = {};
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    let body: string | FormData | undefined;
    if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.json);
    } else if (options.form) {
      body = options.form;
    }

    const response = await fetch(`${baseUrl}${path}`, { method: options.method ?? 'GET', headers, body });
    const text = await response.text();
    const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
    return { status: response.status, headers: response.headers, text, body: isJson ? JSON.parse(text) : text };
  };

  return {
    baseUrl,
    container,
    llm,
    request,
    async login(email) {
      const response = await request('/api/auth/google', { method: 'POST', json: { credential: fakeCredential(email) } });
      if (response.status !== 200) throw new Error(`login failed: ${response.text}`);
      return response.body.accessToken as string;
    },
    uploadPdf(token, filename, content) {
      const form = new FormData();
      form.append('document', new Blob([`%PDF-1.4\n${content}`], { type: 'application/pdf' }), filename);
      return request('/api/documents', { method: 'POST', token, form });
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      container.dispose();
    },
  };
}

/** Parses an SSE response body into its JSON events. */
export function parseSse(text: string): Array<Record<string, any>> {
  return text
    .split('\n\n')
    .map((frame) => frame.trim())
    .filter((frame) => frame.startsWith('data: '))
    .map((frame) => JSON.parse(frame.slice('data: '.length)) as Record<string, any>);
}
