import { httpClient } from '../../shared/api/http-client';
import { readSseEvents } from '../../shared/api/sse';
import type { ChatMessage, ChatSession, ChatStreamEvent } from './chat.types';

export const chatApi = {
  async listSessions(): Promise<ChatSession[]> {
    const res = await httpClient.request<{ sessions: ChatSession[] }>('/api/chat/sessions');
    return res.sessions;
  },

  async createSession(title?: string): Promise<ChatSession> {
    const res = await httpClient.request<{ session: ChatSession }>('/api/chat/sessions', {
      method: 'POST',
      json: { title },
    });
    return res.session;
  },

  async renameSession(id: string, title: string): Promise<ChatSession> {
    const res = await httpClient.request<{ session: ChatSession }>(`/api/chat/sessions/${id}`, {
      method: 'PATCH',
      json: { title },
    });
    return res.session;
  },

  async deleteSession(id: string): Promise<void> {
    return httpClient.request<void>(`/api/chat/sessions/${id}`, {
      method: 'DELETE',
    });
  },

  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    const res = await httpClient.request<{ messages: ChatMessage[] }>(`/api/chat/sessions/${sessionId}/messages`);
    return res.messages;
  },

  async *streamMessage(
    question: string,
    sessionId?: string,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    const response = await httpClient.stream('/api/chat/stream', {
      method: 'POST',
      json: { question, sessionId },
      signal,
    });
    yield* readSseEvents<ChatStreamEvent>(response);
  },
};
