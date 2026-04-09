import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../index';

export interface LocalEvent {
  id: string;
  domain: string;
  event_type: string;
  payload: string;
  created_at: string;
}

export class EventRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(db?: SQLite.SQLiteDatabase) {
    this.db = db ?? openDatabase();
  }

  create(event: { domain: string; event_type: string; payload?: Record<string, unknown> }): LocalEvent {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const payloadStr = JSON.stringify(event.payload ?? {});
    this.db.runSync(
      `INSERT INTO local_events (id, domain, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, event.domain, event.event_type, payloadStr, now]
    );
    return this.db.getFirstSync<LocalEvent>(
      `SELECT * FROM local_events WHERE id = ?`,
      [id]
    )!;
  }

  findRecent(limit: number = 50): LocalEvent[] {
    return this.db.getAllSync<LocalEvent>(
      `SELECT * FROM local_events ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
  }

  findByDomain(domain: string): LocalEvent[] {
    return this.db.getAllSync<LocalEvent>(
      `SELECT * FROM local_events WHERE domain = ? ORDER BY created_at DESC`,
      [domain]
    );
  }
}
