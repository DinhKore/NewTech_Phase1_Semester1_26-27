import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { REFUSAL_MESSAGE } from '../../src/modules/chat/chat.service';
import { AiUnavailableError } from '../../src/shared/errors/app-error';
import { ADMIN_EMAIL, parseSse, startTestServer, type TestServer } from '../helpers/test-server';

const PHOTOSYNTHESIS = 'Photosynthesis converts light energy into chemical energy in plants. Chlorophyll absorbs light energy.';
const RELATED_QUESTION = 'How does photosynthesis convert light energy into chemical energy?';
const UNRELATED_QUESTION = 'zebra quantum volcano parliament';

describe('API integration', () => {
  let server: TestServer;
  let alice: string;
  let bob: string;
  let admin: string;

  before(async () => {
    server = await startTestServer();
    alice = await server.login('alice@test.dev');
    bob = await server.login('bob@test.dev');
    admin = await server.login(ADMIN_EMAIL);
  });

  after(async () => {
    await server.close();
  });

  describe('authentication', () => {
    it('rejects requests without a token and with a malformed token', async () => {
      assert.equal((await server.request('/api/documents')).status, 401);
      assert.equal((await server.request('/api/documents', { token: 'not-a-jwt' })).status, 401);
    });

    it('rejects an invalid Google credential', async () => {
      const response = await server.request('/api/auth/google', {
        method: 'POST',
        json: { credential: 'this-is-not-a-google-token' },
      });
      assert.equal(response.status, 401);
      assert.equal(response.body.error.code, 'UNAUTHORIZED');
    });

    it('validates the login body', async () => {
      const response = await server.request('/api/auth/google', { method: 'POST', json: {} });
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    });

    it('assigns roles from ADMIN_EMAILS and serves /me', async () => {
      const me = await server.request('/api/auth/me', { token: alice });
      assert.equal(me.status, 200);
      assert.equal(me.body.user.role, 'user');

      const adminMe = await server.request('/api/auth/me', { token: admin });
      assert.equal(adminMe.body.user.role, 'admin');
    });

    it('returns a request id header and a consistent error shape', async () => {
      const response = await server.request('/api/does-not-exist');
      assert.equal(response.status, 404);
      assert.equal(response.body.error.code, 'NOT_FOUND');
      assert.equal(response.body.error.requestId, response.headers.get('x-request-id'));
    });
  });

  describe('documents and data isolation', () => {
    let aliceDocumentId: number;

    it('requires a real PDF', async () => {
      const wrongType = new FormData();
      wrongType.append('document', new Blob(['hello'], { type: 'text/plain' }), 'notes.txt');
      assert.equal((await server.request('/api/documents', { method: 'POST', token: alice, form: wrongType })).status, 400);

      const fakePdf = new FormData();
      fakePdf.append('document', new Blob(['not really a pdf'], { type: 'application/pdf' }), 'fake.pdf');
      const response = await server.request('/api/documents', { method: 'POST', token: alice, form: fakePdf });
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    });

    it('uploads, lists and searches only the caller\'s documents', async () => {
      const upload = await server.uploadPdf(alice, 'Bài giảng quang hợp.pdf', PHOTOSYNTHESIS);
      assert.equal(upload.status, 201);
      assert.equal(upload.body.document.filename, 'Bài giảng quang hợp.pdf');
      assert.ok(upload.body.document.chunksCount >= 1);
      aliceDocumentId = upload.body.document.id;

      const aliceList = await server.request('/api/documents?search=quang', { token: alice });
      assert.equal(aliceList.body.items.length, 1);
      assert.equal(aliceList.body.pagination.total, 1);

      const bobList = await server.request('/api/documents', { token: bob });
      assert.equal(bobList.body.items.length, 0);
    });

    it("hides Alice's data from Bob in chat, quiz, sessions and deletion", async () => {
      const chat = await server.request('/api/chat/stream', { method: 'POST', token: bob, json: { question: RELATED_QUESTION } });
      assert.equal(chat.status, 400);
      assert.equal(chat.body.error.code, 'NO_DOCUMENTS');

      const quiz = await server.request('/api/quiz', { method: 'POST', token: bob, json: {} });
      assert.equal(quiz.status, 400);

      const stolenDelete = await server.request(`/api/documents/${aliceDocumentId}`, { method: 'DELETE', token: bob });
      assert.equal(stolenDelete.status, 404);

      const stolenQuiz = await server.request('/api/quiz', { method: 'POST', token: bob, json: { documentId: aliceDocumentId } });
      assert.equal(stolenQuiz.status, 404);
    });

    it('deletes a document and removes it from retrieval', async () => {
      const upload = await server.uploadPdf(bob, 'temp.pdf', 'temporary content about volcanoes and lava');
      const id = upload.body.document.id as number;
      assert.equal(server.container.vectorIndex.countForUser(upload.body.document.userId), upload.body.document.chunksCount);

      assert.equal((await server.request(`/api/documents/${id}`, { method: 'DELETE', token: bob })).status, 204);
      assert.equal((await server.request(`/api/documents/${id}`, { method: 'DELETE', token: bob })).status, 404);
      assert.equal(server.container.vectorIndex.countForUser(upload.body.document.userId), 0);
    });
  });

  describe('chat (RAG + SSE)', () => {
    it('streams session, sources, chunks and done, then persists the conversation', async () => {
      const response = await server.request('/api/chat/stream', {
        method: 'POST',
        token: alice,
        json: { question: RELATED_QUESTION },
      });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);

      const events = parseSse(response.text);
      assert.deepEqual(
        events.map((event) => event.type).filter((type, index, all) => all.indexOf(type) === index),
        ['session', 'sources', 'chunk', 'done'],
      );
      const sources = events.find((event) => event.type === 'sources')?.sources as Array<{ filename: string; score: number }>;
      assert.equal(sources[0]?.filename, 'Bài giảng quang hợp.pdf');
      assert.ok((sources[0]?.score ?? 0) >= 0.3);

      const sessionId = events[0]?.sessionId as string;
      const messages = await server.request(`/api/chat/sessions/${sessionId}/messages`, { token: alice });
      assert.deepEqual(
        messages.body.messages.map((message: { role: string }) => message.role),
        ['user', 'assistant'],
      );
      assert.equal(messages.body.messages[1].content, 'Câu trả lời mẫu từ tài liệu [1].');

      // Another user can neither read nor delete this session.
      assert.equal((await server.request(`/api/chat/sessions/${sessionId}/messages`, { token: bob })).status, 404);
      assert.equal((await server.request(`/api/chat/sessions/${sessionId}`, { method: 'DELETE', token: bob })).status, 404);
      assert.equal((await server.request('/api/chat/sessions', { token: bob })).body.sessions.length, 0);
    });

    it('refuses questions unrelated to the documents without calling the LLM', async () => {
      const callsBefore = server.llm.prompts.length;
      const response = await server.request('/api/chat/stream', {
        method: 'POST',
        token: alice,
        json: { question: UNRELATED_QUESTION },
      });
      const events = parseSse(response.text);

      assert.equal(events.find((event) => event.type === 'sources')?.sources.length, 0);
      assert.equal(events.find((event) => event.type === 'chunk')?.text, REFUSAL_MESSAGE);
      assert.equal(server.llm.prompts.length, callsBefore);
    });

    it('rejects empty or meaningless questions before opening the stream', async () => {
      for (const question of ['', '   ', '...']) {
        const response = await server.request('/api/chat/stream', { method: 'POST', token: alice, json: { question } });
        assert.equal(response.status, 400, `question ${JSON.stringify(question)}`);
        assert.equal(response.body.error.code, 'VALIDATION_ERROR');
      }
    });

    it('reports AI failures as an SSE error event (graceful fallback)', async () => {
      server.llm.failNext = new AiUnavailableError();
      const response = await server.request('/api/chat/stream', {
        method: 'POST',
        token: alice,
        json: { question: RELATED_QUESTION },
      });
      const error = parseSse(response.text).find((event) => event.type === 'error');
      assert.equal(error?.code, 'AI_UNAVAILABLE');
    });
  });

  describe('quiz (structured output)', () => {
    it('returns validated questions', async () => {
      const response = await server.request('/api/quiz', { method: 'POST', token: alice, json: { questionCount: 3 } });
      assert.equal(response.status, 200);
      assert.equal(response.body.questions.length, 3);
      assert.deepEqual(
        response.body.questions[0].options.map((option: { key: string }) => option.key),
        ['A', 'B', 'C', 'D'],
      );
    });

    it('retries once when the model breaks the schema, then recovers', async () => {
      server.llm.jsonResponses = ['{"questions": "nope"}'];
      const response = await server.request('/api/quiz', { method: 'POST', token: alice, json: {} });
      assert.equal(response.status, 200);
    });

    it('fails with 502 when the model keeps returning invalid JSON', async () => {
      server.llm.jsonResponses = ['garbage', 'still garbage'];
      const response = await server.request('/api/quiz', { method: 'POST', token: alice, json: {} });
      assert.equal(response.status, 502);
      assert.equal(response.body.error.code, 'AI_INVALID_OUTPUT');
    });

    it('validates the request body', async () => {
      const response = await server.request('/api/quiz', { method: 'POST', token: alice, json: { questionCount: 99 } });
      assert.equal(response.status, 400);
    });
  });

  describe('admin metrics (RBAC)', () => {
    it('forbids normal users and anonymous callers', async () => {
      assert.equal((await server.request('/api/admin/metrics')).status, 401);
      assert.equal((await server.request('/api/admin/metrics', { token: alice })).status, 403);
    });

    it('returns aggregated AI usage for admins', async () => {
      const response = await server.request('/api/admin/metrics', { token: admin });
      assert.equal(response.status, 200);

      const { totals, byEndpoint, recent } = response.body;
      assert.ok(totals.requests >= 4);
      assert.ok(totals.errors >= 1, 'failed AI calls are logged');
      assert.ok(totals.refused >= 1, 'refusals are logged');
      assert.ok(totals.totalTokens > 0);
      assert.ok(totals.totalCostUsd > 0);
      assert.ok(byEndpoint.some((row: { endpoint: string }) => row.endpoint === 'chat.stream'));
      assert.equal(recent[0].userEmail, 'alice@test.dev');
    });
  });
});

describe('persistence across restarts', () => {
  it('restores the vector index from SQLite so retrieval still works', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'course-assistant-'));
    const databasePath = path.join(directory, 'test.db');

    const first = await startTestServer({ DATABASE_PATH: databasePath });
    try {
      const token = await first.login('carol@test.dev');
      assert.equal((await first.uploadPdf(token, 'persist.pdf', PHOTOSYNTHESIS)).status, 201);
    } finally {
      await first.close();
    }

    const second = await startTestServer({ DATABASE_PATH: databasePath });
    try {
      const token = await second.login('carol@test.dev');
      const response = await second.request('/api/chat/stream', {
        method: 'POST',
        token,
        json: { question: RELATED_QUESTION },
      });
      const sources = parseSse(response.text).find((event) => event.type === 'sources')?.sources as unknown[];
      assert.ok(sources.length >= 1);
    } finally {
      await second.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
