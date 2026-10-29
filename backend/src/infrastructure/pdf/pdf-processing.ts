import pdfParse from 'pdf-parse';
import { ValidationError } from '../../shared/errors/app-error';

export interface PdfPage {
  pageNumber: number;
  text: string;
}

/** Port: turns PDF bytes into text pages. */
export interface PdfTextExtractor {
  extractPages(buffer: Buffer): Promise<PdfPage[]>;
}

/** Port: splits long text into overlapping chunks suitable for embedding. */
export interface TextChunker {
  split(text: string): Promise<string[]>;
}

export class SimplePdfTextExtractor implements PdfTextExtractor {
  async extractPages(buffer: Buffer): Promise<PdfPage[]> {
    try {
      const data = await pdfParse(buffer);
      // In pdf-parse, pages are often separated by form-feed \f or double newlines
      const rawPages = data.text.split(/\f/);
      if (rawPages.length > 1) {
        return rawPages
          .map((text, idx) => ({ pageNumber: idx + 1, text: text.trim() }))
          .filter((p) => p.text.length > 0);
      }
      return [{ pageNumber: 1, text: data.text.trim() }];
    } catch (error) {
      throw new ValidationError('Không đọc được nội dung file PDF (file hỏng hoặc bị mã hóa).', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/** Pure TypeScript recursive character text splitter. */
export class RecursiveTextChunker implements TextChunker {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private readonly separators: string[];

  constructor(chunkSize: number, chunkOverlap: number, separators = ['\n\n', '\n', '. ', ' ', '']) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.separators = separators;
  }

  async split(text: string): Promise<string[]> {
    return this.splitText(text, this.separators);
  }

  private splitText(text: string, separators: string[]): string[] {
    const finalChunks: string[] = [];
    let separator = separators[separators.length - 1];

    for (let i = 0; i < separators.length; i++) {
      const s = separators[i];
      if (s === '' || text.includes(s)) {
        separator = s;
        break;
      }
    }

    const splits = separator ? text.split(separator) : Array.from(text);
    const currentDoc: string[] = [];
    let total = 0;

    for (const piece of splits) {
      const pieceLen = piece.length + (currentDoc.length > 0 ? separator.length : 0);
      if (total + pieceLen > this.chunkSize) {
        if (total > 0) {
          const doc = currentDoc.join(separator);
          if (doc.trim()) finalChunks.push(doc.trim());
          // Slide forward keeping overlap
          while (total > this.chunkOverlap || (total + pieceLen > this.chunkSize && total > 0)) {
            const removed = currentDoc.shift();
            if (!removed) break;
            total -= removed.length + (currentDoc.length > 0 ? separator.length : 0);
          }
        }
      }
      currentDoc.push(piece);
      total += pieceLen;
    }

    if (currentDoc.length > 0) {
      const doc = currentDoc.join(separator);
      if (doc.trim()) finalChunks.push(doc.trim());
    }

    return finalChunks;
  }
}
