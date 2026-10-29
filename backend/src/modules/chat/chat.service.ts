import type { EmbeddingClient, LlmClient } from '../../infrastructure/ai/ports';
import { resolveUsage } from '../../infrastructure/ai/cost-calculator';
import { PromptNames, type PromptRepository } from '../../infrastructure/prompts/prompt-repository';
import type { VectorIndex } from '../../infrastructure/vector/vector-index';
import { AppError, NoDocumentsError, NotFoundError } from '../../shared/errors/app-error';
import type { Logger } from '../../shared/logger/logger';
import { truncate } from '../../shared/utils/text';
import type { AiUsageRecorder } from '../ai-usage/ai-usage.recorder';
import type { User } from '../auth/auth.types';
import type { ChatRepository } from './chat.repository';
import type { AskResult, ChatMessage, ChatSession, ChatSource, ChatStreamEvent, ChatTurn } from './chat.types';

export const DEFAULT_SESSION_TITLE = 'Cuộc trò chuyện mới';
export const REFUSAL_MESSAGE = 'Tôi không tìm thấy thông tin này trong tài liệu của bạn.';

const GENERIC_AI_ERROR = 'Hệ thống AI đang bận, vui lòng thử lại sau ít phút.';
const SNIPPET_LENGTH = 180;

export interface ChatServiceDeps {
  repository: ChatRepository;
  vectorIndex: VectorIndex;
  llm: LlmClient;
  embeddings: EmbeddingClient;
  prompts: PromptRepository;
  usageRecorder: AiUsageRecorder;
  logger: Logger;
  rag: { topK: number; minScore: number };
}

type PreparedContext =
  | { kind: 'refused' }
  | { kind: 'ready'; prompt: string; sources: ChatSource[] };

export class ChatService {
  private readonly deps: ChatServiceDeps;

  constructor(deps: ChatServiceDeps) {
    this.deps = deps;
  }

  // ---- Sessions -----------------------------------------------------------------------------

  listSessions(user: User): ChatSession[] {
    return this.deps.repository.listSessions(user.id);
  }

  createSession(user: User, title = DEFAULT_SESSION_TITLE): ChatSession {
    return this.deps.repository.createSession(user.id, title);
  }

  renameSession(user: User, sessionId: string, title: string): ChatSession {
    const session = this.requireSession(user, sessionId);
    this.deps.repository.renameSession(session.id, title);
    return { ...session, title };
  }

  deleteSession(user: User, sessionId: string): void {
    if (!this.deps.repository.deleteSession(user.id, sessionId)) throw new NotFoundError('cuộc trò chuyện');
  }

  listMessages(user: User, sessionId: string): ChatMessage[] {
    const session = this.requireSession(user, sessionId);
    return this.deps.repository.listMessages(session.id);
  }

  // ---- Answering ----------------------------------------------------------------------------

  /**
   * Validates the request and persists the user's message. Throws a regular AppError (=> JSON error
   * response) BEFORE any SSE header is sent. The returned `events` generator performs retrieval and
   * generation lazily and reports failures as `error` events.
   */
  async startTurn(user: User, input: { question: string; sessionId?: string }): Promise<ChatTurn> {
    const { repository, vectorIndex } = this.deps;
    if (vectorIndex.countForUser(user.id) === 0) throw new NoDocumentsError();

    const session = input.sessionId
      ? this.requireSession(user, input.sessionId)
      : repository.createSession(user.id, truncate(input.question, 60));

    if (session.title === DEFAULT_SESSION_TITLE) {
      repository.renameSession(session.id, truncate(input.question, 60));
    }
    repository.addMessage(session.id, 'user', input.question, []);

    return { sessionId: session.id, events: this.runTurn(user, session.id, input.question) };
  }

  /** Non-streaming variant (no persistence): used by the evaluation runner. */
  async ask(user: User, question: string): Promise<AskResult> {
    const startedAt = Date.now();
    const context = await this.prepareContext(user.id, question);

    if (context.kind === 'refused') {
      this.deps.usageRecorder.record({
        userId: user.id,
        endpoint: 'chat.evaluate',
        prompt: question,
        latencyMs: Date.now() - startedAt,
        usage: { promptTokens: 0, completionTokens: 0 },
        status: 'REFUSED',
      });
      return { answer: REFUSAL_MESSAGE, refused: true, sources: [] };
    }

    const result = await this.deps.llm.generate(context.prompt);
    this.deps.usageRecorder.record({
      userId: user.id,
      endpoint: 'chat.evaluate',
      prompt: question,
      latencyMs: Date.now() - startedAt,
      usage: resolveUsage(result.usage, context.prompt, result.text),
      status: 'SUCCESS',
      model: result.model,
    });
    return { answer: result.text, refused: false, sources: context.sources };
  }

