import { DatabaseSync } from 'node:sqlite';

export interface DocRecord {
    id: number;
    filename: string;
    chunks_count: number;
    uploaded_at: string;
}

export class DatabaseService {
    private db: DatabaseSync;

    constructor(dbName: string = 'course_assistant.db') {
        this.db = new DatabaseSync(dbName);
        this.initTables();
    }

    // Khởi tạo bảng nếu chưa có
    private initTables(): void {
        this.db.exec(`
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
    `);
    }

    // Lưu tài liệu mới (xóa file cũ trùng tên trước)
    public saveDocument(filename: string, chunksCount: number): number {
        this.db.prepare('DELETE FROM documents WHERE filename = ?').run(filename);
        this.db.prepare('INSERT INTO documents (filename, chunks_count) VALUES (?, ?)').run(filename, chunksCount);
        const docRow = this.db.prepare('SELECT id FROM documents WHERE filename = ?').get(filename) as unknown as { id: number };
        return docRow.id;
    }

    // Lưu danh sách các vector chunks
    public saveChunks(docId: number, chunks: Array<{ content: string; vector: number[] }>): void {
        const insertChunk = this.db.prepare('INSERT INTO document_chunks (doc_id, content, vector) VALUES (?, ?, ?)');
        for (const chunk of chunks) {
            insertChunk.run(docId, chunk.content, JSON.stringify(chunk.vector));
        }
    }

    // Phục hồi vector từ SQLite lên RAM
    public getAllChunks(): Array<{ content: string; vector: number[] }> {
        const rows = this.db.prepare('SELECT content, vector FROM document_chunks').all() as unknown as Array<{ content: string; vector: string }>;
        return rows.map(r => ({
            content: r.content,
            vector: JSON.parse(r.vector)
        }));
    }

    // Lấy danh sách tài liệu hiển thị UI (Đã sửa lỗi 2352 bằng `as unknown as DocRecord[]`)
    public getDocuments(): DocRecord[] {
        return this.db.prepare('SELECT * FROM documents ORDER BY id DESC').all() as unknown as DocRecord[];
    }

    // Lưu hội thoại chat
    public saveChat(question: string, answer: string, sources: any[]): void {
        const insertChat = this.db.prepare('INSERT INTO chat_history (question, answer, sources) VALUES (?, ?, ?)');
        insertChat.run(question, answer, JSON.stringify(sources));
    }

    // Lấy lịch sử chat
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
}