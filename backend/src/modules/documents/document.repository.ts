import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database';
import { decodeEmbedding, encodeEmbedding } from '../../shared/math/vector';
import type { DocumentListQuery, DocumentRecord, NewChunk, PaginatedDocuments, StoredChunk } from './document.types';

interface DocumentRow {
  id: number;
  user_id: number;
  filename: string;
  size_bytes: number;
  chunks_count: number;
  created_at: string;
}

interface ChunkRow {
  id: number;
  user_id: number;
  document_id: number;
  filename: string;
  chunk_index: number;
  page_number: number | null;
  content: string;
  embedding: Uint8Array;
}

const toDocument = (row: DocumentRow): DocumentRecord => ({
  id: row.id,
  userId: row.user_id,
  filename: row.filename,
  sizeBytes: row.size_bytes,
  chunksCount: row.chunks_count,
  createdAt: row.created_at,
});

const toChunk = (row: ChunkRow): StoredChunk => ({
  id: row.id,
  userId: row.user_id,
  documentId: row.document_id,
  filename: row.filename,
  chunkIndex: row.chunk_index,
  pageNumber: row.page_number,
  content: row.content,
  embedding: decodeEmbedding(row.embedding),
});

export interface SaveDocumentInput {
  userId: number;
  filename: string;
  sizeBytes: number;
  chunks: NewChunk[];
}

export interface SaveDocumentResult {
  document: DocumentRecord;
  chunks: StoredChunk[];
  /** Id of an older upload with the same filename that was replaced, if any. */
  replacedDocumentId: number | null;
}

export class DocumentRepository {
  private readonly db: SqliteDatabase;

  constructor(db: SqliteDatabase) {
    this.db = db;
  }

  /** Atomically stores a document and its chunks, replacing a previous upload with the same filename. */
  save(input: SaveDocumentInput): SaveDocumentResult {
    return this.db.transaction(() => {
      const existing = this.db.get<{ id: number }>('SELECT id FROM documents WHERE user_id = ? AND filename = ?', [
        input.userId,
        input.filename,
      ]);
      if (existing) {
        this.db.run('DELETE FROM documents WHERE id = ?', [existing.id]); // chunks cascade
      }

      const inserted = this.db.run(
        'INSERT INTO documents (user_id, filename, size_bytes, chunks_count) VALUES (?, ?, ?, ?)',
        [input.userId, input.filename, input.sizeBytes, input.chunks.length],
      );
      const documentId = inserted.lastInsertRowid;

      const chunks: StoredChunk[] = input.chunks.map((chunk) => {
        const result = this.db.run(
          `INSERT INTO document_chunks (document_id, user_id, chunk_index, page_number, content, embedding)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [documentId, input.userId, chunk.chunkIndex, chunk.pageNumber, chunk.content, encodeEmbedding(chunk.embedding)],
        );
        return {
          id: result.lastInsertRowid,
          userId: input.userId,
          documentId,
          filename: input.filename,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          content: chunk.content,
          embedding: chunk.embedding,
        };
      });

      const row = this.db.get<DocumentRow>('SELECT * FROM documents WHERE id = ?', [documentId]);
      if (!row) throw new Error('Failed to read back saved document');

      return { document: toDocument(row), chunks, replacedDocumentId: existing?.id ?? null };
    });
  }

  list(query: DocumentListQuery): PaginatedDocuments {
    const search = query.search?.trim();
    const where = search ? `user_id = ? AND filename LIKE ? ESCAPE '\\'` : 'user_id = ?';
    const params: Array<string | number> = search
      ? [query.userId, `%${search.replace(/[\\%_]/g, '\\$&')}%`]
      : [query.userId];

    const total = this.db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM documents WHERE ${where}`, params)?.total ?? 0;
    const rows = this.db.all<DocumentRow>(
      `SELECT * FROM documents WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, query.limit, (query.page - 1) * query.limit],
    );

    return {
      items: rows.map(toDocument),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  findById(userId: number, documentId: number): DocumentRecord | undefined {
    const row = this.db.get<DocumentRow>('SELECT * FROM documents WHERE id = ? AND user_id = ?', [documentId, userId]);
    return row ? toDocument(row) : undefined;
  }

  /** Returns true when a row owned by `userId` was deleted. */
  delete(userId: number, documentId: number): boolean {
    return this.db.run('DELETE FROM documents WHERE id = ? AND user_id = ?', [documentId, userId]).changes > 0;
  }

  /** Loads every chunk (all users) so the in-memory vector index can be rebuilt at startup. */
  loadAllChunks(): StoredChunk[] {
    return this.db
      .all<ChunkRow>(
        `SELECT c.id, c.user_id, c.document_id, d.filename, c.chunk_index, c.page_number, c.content, c.embedding
           FROM document_chunks c
           JOIN documents d ON d.id = c.document_id
          ORDER BY c.id`,
      )
      .map(toChunk);
  }
}
