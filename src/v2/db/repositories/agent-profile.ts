import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../index';

export interface AgentProfile {
  id: number;
  agent_id: string;
  name?: string;
  coaching_tone: string;
  personality_id: string;
  registered_at?: string;
  last_signal_pull?: string;
  dominant_state?: string;
  tier: string;
  created_at: string;
  updated_at: string;
}

export class AgentProfileRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(db?: SQLite.SQLiteDatabase) {
    this.db = db ?? openDatabase();
  }

  get(): AgentProfile | null {
    return this.db.getFirstSync<AgentProfile>(
      `SELECT * FROM agent_profile WHERE id = 1`
    ) ?? null;
  }

  upsert(data: Partial<Omit<AgentProfile, 'id' | 'created_at'>> & { agent_id: string }): AgentProfile {
    const now = new Date().toISOString();
    const existing = this.get();

    if (existing) {
      const fields = Object.entries(data)
        .filter(([k]) => k !== 'id' && k !== 'created_at')
        .map(([k]) => `${k} = ?`);
      const values = Object.entries(data)
        .filter(([k]) => k !== 'id' && k !== 'created_at')
        .map(([, v]) => v);

      this.db.runSync(
        `UPDATE agent_profile SET ${fields.join(', ')}, updated_at = ? WHERE id = 1`,
        [...values, now]
      );
    } else {
      this.db.runSync(
        `INSERT INTO agent_profile (id, agent_id, name, coaching_tone, personality_id, registered_at, last_signal_pull, dominant_state, tier, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.agent_id,
          data.name ?? null,
          data.coaching_tone ?? 'balanced',
          (data as any).personality_id ?? 'spark',
          data.registered_at ?? null,
          data.last_signal_pull ?? null,
          data.dominant_state ?? null,
          data.tier ?? 'standard',
          now,
          now,
        ]
      );
    }

    return this.get()!;
  }
}
