import { httpClient } from '../../shared/api/http-client';
import type { DocumentItem, PaginatedDocumentsResponse } from './documents.types';

export const documentsApi = {
  list(params: { search?: string; page?: number; limit?: number } = {}): Promise<PaginatedDocumentsResponse> {
    return httpClient.request<PaginatedDocumentsResponse>('/api/documents', {
      method: 'GET',
      query: {
        search: params.search,
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
    });
  },

  upload(file: File): Promise<{ document: DocumentItem }> {
    const formData = new FormData();
    formData.append('document', file);
    return httpClient.request<{ document: DocumentItem }>('/api/documents', {
      method: 'POST',
      formData,
    });
  },

  delete(id: number): Promise<void> {
    return httpClient.request<void>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  },
};
