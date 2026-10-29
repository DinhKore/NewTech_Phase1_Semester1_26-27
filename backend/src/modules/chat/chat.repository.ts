import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database';
import type { ChatMessage, ChatRole, ChatSession, ChatSource } from './chat.types';

interface SessionRow {
  id: string;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: number;
  session_id: string;
  role: ChatRole;
  content: string;
  sources: string;
  created_at: string;
}

const toSession = (row: SessionRow): ChatSession => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  sessionId: row.session_id,
  role: row.role,
  content: row.content,
  sources: JSON.parse(row.sources) as ChatSource[],
  createdAt: row.created_at,
});

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

export class ChatRepository {
  private readonly db: SqliteDatabase;

  constructor(db: SqliteDatabase) {
    this.db = db;
  }

  createSession(userId: number, title: string): ChatSession {
    const id = randomUUID();
    this.db.run('INSERT INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)', [id, userId, title]);
    const session = this.findSession(userId, id);
    if (!session) throw new Error('Failed to read back chat session');
    return session;
  }

  listSessions(userId: number): ChatSession[] {
    return this.db
      .all<SessionRow>('SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC, rowid DESC', [userId])
      .map(toSession);
  }

  /** Scoped by user: returns undefined for sessions that belong to someone else. */
  findSession(userId: number, sessionId: string): ChatSession | undefined {
    const row = this.db.get<SessionRow>('SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
    return row ? toSession(row) : undefined;
  }

  renameSession(sessionId: string, title: string): void {
    this.db.run('UPDATE chat_sessions SET title = ? WHERE id = ?', [title, sessionId]);
  }

  deleteSession(userId: number, sessionId: string): boolean {
    return this.db.run('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]).changes > 0;
  }

  listMessages(sessionId: string): ChatMessage[] {
    return this.db
      .all<MessageRow>('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC', [sessionId])
      .map(toMessage);
  }

  addMessage(sessionId: string, role: ChatRole, content: string, sources: ChatSource[]): ChatMessage {
    return this.db.transaction(() => {
      const result = this.db.run('INSERT INTO chat_messages (session_id, role, content, sources) VALUES (?, ?, ?, ?)', [
        sessionId,
        role,
        content,
        JSON.stringify(sources),
      ]);
      this.db.run(`UPDATE chat_sessions SET updated_at = ${NOW} WHERE id = ?`, [sessionId]);
      const row = this.db.get<MessageRow>('SELECT * FROM chat_messages WHERE id = ?', [result.lastInsertRowid]);
      if (!row) throw new Error('Failed to read back chat message');
      return toMessage(row);
    });
  }
}