  // ---- Internals ----------------------------------------------------------------------------

  private requireSession(user: User, sessionId: string): ChatSession {
    const session = this.deps.repository.findSession(user.id, sessionId);
    if (!session) throw new NotFoundError('cuộc trò chuyện');
    return session;
  }

  /** Retrieval + guardrail: refuses when nothing in the user's documents is similar enough. */
  private async prepareContext(userId: number, question: string): Promise<PreparedContext> {
    const { embeddings, vectorIndex, prompts, rag } = this.deps;

    const queryEmbedding = await embeddings.embed(question);
    const hits = vectorIndex.search(userId, queryEmbedding, rag.topK).filter((hit) => hit.score >= rag.minScore);
    if (hits.length === 0) return { kind: 'refused' };

    const sources: ChatSource[] = hits.map((hit, position) => ({
      index: position + 1,
      documentId: hit.documentId,
      filename: hit.filename,
      pageNumber: hit.pageNumber,
      score: Number(hit.score.toFixed(4)),
      snippet: truncate(hit.content, SNIPPET_LENGTH),
    }));

    const context = hits
      .map((hit, position) => {
        const page = hit.pageNumber ? `, trang ${hit.pageNumber}` : '';
        return `[${position + 1}] (${hit.filename}${page})\n${hit.content}`;
      })
      .join('\n\n');

    return { kind: 'ready', prompt: prompts.render(PromptNames.chatRag, { context, question }), sources };
  }

  private async *runTurn(user: User, sessionId: string, question: string): AsyncGenerator<ChatStreamEvent> {
    const { repository, llm, usageRecorder, logger } = this.deps;
    const startedAt = Date.now();
    let finished = false;

    try {
      const context = await this.prepareContext(user.id, question);

      if (context.kind === 'refused') {
        const message = repository.addMessage(sessionId, 'assistant', REFUSAL_MESSAGE, []);
        usageRecorder.record({
          userId: user.id,
          endpoint: 'chat.stream',
          prompt: question,
          latencyMs: Date.now() - startedAt,
          usage: { promptTokens: 0, completionTokens: 0 },
          status: 'REFUSED',
        });
        yield { type: 'sources', sources: [] };
        yield { type: 'chunk', text: REFUSAL_MESSAGE };
        finished = true;
        yield { type: 'done', messageId: message.id };
        return;
      }

      yield { type: 'sources', sources: context.sources };

      const handle = await llm.stream(context.prompt, { maxOutputTokens: 1024 });
      let answer = '';
      for await (const text of handle.chunks) {
        if (!text) continue;
        answer += text;
        yield { type: 'chunk', text };
      }
      const { usage, model } = await handle.result();

      const message = repository.addMessage(sessionId, 'assistant', answer, context.sources);
      usageRecorder.record({
        userId: user.id,
        endpoint: 'chat.stream',
        prompt: question,
        latencyMs: Date.now() - startedAt,
        usage: resolveUsage(usage, context.prompt, answer),
        status: 'SUCCESS',
        model,
      });
      finished = true;
      yield { type: 'done', messageId: message.id };
    } catch (error) {
      finished = true;
      logger.error('chat turn failed', { userId: user.id, sessionId, err: error });
      usageRecorder.record({
        userId: user.id,
        endpoint: 'chat.stream',
        prompt: question,
        latencyMs: Date.now() - startedAt,
        usage: { promptTokens: 0, completionTokens: 0 },
        status: 'ERROR',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      const appError = error instanceof AppError ? error : undefined;
      yield { type: 'error', code: appError?.code ?? 'AI_UNAVAILABLE', message: appError?.message ?? GENERIC_AI_ERROR };
    } finally {
      if (!finished) {
        // The consumer stopped reading (client disconnected) before the answer was complete.
        usageRecorder.record({
          userId: user.id,
          endpoint: 'chat.stream',
          prompt: question,
          latencyMs: Date.now() - startedAt,
          usage: { promptTokens: 0, completionTokens: 0 },
          status: 'ERROR',
          errorMessage: 'client disconnected before the answer completed',
        });
      }
    }
  }
}
