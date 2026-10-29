import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database';
import type { User, UserRole } from './auth.types';

interface UserRow {
  id: number;
  google_sub: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  avatarUrl: row.avatar_url,
  role: row.role,
  createdAt: row.created_at,
});

export interface UpsertGoogleUserInput {
  googleSub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
}

export class UserRepository {
  private readonly db: SqliteDatabase;

  constructor(db: SqliteDatabase) {
    this.db = db;
  }

  findById(id: number): User | undefined {
    const row = this.db.get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    return row ? toUser(row) : undefined;
  }

  findByEmail(email: string): User | undefined {
    const row = this.db.get<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    return row ? toUser(row) : undefined;
  }

  /** Creates the user on first login, otherwise refreshes profile fields and role. */
  upsertFromGoogle(input: UpsertGoogleUserInput): User {
    const row = this.db.get<UserRow>(
      `INSERT INTO users (google_sub, email, name, avatar_url, role, last_login_at)
       VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(google_sub) DO UPDATE SET
         email         = excluded.email,
         name          = excluded.name,
         avatar_url    = excluded.avatar_url,
         role          = excluded.role,
         last_login_at = excluded.last_login_at
       RETURNING *`,
      [input.googleSub, input.email, input.name, input.avatarUrl, input.role],
    );
    if (!row) throw new Error('Failed to upsert user');
    return toUser(row);
  }
}
