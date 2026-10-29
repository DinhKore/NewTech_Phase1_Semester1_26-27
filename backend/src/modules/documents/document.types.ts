export interface DocumentRecord {
  id: number;
  userId: number;
  filename: string;
  sizeBytes: number;
  chunksCount: number;
  createdAt: string;
}

export interface NewChunk {
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  embedding: Float32Array;
}

export interface StoredChunk {
  id: number;
  userId: number;
  documentId: number;
  filename: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  embedding: Float32Array;
}

export interface DocumentListQuery {
  userId: number;
  search?: string;
  page: number;
  limit: number;
}

export interface PaginatedDocuments {
  items: DocumentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
