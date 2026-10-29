export interface DocumentItem {
  id: number;
  userId: number;
  filename: string;
  sizeBytes: number;
  chunksCount: number;
  createdAt: string;
}

export interface DocumentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDocumentsResponse {
  items: DocumentItem[];
  pagination: DocumentPagination;
}
