import type { LlmClient, TokenUsage } from '../../infrastructure/ai/ports';
import { resolveUsage } from '../../infrastructure/ai/cost-calculator';
import { PromptNames, type PromptRepository } from '../../infrastructure/prompts/prompt-repository';
import type { VectorIndex } from '../../infrastructure/vector/vector-index';
import { AiInvalidOutputError, NoDocumentsError, NotFoundError } from '../../shared/errors/app-error';
import type { Logger } from '../../shared/logger/logger';
import { sampleEvenly } from '../../shared/utils/text';
import type { AiUsageRecorder } from '../ai-usage/ai-usage.recorder';
import type { User } from '../auth/auth.types';
import type { DocumentRepository } from '../documents/document.repository';
import { parseQuizOutput, type QuizQuestion } from './quiz.output';

const MAX_ATTEMPTS = 2;
const MAX_CONTEXT_CHUNKS = 6;

export interface QuizServiceDeps {
  vectorIndex: VectorIndex;
  documents: DocumentRepository;
  llm: LlmClient;
  prompts: PromptRepository;
  usageRecorder: AiUsageRecorder;
  logger: Logger;
}

export interface GenerateQuizInput {
  questionCount: number;
  documentId?: number;
}

export class QuizService {
  private readonly deps: QuizServiceDeps;

  constructor(deps: QuizServiceDeps) {
    this.deps = deps;
  }

  async generate(user: User, input: GenerateQuizInput): Promise<QuizQuestion[]> {
    const { vectorIndex, documents, llm, prompts, usageRecorder, logger } = this.deps;

    if (input.documentId !== undefined && !documents.findById(user.id, input.documentId)) {
      throw new NotFoundError('tài liệu');
    }
    const chunks = vectorIndex.list(user.id, input.documentId === undefined ? {} : { documentId: input.documentId });
    if (chunks.length === 0) throw new NoDocumentsError();

    const context = sampleEvenly(chunks, MAX_CONTEXT_CHUNKS)
      .map((chunk, position) => `[Đoạn ${position + 1}] ${chunk.content}`)
      .join('\n\n');
    const prompt = prompts.render(PromptNames.quizGenerator, { count: String(input.questionCount), context });

    const startedAt = Date.now();
    const totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0 };
    let model: string | null = null;
    let lastError: unknown;

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const result = await llm.generate(prompt, { json: true, maxOutputTokens: 2048, temperature: 0.3 });
        const usage = resolveUsage(result.usage, prompt, result.text);
        totalUsage.promptTokens += usage.promptTokens;
        totalUsage.completionTokens += usage.completionTokens;
        model = result.model;

        try {
          const questions = parseQuizOutput(result.text, input.questionCount);
          usageRecorder.record({
            userId: user.id,
            endpoint: 'quiz.generate',
            prompt: `Tạo ${input.questionCount} câu trắc nghiệm`,
            latencyMs: Date.now() - startedAt,
            usage: totalUsage,
            status: 'SUCCESS',
            model,
          });
          return questions;
        } catch (error) {
          lastError = error;
          logger.warn('quiz output rejected by schema validation', { attempt, err: error });
        }
      }
      throw new AiInvalidOutputError('Không thể tạo bài trắc nghiệm hợp lệ. Vui lòng thử lại.', lastError);
    } catch (error) {
      usageRecorder.record({
        userId: user.id,
        endpoint: 'quiz.generate',
        prompt: `Tạo ${input.questionCount} câu trắc nghiệm`,
        latencyMs: Date.now() - startedAt,
        usage: totalUsage,
        status: 'ERROR',
        model,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
