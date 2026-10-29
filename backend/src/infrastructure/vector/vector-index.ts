import { dot, normalize } from '../../shared/math/vector';

export interface VectorRecord {
  id: number;
  userId: number;
  documentId: number;
  filename: string;
  pageNumber: number | null;
  content: string;
  embedding: ArrayLike<number>;
}

export type VectorMetadata = Omit<VectorRecord, 'embedding'>;

export interface ScoredRecord extends VectorMetadata {
  /** Cosine similarity in [-1, 1]; higher is closer. */
  score: number;
}

/**
 * Port: similarity search scoped per user. Every method takes a userId so that
 * data isolation is enforced by the type signature, not by caller discipline.
 */
export interface VectorIndex {
  addMany(records: readonly VectorRecord[]): void;
  removeDocument(userId: number, documentId: number): void;
  search(userId: number, queryEmbedding: ArrayLike<number>, limit: number): ScoredRecord[];
  list(userId: number, filter?: { documentId?: number }): VectorMetadata[];
  countForUser(userId: number): number;
}

interface Entry {
  metadata: VectorMetadata;
  unitVector: Float32Array;
}

/** Exact brute-force search over unit vectors held in RAM. Fine up to ~100k chunks. */
export class InMemoryVectorIndex implements VectorIndex {
  private readonly entriesByUser = new Map<number, Entry[]>();

  addMany(records: readonly VectorRecord[]): void {
    for (const record of records) {
      const { embedding, ...metadata } = record;
      const entries = this.entriesByUser.get(record.userId) ?? [];
      entries.push({ metadata, unitVector: normalize(embedding) });
      this.entriesByUser.set(record.userId, entries);
    }
  }

  removeDocument(userId: number, documentId: number): void {
    const entries = this.entriesByUser.get(userId);
    if (!entries) return;
    this.entriesByUser.set(
      userId,
      entries.filter((entry) => entry.metadata.documentId !== documentId),
    );
  }

  search(userId: number, queryEmbedding: ArrayLike<number>, limit: number): ScoredRecord[] {
    const entries = this.entriesByUser.get(userId) ?? [];
    if (entries.length === 0) return [];

    const query = normalize(queryEmbedding);
    return entries
      .map((entry) => ({ ...entry.metadata, score: dot(query, entry.unitVector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  list(userId: number, filter: { documentId?: number } = {}): VectorMetadata[] {
    const entries = this.entriesByUser.get(userId) ?? [];
    return entries
      .filter((entry) => filter.documentId === undefined || entry.metadata.documentId === filter.documentId)
      .map((entry) => entry.metadata);
  }

  countForUser(userId: number): number {
    return this.entriesByUser.get(userId)?.length ?? 0;
  }
}
