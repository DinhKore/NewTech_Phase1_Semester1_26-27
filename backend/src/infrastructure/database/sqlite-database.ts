import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export type SqlParam = string | number | bigint | null | Uint8Array;

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

/**
 * Thin wrapper around Node's built-in `node:sqlite`.
 * Repositories depend on this class only, never on the driver directly.
 */
export class SqliteDatabase {
  private readonly db: DatabaseSync;
  private transactionDepth = 0;

  constructor(filePath: string) {
    if (filePath !== ':memory:') {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    this.db = new DatabaseSync(filePath);
    // Foreign keys are OFF by default in SQLite: without this, ON DELETE CASCADE silently does nothing.
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (filePath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
    }
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, params: SqlParam[] = []): RunResult {
    const result = this.db.prepare(sql).run(...params);
    return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
  }

  get<T>(sql: string, params: SqlParam[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as unknown as T | undefined;
  }

  all<T>(sql: string, params: SqlParam[] = []): T[] {
    return this.db.prepare(sql).all(...params) as unknown as T[];
  }

  /**
   * Runs `work` atomically. `work` must be synchronous (node:sqlite is synchronous),
   * so never `await` inside it. Nested calls join the outer transaction.
   */
  transaction<T>(work: () => T): T {
    if (this.transactionDepth > 0) return work();

    this.db.exec('BEGIN');
    this.transactionDepth += 1;
    try {
      const result = work();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    } finally {
      this.transactionDepth -= 1;
    }
  }

  close(): void {
    this.db.close();
  }
}
