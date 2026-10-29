import type { EmbeddingClient } from '../../infrastructure/ai/ports';
import type { PdfTextExtractor, TextChunker } from '../../infrastructure/pdf/pdf-processing';
import type { VectorIndex } from '../../infrastructure/vector/vector-index';
import { NotFoundError, ValidationError } from '../../shared/errors/app-error';
import type { Logger } from '../../shared/logger/logger';
import { mapWithConcurrency } from '../../shared/utils/concurrency';
import { normalizeUploadedFilename } from '../../shared/utils/text';
import type { User } from '../auth/auth.types';
import type { DocumentRepository } from './document.repository';
import type { DocumentListQuery, DocumentRecord, NewChunk, PaginatedDocuments } from './document.types';

const EMBEDDING_CONCURRENCY = 4;
const PDF_SIGNATURE = '%PDF-';

export interface DocumentServiceDeps {
  repository: DocumentRepository;
  vectorIndex: VectorIndex;
  pdfExtractor: PdfTextExtractor;
  chunker: TextChunker;
  embeddings: EmbeddingClient;
  logger: Logger;
}

export interface UploadedFile {
  originalName: string;
  buffer: Buffer;
}

export class DocumentService {
  private readonly deps: DocumentServiceDeps;

  constructor(deps: DocumentServiceDeps) {
    this.deps = deps;
  }

  /** Pipeline: validate -> extract text -> chunk -> embed -> persist (SQLite) -> index (RAM). */
  async upload(user: User, file: UploadedFile): Promise<DocumentRecord> {
    const { repository, vectorIndex, pdfExtractor, chunker, embeddings, logger } = this.deps;

    if (file.buffer.subarray(0, PDF_SIGNATURE.length).toString('latin1') !== PDF_SIGNATURE) {
      throw new ValidationError('File tải lên không phải là PDF hợp lệ.');
    }
    const filename = normalizeUploadedFilename(file.originalName);

    const pages = await pdfExtractor.extractPages(file.buffer);
    const pieces: Array<{ pageNumber: number; content: string }> = [];
    for (const page of pages) {
      if (page.text.trim().length === 0) continue;
      for (const content of await chunker.split(page.text)) {
        if (content.trim().length > 0) pieces.push({ pageNumber: page.pageNumber, content });
      }
    }
    if (pieces.length === 0) {
      throw new ValidationError('PDF không chứa văn bản có thể đọc (có thể là file scan dạng ảnh).');
    }

    const vectors = await mapWithConcurrency(pieces, EMBEDDING_CONCURRENCY, (piece) => embeddings.embed(piece.content));
    const chunks: NewChunk[] = pieces.map((piece, index) => ({
      chunkIndex: index,
      pageNumber: piece.pageNumber,
      content: piece.content,
      embedding: Float32Array.from(vectors[index] as number[]),
    }));

    const saved = repository.save({ userId: user.id, filename, sizeBytes: file.buffer.length, chunks });
    if (saved.replacedDocumentId !== null) vectorIndex.removeDocument(user.id, saved.replacedDocumentId);
    vectorIndex.addMany(saved.chunks);

    logger.info('document indexed', {
      userId: user.id,
      documentId: saved.document.id,
      chunks: saved.chunks.length,
      replaced: saved.replacedDocumentId !== null,
    });
    return saved.document;
  }

  list(query: DocumentListQuery): PaginatedDocuments {
    return this.deps.repository.list(query);
  }

  delete(user: User, documentId: number): void {
    const deleted = this.deps.repository.delete(user.id, documentId);
    if (!deleted) throw new NotFoundError('tài liệu');
    this.deps.vectorIndex.removeDocument(user.id, documentId);
    this.deps.logger.info('document deleted', { userId: user.id, documentId });
  }
}
