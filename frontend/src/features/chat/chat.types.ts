export type ChatRole = 'user' | 'assistant';

export interface ChatSource {
  index: number;
  documentId: number;
  filename: string;
  pageNumber: number | null;
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

export type ChatStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'chunk'; text: string }
  | { type: 'done'; messageId: number }
  | { type: 'error'; code: string; message: string };
