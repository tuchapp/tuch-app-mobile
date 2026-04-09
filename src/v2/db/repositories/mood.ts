import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../index';

export interface MoodLog {
  id: string;
  mood: number;
  energy: number;
  stress: number;
  note?: string;
  created_at: string;
}

export class MoodRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(db?: SQLite.SQLiteDatabase) {
    this.db = db ?? openDatabase();
  }

  findAll(): MoodLog[] {
    return this.db.getAllSync<MoodLog>(
      `SELECT * FROM mood_logs ORDER BY created_at DESC`
    );
  }

  findByRange(start: string, end: string): MoodLog[] {
    return this.db.getAllSync<MoodLog>(
      `SELECT * FROM mood_logs WHERE created_at >= ? AND created_at <= ? ORDER BY created_at ASC`,
      [start, end]
    );
  }

  create(data: { mood: number; energy: number; stress: number; note?: string }): MoodLog {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.runSync(
      `INSERT INTO mood_logs (id, mood, energy, stress, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.mood, data.energy, data.stress, data.note ?? null, now]
    );
    return this.db.getFirstSync<MoodLog>(
      `SELECT * FROM mood_logs WHERE id = ?`,
      [id]
    )!;
  }
}
