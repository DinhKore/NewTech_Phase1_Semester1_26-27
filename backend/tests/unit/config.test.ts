import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfigError, loadConfig } from '../../src/config/env';

const validEnv = {
  GOOGLE_CLIENT_ID: 'client-id',
  JWT_SECRET: 'a'.repeat(32),
  GEMINI_API_KEY: 'key',
};

describe('loadConfig', () => {
  it('applies defaults and normalizes values', () => {
    const config = loadConfig({ ...validEnv, ADMIN_EMAILS: ' Admin@Example.com , other@example.com ' });

    assert.equal(config.port, 3000);
    assert.equal(config.rag.topK, 3);
    assert.equal(config.upload.maxBytes, 5 * 1024 * 1024);
    assert.deepEqual(config.auth.adminEmails, ['admin@example.com', 'other@example.com']);
    assert.deepEqual(config.corsOrigins, ['http://localhost:5173']);
  });

  it('reports every invalid variable at once', () => {
    assert.throws(
      () => loadConfig({ JWT_SECRET: 'short' }),
      (error: unknown) => {
        assert.ok(error instanceof ConfigError);
        const joined = error.issues.join('\n');
        assert.match(joined, /JWT_SECRET/);
        assert.match(joined, /GEMINI_API_KEY/);
        return true;
      },
    );
  });

  it('rejects an overlap that is not smaller than the chunk size', () => {
    assert.throws(
      () => loadConfig({ ...validEnv, RAG_CHUNK_SIZE: '200', RAG_CHUNK_OVERLAP: '200' }),
      /RAG_CHUNK_OVERLAP/,
    );
  });
});
