export type AiLogStatus = 'SUCCESS' | 'REFUSED' | 'ERROR';

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

export interface AiLogEntry {
  id: number;
  userId: number | null;
  userEmail: string | null;
  endpoint: string;
  promptSnippet: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  status: AiLogStatus;
  model: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface MetricsOverview {
  totals: MetricsTotals;
  byEndpoint: EndpointMetrics[];
  recent: AiLogEntry[];
}
