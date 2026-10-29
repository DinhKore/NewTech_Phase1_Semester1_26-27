import type { Logger } from '../../shared/logger/logger';
import type { SqliteDatabase } from './sqlite-database';

export interface Migration {
  id: number;
  name: string;
  sql: string;
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

/**
 * Append-only list. Never edit a migration that has been applied somewhere:
 * add a new one with the next id instead.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        google_sub    TEXT    NOT NULL UNIQUE,
        email         TEXT    NOT NULL UNIQUE,
        name          TEXT    NOT NULL,
        avatar_url    TEXT,
        role          TEXT    NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at    TEXT    NOT NULL DEFAULT (${NOW}),
        last_login_at TEXT
      );

      CREATE TABLE documents (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename     TEXT    NOT NULL,
        size_bytes   INTEGER NOT NULL,
        chunks_count INTEGER NOT NULL,
        created_at   TEXT    NOT NULL DEFAULT (${NOW}),
        UNIQUE (user_id, filename)
      );
      CREATE INDEX idx_documents_user ON documents(user_id);

      CREATE TABLE document_chunks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        page_number INTEGER,
        content     TEXT    NOT NULL,
        embedding   BLOB    NOT NULL
      );
      CREATE INDEX idx_chunks_document ON document_chunks(document_id);
      CREATE INDEX idx_chunks_user ON document_chunks(user_id);

      CREATE TABLE chat_sessions (
        id         TEXT    PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title      TEXT    NOT NULL,
        created_at TEXT    NOT NULL DEFAULT (${NOW}),
        updated_at TEXT    NOT NULL DEFAULT (${NOW})
      );
      CREATE INDEX idx_sessions_user ON chat_sessions(user_id, updated_at DESC);

      CREATE TABLE chat_messages (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT    NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role       TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
        content    TEXT    NOT NULL,
        sources    TEXT    NOT NULL DEFAULT '[]',
        created_at TEXT    NOT NULL DEFAULT (${NOW})
      );
      CREATE INDEX idx_messages_session ON chat_messages(session_id, id);

      CREATE TABLE ai_logs (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
        endpoint          TEXT    NOT NULL,
        prompt_snippet    TEXT    NOT NULL DEFAULT '',
        latency_ms        INTEGER NOT NULL,
        prompt_tokens     INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd          REAL    NOT NULL DEFAULT 0,
        status            TEXT    NOT NULL CHECK (status IN ('SUCCESS', 'REFUSED', 'ERROR')),
        model             TEXT,
        error_message     TEXT,
        created_at        TEXT    NOT NULL DEFAULT (${NOW})
      );
      CREATE INDEX idx_ai_logs_created ON ai_logs(created_at DESC);
    `,
  },
];

export function runMigrations(db: SqliteDatabase, logger: Logger): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (${NOW})
    );
  `);

  const applied = new Set(db.all<{ id: number }>('SELECT id FROM schema_migrations').map((row) => row.id));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.transaction(() => {
      db.exec(migration.sql);
      db.run('INSERT INTO schema_migrations (id, name) VALUES (?, ?)', [migration.id, migration.name]);
    });
    logger.info('database migration applied', { id: migration.id, name: migration.name });
  }
}
