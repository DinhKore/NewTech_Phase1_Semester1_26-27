import type { CostCalculator } from '../../infrastructure/ai/cost-calculator';
import type { TokenUsage } from '../../infrastructure/ai/ports';
import type { Logger } from '../../shared/logger/logger';
import { truncate } from '../../shared/utils/text';
import type { AiLogStatus, AiUsageRepository } from './ai-usage.repository';

export interface AiUsageRecord {
  userId: number | null;
  /** Logical operation, e.g. "chat.stream", "quiz.generate". */
  endpoint: string;
  prompt: string;
  latencyMs: number;
  usage: TokenUsage;
  status: AiLogStatus;
  model?: string | null;
  errorMessage?: string | null;
}

/** Writes one observability row per AI call. Never throws: logging must not break user requests. */
export class AiUsageRecorder {
  private readonly repository: AiUsageRepository;
  private readonly costCalculator: CostCalculator;
  private readonly logger: Logger;

  constructor(repository: AiUsageRepository, costCalculator: CostCalculator, logger: Logger) {
    this.repository = repository;
    this.costCalculator = costCalculator;
    this.logger = logger;
  }

  record(entry: AiUsageRecord): void {
    try {
      this.repository.insert({
        userId: entry.userId,
        endpoint: entry.endpoint,
        promptSnippet: truncate(entry.prompt, 200),
        latencyMs: entry.latencyMs,
        promptTokens: entry.usage.promptTokens,
        completionTokens: entry.usage.completionTokens,
        costUsd: this.costCalculator.estimateUsd(entry.usage),
        status: entry.status,
        model: entry.model ?? null,
        errorMessage: entry.errorMessage ? truncate(entry.errorMessage, 300) : null,
      });
    } catch (error) {
      this.logger.error('failed to record AI usage', { err: error });
    }
  }
}
