import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database';

export type AiLogStatus = 'SUCCESS' | 'REFUSED' | 'ERROR';

export interface NewAiLog {
  userId: number | null;
  endpoint: string;
  promptSnippet: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  status: AiLogStatus;
  model: string | null;
  errorMessage: string | null;
}

export interface AiLogEntry extends NewAiLog {
  id: number;
  userEmail: string | null;
  createdAt: string;
}

export interface MetricsTotals {
  requests: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  totalTokens: number;
  refused: number;
  errors: number;
}

export interface EndpointMetrics {
  endpoint: string;
  requests: number;
  avgLatencyMs: number;
  totalCostUsd: number;
}

interface LogRow {
  id: number;
  user_id: number | null;
  user_email: string | null;
  endpoint: string;
  prompt_snippet: string;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  status: AiLogStatus;
  model: string | null;
  error_message: string | null;
  created_at: string;
}

export class AiUsageRepository {
  private readonly db: SqliteDatabase;

  constructor(db: SqliteDatabase) {
    this.db = db;
  }

  insert(log: NewAiLog): void {
    this.db.run(
      `INSERT INTO ai_logs
         (user_id, endpoint, prompt_snippet, latency_ms, prompt_tokens, completion_tokens, cost_usd, status, model, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.userId,
        log.endpoint,
        log.promptSnippet,
        log.latencyMs,
        log.promptTokens,
        log.completionTokens,
        log.costUsd,
        log.status,
        log.model,
        log.errorMessage,
      ],
    );
  }

  totals(): MetricsTotals {
    const row = this.db.get<{
      requests: number;
      avg_latency: number;
      cost: number;
      tokens: number;
      refused: number;
      errors: number;
    }>(
      `SELECT COUNT(*)                                   AS requests,
              COALESCE(AVG(latency_ms), 0)               AS avg_latency,
              COALESCE(SUM(cost_usd), 0)                 AS cost,
              COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS tokens,
              COALESCE(SUM(status = 'REFUSED'), 0)       AS refused,
              COALESCE(SUM(status = 'ERROR'), 0)         AS errors
         FROM ai_logs`,
    );
    return {
      requests: row?.requests ?? 0,
      avgLatencyMs: Math.round(row?.avg_latency ?? 0),
      totalCostUsd: Number((row?.cost ?? 0).toFixed(6)),
      totalTokens: row?.tokens ?? 0,
      refused: row?.refused ?? 0,
      errors: row?.errors ?? 0,
    };
  }

  byEndpoint(): EndpointMetrics[] {
    return this.db
      .all<{ endpoint: string; requests: number; avg_latency: number; cost: number }>(
        `SELECT endpoint,
                COUNT(*)                     AS requests,
                COALESCE(AVG(latency_ms), 0) AS avg_latency,
                COALESCE(SUM(cost_usd), 0)   AS cost
           FROM ai_logs
          GROUP BY endpoint
          ORDER BY requests DESC`,
      )
      .map((row) => ({
        endpoint: row.endpoint,
        requests: row.requests,
        avgLatencyMs: Math.round(row.avg_latency),
        totalCostUsd: Number(row.cost.toFixed(6)),
      }));
  }

  recent(limit: number): AiLogEntry[] {
    return this.db
      .all<LogRow>(
        `SELECT l.*, u.email AS user_email
           FROM ai_logs l
           LEFT JOIN users u ON u.id = l.user_id
          ORDER BY l.id DESC
          LIMIT ?`,
        [limit],
      )
      .map((row) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        endpoint: row.endpoint,
        promptSnippet: row.prompt_snippet,
        latencyMs: row.latency_ms,
        promptTokens: row.prompt_tokens,
        completionTokens: row.completion_tokens,
        costUsd: row.cost_usd,
        status: row.status,
        model: row.model,
        errorMessage: row.error_message,
        createdAt: row.created_at,
      }));
  }
}
