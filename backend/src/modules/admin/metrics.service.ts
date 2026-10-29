import type {
  AiLogEntry,
  AiUsageRepository,
  EndpointMetrics,
  MetricsTotals,
} from '../ai-usage/ai-usage.repository';

export interface MetricsOverview {
  totals: MetricsTotals;
  byEndpoint: EndpointMetrics[];
  recent: AiLogEntry[];
}

export class MetricsService {
  private readonly repository: AiUsageRepository;

  constructor(repository: AiUsageRepository) {
    this.repository = repository;
  }

  overview(recentLimit: number): MetricsOverview {
    return {
      totals: this.repository.totals(),
      byEndpoint: this.repository.byEndpoint(),
      recent: this.repository.recent(recentLimit),
    };
  }
}
