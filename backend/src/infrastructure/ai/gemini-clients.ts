import {
  type GenerateContentRequest,
  type GenerativeModel,
  type GoogleGenerativeAI,
} from '@google/generative-ai';
import { AiUnavailableError } from '../../shared/errors/app-error';
import type { Logger } from '../../shared/logger/logger';
import { withRetry } from '../../shared/utils/retry';
import type {
  EmbeddingClient,
  GenerationOptions,
  GenerationResult,
  LlmClient,
  StreamHandle,
  TokenUsage,
} from './ports';

interface UsageMetadataLike {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
}

/** 429 / 5xx / network failures are worth retrying; 4xx client errors are not. */
export function isTransientAiError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === 'number') return status === 429 || status >= 500;
  const message = error instanceof Error ? error.message : '';
  return /\b(429|500|502|503|504)\b|fetch failed|ECONNRESET|ETIMEDOUT|overloaded/i.test(message);
}

function toUsage(metadata: UsageMetadataLike | undefined): TokenUsage {
  return {
    promptTokens: metadata?.promptTokenCount ?? 0,
    completionTokens: metadata?.candidatesTokenCount ?? 0,
  };
}

export interface GeminiLlmOptions {
  primaryModel: string;
  fallbackModel: string;
}

/** Gemini implementation of {@link LlmClient}: retries transient errors, then falls back to a second model. */
export class GeminiLlmClient implements LlmClient {
  private readonly genAI: GoogleGenerativeAI;
  private readonly options: GeminiLlmOptions;
  private readonly logger: Logger;
  private readonly models = new Map<string, GenerativeModel>();

  constructor(genAI: GoogleGenerativeAI, options: GeminiLlmOptions, logger: Logger) {
    this.genAI = genAI;
    this.options = options;
    this.logger = logger;
  }

  async generate(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    const request = this.buildRequest(prompt, options);
    return this.runWithFallback(async (model, modelName) => {
      const { response } = await model.generateContent(request);
      return { text: response.text(), usage: toUsage(response.usageMetadata), model: modelName };
    });
  }

  async stream(prompt: string, options: GenerationOptions = {}): Promise<StreamHandle> {
    const request = this.buildRequest(prompt, options);
    return this.runWithFallback(async (model, modelName) => {
      const streaming = await model.generateContentStream(request);

      async function* iterate(): AsyncGenerator<string> {
        for await (const chunk of streaming.stream) {
          yield chunk.text();
        }
      }

      return {
        chunks: iterate(),
        result: async () => {
          const response = await streaming.response;
          return { usage: toUsage(response.usageMetadata), model: modelName };
        },
      };
    });
  }

  private buildRequest(prompt: string, options: GenerationOptions): GenerateContentRequest {
    return {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: options.maxOutputTokens ?? 1024,
        temperature: options.temperature ?? 0.1,
        ...(options.json ? { responseMimeType: 'application/json' } : {}),
      },
    };
  }

  private getModel(name: string): GenerativeModel {
    let model = this.models.get(name);
    if (!model) {
      model = this.genAI.getGenerativeModel({ model: name });
      this.models.set(name, model);
    }
    return model;
  }

  private async runWithFallback<T>(operation: (model: GenerativeModel, modelName: string) => Promise<T>): Promise<T> {
    const candidates = [...new Set([this.options.primaryModel, this.options.fallbackModel])];
    let lastError: unknown;

    for (const modelName of candidates) {
      try {
        return await withRetry(() => operation(this.getModel(modelName), modelName), {
          attempts: 3,
          baseDelayMs: 1000,
          shouldRetry: isTransientAiError,
          onRetry: (error, attempt, delayMs) =>
            this.logger.warn('gemini call failed, retrying', { model: modelName, attempt, delayMs, err: error }),
        });
      } catch (error) {
        lastError = error;
        this.logger.warn('gemini model failed', { model: modelName, err: error });
      }
    }

    throw new AiUnavailableError(lastError);
  }
}

/** Gemini implementation of {@link EmbeddingClient}. */
export class GeminiEmbeddingClient implements EmbeddingClient {
  private readonly model: GenerativeModel;
  private readonly logger: Logger;

  constructor(genAI: GoogleGenerativeAI, modelName: string, logger: Logger) {
    this.model = genAI.getGenerativeModel({ model: modelName });
    this.logger = logger;
  }

  async embed(text: string): Promise<number[]> {
    try {
      return await withRetry(
        async () => {
          const result = await this.model.embedContent(text);
          return result.embedding.values;
        },
        {
          attempts: 3,
          baseDelayMs: 500,
          shouldRetry: isTransientAiError,
          onRetry: (error, attempt, delayMs) =>
            this.logger.warn('gemini embedding failed, retrying', { attempt, delayMs, err: error }),
        },
      );
    } catch (error) {
      throw new AiUnavailableError(error);
    }
  }
}
