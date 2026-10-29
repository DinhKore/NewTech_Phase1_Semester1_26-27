import { httpClient } from '../../shared/api/http-client';
import type { MetricsOverview } from './admin.types';

export const adminApi = {
  fetchMetrics(limit = 50): Promise<MetricsOverview> {
    return httpClient.request<MetricsOverview>('/api/admin/metrics', {
      method: 'GET',
      query: { limit },
    });
  },
};
