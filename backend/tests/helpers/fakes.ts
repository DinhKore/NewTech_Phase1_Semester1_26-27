import type {
  EmbeddingClient,
  GenerationOptions,
  GenerationResult,
  LlmClient,
  StreamHandle,
} from '../../src/infrastructure/ai/ports';
import type { PdfPage, PdfTextExtractor } from '../../src/infrastructure/pdf/pdf-processing';
import type { GoogleProfile } from '../../src/modules/auth/auth.types';
import type { GoogleIdentityVerifier } from '../../src/modules/auth/google-identity-verifier';
import { UnauthorizedError } from '../../src/shared/errors/app-error';

const DIMENSIONS = 512;

function hashWord(word: string): number {
  let hash = 7;
  for (const char of word) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/** Deterministic bag-of-words embedding: texts sharing words get a high cosine similarity. */
export class FakeEmbeddingClient implements EmbeddingClient {
  async embed(text: string): Promise<number[]> {
    const vector = new Array<number>(DIMENSIONS).fill(0);
    for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
      const bucket = hashWord(word) % DIMENSIONS;
      vector[bucket] = (vector[bucket] as number) + 1;
    }
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

export const VALID_QUIZ_JSON = JSON.stringify({
  questions: [1, 2, 3].map((n) => ({
    question: `Câu hỏi số ${n} về quang hợp là gì?`,
    options: ['A. Đáp án một', 'Đáp án hai', 'Đáp án ba', 'Đáp án bốn'],
    answer: 'A',
    explanation: `Giải thích câu ${n}`,
  })),
});

export class FakeLlmClient implements LlmClient {
  /** Responses returned (in order) for JSON-mode calls; falls back to a valid quiz. */
  jsonResponses: string[] = [];
  /** If set, the next call rejects with this error (then resets). */
  failNext: Error | null = null;
  readonly prompts: string[] = [];

  async generate(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    this.prompts.push(prompt);
    this.throwIfFailing();
    const text = options.json ? (this.jsonResponses.shift() ?? VALID_QUIZ_JSON) : 'Câu trả lời mẫu từ tài liệu [1].';
    return { text, usage: { promptTokens: 100, completionTokens: 20 }, model: 'fake-model' };
  }

  async stream(prompt: string): Promise<StreamHandle> {
    this.prompts.push(prompt);
    this.throwIfFailing();
    async function* chunks(): AsyncGenerator<string> {
      yield 'Câu trả lời ';
      yield 'mẫu từ tài liệu [1].';
    }
    return {
      chunks: chunks(),
      result: async () => ({ usage: { promptTokens: 120, completionTokens: 30 }, model: 'fake-model' }),
    };
  }

  private throwIfFailing(): void {
    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      throw error;
    }
  }
}

export const FAKE_CREDENTIAL_PREFIX = 'fake-google-token|';

export function fakeCredential(email: string): string {
  return `${FAKE_CREDENTIAL_PREFIX}${email}`;
}

export class FakeGoogleVerifier implements GoogleIdentityVerifier {
  async verify(idToken: string): Promise<GoogleProfile> {
    if (!idToken.startsWith(FAKE_CREDENTIAL_PREFIX)) {
      throw new UnauthorizedError('Thông tin đăng nhập Google không hợp lệ hoặc đã hết hạn.');
    }
    const email = idToken.slice(FAKE_CREDENTIAL_PREFIX.length);
    return { sub: `sub-${email}`, email, name: email.split('@')[0] ?? email, avatarUrl: null };
  }
}

/** Treats the "PDF" bytes as UTF-8 text; pages are separated by form-feed characters. */
export class FakePdfExtractor implements PdfTextExtractor {
  async extractPages(buffer: Buffer): Promise<PdfPage[]> {
    const text = buffer.toString('utf8').replace(/^%PDF-\S*\s*/, '');
    return text.split('\f').map((pageText, index) => ({ pageNumber: index + 1, text: pageText }));
  }
}
