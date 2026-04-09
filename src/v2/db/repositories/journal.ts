import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../index';

export interface JournalEntry {
  id: string;
  content: string;
  is_deleted: number;
  is_private: number;
  created_at: string;
  updated_at: string;
}

export class JournalRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(db?: SQLite.SQLiteDatabase) {
    this.db = db ?? openDatabase();
  }

  findAll(): JournalEntry[] {
    return this.db.getAllSync<JournalEntry>(
      `SELECT * FROM journal_entries WHERE is_deleted = 0 ORDER BY created_at DESC`
    );
  }

  findById(id: string): JournalEntry | null {
    return this.db.getFirstSync<JournalEntry>(
      `SELECT * FROM journal_entries WHERE id = ? AND is_deleted = 0`,
      [id]
    ) ?? null;
  }

  create(data: { content: string; is_private?: number }): JournalEntry {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.runSync(
      `INSERT INTO journal_entries (id, content, is_deleted, is_private, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?, ?)`,
      [id, data.content, data.is_private ?? 0, now, now]
    );
    return this.findById(id)!;
  }

  update(id: string, data: { content?: string; is_private?: number }): JournalEntry | null {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
    if (data.is_private !== undefined) { fields.push('is_private = ?'); values.push(data.is_private); }

    if (fields.length === 0) return this.findById(id);

    this.db.runSync(
      `UPDATE journal_entries SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`,
      [...values, now, id]
    );
    return this.findById(id);
  }

  softDelete(id: string): void {
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE journal_entries SET is_deleted = 1, updated_at = ? WHERE id = ?`,
      [now, id]
    );
  }
}
