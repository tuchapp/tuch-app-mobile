import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../index';

export interface LocalMemoryItem {
  id: string;
  source_type: string;
  source_id?: string;
  raw_text: string;
  is_private: number;
  is_synced: number;
  synced_at?: string;
  created_at: string;
}

export class MemoryRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(db?: SQLite.SQLiteDatabase) {
    this.db = db ?? openDatabase();
  }

  findAll(): LocalMemoryItem[] {
    return this.db.getAllSync<LocalMemoryItem>(
      `SELECT * FROM local_memory_items ORDER BY created_at DESC`
    );
  }

  create(item: {
    source_type: string;
    source_id?: string;
    raw_text: string;
    is_private?: number;
  }): LocalMemoryItem {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.runSync(
      `INSERT INTO local_memory_items (id, source_type, source_id, raw_text, is_private, is_synced, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, item.source_type, item.source_id ?? null, item.raw_text, item.is_private ?? 0, now]
    );
    return this.db.getFirstSync<LocalMemoryItem>(
      `SELECT * FROM local_memory_items WHERE id = ?`,
      [id]
    )!;
  }

  markSynced(id: string): void {
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE local_memory_items SET is_synced = 1, synced_at = ? WHERE id = ?`,
      [now, id]
    );
  }

  /** Batch mark multiple items synced in a single UPDATE — avoids N+1 writes. */
  markSyncedBatch(ids: string[]): void {
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(', ');
    this.db.runSync(
      `UPDATE local_memory_items SET is_synced = 1, synced_at = ? WHERE id IN (${placeholders})`,
      [now, ...ids]
    );
  }

  findUnsynced(): LocalMemoryItem[] {
    return this.db.getAllSync<LocalMemoryItem>(
      `SELECT * FROM local_memory_items WHERE is_synced = 0 AND is_private = 0 ORDER BY created_at ASC`
    );
  }
}
