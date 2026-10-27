import { DatabaseSync } from 'node:sqlite';

export interface DocRecord {
    id: number;
    filename: string;
    chunks_count: number;
    uploaded_at: string;
}

export interface UserRecord {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'user';
    created_at: string;
}

export interface AIMetricSummary {
    totalRequests: number;
    avgLatency: number;
    totalCostUSD: number;
    refusedOrFailed: number;
    recentLogs: any[];
}

export class DatabaseService {
    private db: DatabaseSync;

    constructor(dbName: string = 'course_assistant.db') {
        this.db = new DatabaseSync(dbName);
        this.initTables();
    }

    private initTables(): void {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        prompt_snippet TEXT,
        latency_ms INTEGER NOT NULL,
        tokens INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0.0,
        status TEXT NOT NULL, -- 'SUCCESS', 'REFUSED', 'ERROR'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        chunks_count INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id INTEGER,
        content TEXT NOT NULL,
        vector TEXT NOT NULL,
        FOREIGN KEY(doc_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        sources TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quiz_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          sender TEXT NOT NULL,
          text TEXT NOT NULL,
          sources TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );
    `);

        // Tạo sẵn 1 tài khoản Admin mặc định để test đăng nhập
        try {
            this.db.prepare(`
        INSERT OR IGNORE INTO users (email, name, role) 
        VALUES ('admin@course.edu.vn', 'Quản Trị Viên', 'admin'),
               ('student@course.edu.vn', 'Sinh Viên Mẫu', 'user')
      `).run();
        } catch (e) {
            // bỏ qua nếu đã có
        }
    }

    // --- QUẢN LÝ USER & AUTH ---
    public getUserByEmail(email: string): UserRecord | undefined {
        return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as UserRecord | undefined;
    }

    public upsertUser(email: string, name: string, role: 'admin' | 'user' = 'user'): UserRecord {
        this.db.prepare(`
      INSERT INTO users (email, name, role) VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET name = excluded.name
    `).run(email, name, role);
        return this.getUserByEmail(email)!;
    }

    // --- QUẢN LÝ AI LOGGING & METRICS ---
    public logAIRequest(
        endpoint: string,
        promptSnippet: string,
        latencyMs: number,
        tokens: number,
        costUSD: number,
        status: 'SUCCESS' | 'REFUSED' | 'ERROR'
    ): void {
        try {
            this.db.prepare(`
        INSERT INTO ai_logs (endpoint, prompt_snippet, latency_ms, tokens, cost_usd, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(endpoint, promptSnippet.substring(0, 100), latencyMs, tokens, costUSD, status);
        } catch (err) {
            console.error("Lỗi ghi log AI:", err);
        }
    }

    public getAIMetrics(): AIMetricSummary {
        const totalRow = this.db.prepare('SELECT COUNT(*) as total FROM ai_logs').get() as { total: number };
        const avgLatencyRow = this.db.prepare('SELECT AVG(latency_ms) as avgLat FROM ai_logs').get() as { avgLat: number };
        const totalCostRow = this.db.prepare('SELECT SUM(cost_usd) as totalCost FROM ai_logs').get() as { totalCost: number };
        const refusedRow = this.db.prepare("SELECT COUNT(*) as refused FROM ai_logs WHERE status != 'SUCCESS'").get() as { refused: number };
        const recentLogs = this.db.prepare('SELECT * FROM ai_logs ORDER BY id DESC LIMIT 15').all();

        return {
            totalRequests: totalRow.total || 0,
            avgLatency: Math.round(avgLatencyRow.avgLat || 0),
            totalCostUSD: Number((totalCostRow.totalCost || 0).toFixed(5)),
            refusedOrFailed: refusedRow.refused || 0,
            recentLogs: recentLogs as any[]
        };
    }

    // --- CÁC HÀM CŨ CHO DOCUMENTS & CHAT (GIỮ NGUYÊN) ---
    public saveDocument(filename: string, chunksCount: number): number {
        this.db.prepare('DELETE FROM documents WHERE filename = ?').run(filename);
        this.db.prepare('INSERT INTO documents (filename, chunks_count) VALUES (?, ?)').run(filename, chunksCount);
        const docRow = this.db.prepare('SELECT id FROM documents WHERE filename = ?').get(filename) as unknown as { id: number };
        return docRow.id;
    }

    public saveChunks(docId: number, chunks: Array<{ content: string; vector: number[] }>): void {
        const insertChunk = this.db.prepare('INSERT INTO document_chunks (doc_id, content, vector) VALUES (?, ?, ?)');
        for (const chunk of chunks) {
            insertChunk.run(docId, chunk.content, JSON.stringify(chunk.vector));
        }
    }

    public getAllChunks(): Array<{ content: string; vector: number[] }> {
        const rows = this.db.prepare('SELECT content, vector FROM document_chunks').all() as unknown as Array<{ content: string; vector: string }>;
        return rows.map(r => ({
            content: r.content,
            vector: JSON.parse(r.vector)
        }));
    }

    public getDocuments(): DocRecord[] {
        return this.db.prepare('SELECT * FROM documents ORDER BY id DESC').all() as unknown as DocRecord[];
    }

    public saveChat(question: string, answer: string, sources: any[]): void {
        const insertChat = this.db.prepare('INSERT INTO chat_history (question, answer, sources) VALUES (?, ?, ?)');
        insertChat.run(question, answer, JSON.stringify(sources));
    }

    public getChatHistory(limit: number = 50): any[] {
        const rows = this.db.prepare('SELECT * FROM chat_history ORDER BY id ASC LIMIT ?').all(limit) as unknown as Array<{ question: string; answer: string; sources: string }>;
        const history: any[] = [];
        rows.forEach(r => {
            history.push({ sender: 'user', text: r.question });
            history.push({
                sender: 'ai',
                text: r.answer,
                sources: r.sources ? JSON.parse(r.sources) : []
            });
        });
        return history;
    }

    // --- QUẢN LÝ CÁC PHIÊN CHAT (SESSIONS) ---
    public getChatSessions(): Array<{ id: string; title: string; created_at: string }> {
        return this.db.prepare('SELECT * FROM chat_sessions ORDER BY created_at DESC').all() as any[];
    }

    public createChatSession(id: string, title: string = 'Đoạn chat mới'): void {
        this.db.prepare('INSERT INTO chat_sessions (id, title) VALUES (?, ?)').run(id, title);
    }

    public updateSessionTitle(id: string, title: string): void {
        this.db.prepare('UPDATE chat_sessions SET title = ? WHERE id = ?').run(title, id);
    }

    public deleteChatSession(id: string): void {
        this.db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(id);
        this.db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(id);
    }

    public getSessionMessages(sessionId: string): any[] {
        const rows = this.db.prepare('SELECT sender, text, sources FROM chat_messages WHERE session_id = ? ORDER BY id ASC').all(sessionId) as any[];
        return rows.map(r => ({
            sender: r.sender,
            text: r.text,
            sources: r.sources ? JSON.parse(r.sources) : []
        }));
    }

    public saveMessageToSession(sessionId: string, sender: 'user' | 'ai', text: string, sources: any[] = []): void {
        this.db.prepare('INSERT INTO chat_messages (session_id, sender, text, sources) VALUES (?, ?, ?, ?)').run(
            sessionId,
            sender,
            text,
            JSON.stringify(sources)
        );
    }
}