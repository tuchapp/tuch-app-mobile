/**
 * AgentProfileRepository — single-row table (id=1), always the same agent.
 * Uses async expo-sqlite API.
 */
import { SQLiteDatabase } from 'expo-sqlite';

export interface AgentProfileRow {
  id: number;
  agent_id: string;
  agent_name: string | null;
  coaching_tone: string;
  personality_id: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  onboarding_completed: number;
  registered_at: string | null;
  last_signal_pull: string | null;
  dominant_state: string | null;
  tier: string;
  created_at: string;
  updated_at: string;
}

export type AgentProfileUpdate = Partial<Omit<AgentProfileRow, 'id' | 'created_at'>>;

export class AgentProfileRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async get(): Promise<AgentProfileRow | null> {
    return this.db.getFirstAsync<AgentProfileRow>(
      `SELECT * FROM agent_profile WHERE id = 1`,
    );
  }

  async upsert(data: AgentProfileUpdate & { agent_id: string }): Promise<AgentProfileRow> {
    const now = new Date().toISOString();
    const existing = await this.get();

    if (existing) {
      // Build SET clause dynamically — only update provided fields
      const entries = Object.entries(data).filter(([k]) => k !== 'id' && k !== 'created_at');
      if (entries.length > 0) {
        const setClause = entries.map(([k]) => `${k} = ?`).join(', ');
        const values = entries.map(([, v]) => v);
        await this.db.runAsync(
          `UPDATE agent_profile SET ${setClause}, updated_at = ? WHERE id = 1`,
          [...values, now],
        );
      }
    } else {
      await this.db.runAsync(
        `INSERT INTO agent_profile
           (id, agent_id, agent_name, coaching_tone, personality_id,
            quiet_hours_start, quiet_hours_end, timezone, onboarding_completed,
            registered_at, last_signal_pull, dominant_state, tier, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.agent_id,
          data.agent_name ?? null,
          data.coaching_tone ?? 'supportive',
          data.personality_id ?? 'spark',
          data.quiet_hours_start ?? null,
          data.quiet_hours_end ?? null,
          data.timezone ?? 'America/New_York',
          data.onboarding_completed ?? 0,
          data.registered_at ?? null,
          data.last_signal_pull ?? null,
          data.dominant_state ?? null,
          data.tier ?? 'standard',
          now,
          now,
        ],
      );
    }

    return (await this.get())!;
  }

  /** Mark onboarding complete. */
  async completeOnboarding(): Promise<void> {
    await this.db.runAsync(
      `UPDATE agent_profile SET onboarding_completed = 1, updated_at = ? WHERE id = 1`,
      [new Date().toISOString()],
    );
  }

  /** Update last signal pull timestamp and dominant state. */
  async updateSignalState(dominantState: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE agent_profile SET dominant_state = ?, last_signal_pull = ?, updated_at = ? WHERE id = 1`,
      [dominantState, new Date().toISOString(), new Date().toISOString()],
    );
  }
}
