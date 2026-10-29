export type ChatRole = 'user' | 'assistant';

export interface ChatSource {
  /** 1-based citation number, matches [n] markers in the answer. */
  index: number;
  documentId: number;
  filename: string;
  pageNumber: number | null;
  /** Cosine similarity in [0, 1]. */
  score: number;
  snippet: string;
}

export interface ChatSession {
  id: string;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  sessionId: string;
  role: ChatRole;
  content: string;
  sources: ChatSource[];
  createdAt: string;
}

/** Events streamed to the client over SSE. */
export type ChatStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'chunk'; text: string }
  | { type: 'done'; messageId: number }
  | { type: 'error'; code: string; message: string };

export interface ChatTurn {
  sessionId: string;
  events: AsyncGenerator<ChatStreamEvent>;
}

export interface AskResult {
  answer: string;
  refused: boolean;
  sources: ChatSource[];
}
