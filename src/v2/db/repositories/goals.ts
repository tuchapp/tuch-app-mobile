import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../index';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: string;
  target_date?: string;
  progress: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export type CreateGoalData = Pick<Goal, 'title'> & Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'is_archived'>>;
export type UpdateGoalData = Partial<Pick<Goal, 'title' | 'description' | 'category' | 'status' | 'target_date' | 'progress'>>;

export class GoalsRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(db?: SQLite.SQLiteDatabase) {
    this.db = db ?? openDatabase();
  }

  findAll(): Goal[] {
    return this.db.getAllSync<Goal>(
      `SELECT * FROM goals WHERE is_archived = 0 ORDER BY created_at DESC`
    );
  }

  findById(id: string): Goal | null {
    return this.db.getFirstSync<Goal>(
      `SELECT * FROM goals WHERE id = ?`,
      [id]
    ) ?? null;
  }

  create(data: CreateGoalData): Goal {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.runSync(
      `INSERT INTO goals (id, title, description, category, status, target_date, progress, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, data.title, data.description ?? null, data.category ?? null,
       data.status ?? 'active', data.target_date ?? null, data.progress ?? 0, now, now]
    );
    return this.findById(id)!;
  }

  update(id: string, data: UpdateGoalData): Goal | null {
    const now = new Date().toISOString();
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = ?`);
    const values = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([, v]) => v);

    if (fields.length === 0) return this.findById(id);

    this.db.runSync(
      `UPDATE goals SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`,
      [...values, now, id]
    );
    return this.findById(id);
  }

  archive(id: string): void {
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE goals SET is_archived = 1, status = 'archived', updated_at = ? WHERE id = ?`,
      [now, id]
    );
  }
}
