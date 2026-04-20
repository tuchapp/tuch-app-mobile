/**
 * Builds a sanitized context payload safe for POST /api/v2/agent/query.
 * NEVER includes: goal titles, journal text, or any personal content.
 *
 * SAFE to include (not PII):
 * - personality_id (enum of 5 values)
 * - agent_tone (enum of coaching tone values)
 * - agent_name (the name the user gave their agent — it's a product name, not a real name)
 * - behavioral feature scores (anonymized counts)
 * - signal state (computed from anonymized features)
 */
import { SQLiteDatabase } from 'expo-sqlite';

export interface SanitizedContextPayload {
  /** Enum: sage | spark | anchor | ember | forge */
  personality_id: string;
  /** Enum: supportive | direct | analytical | motivational */
  agent_tone: string;
  /** The name the user gave their agent (not their own name) */
  agent_name: string;
  dominant_state: string | null;
  active_patterns: string[];
  signal_snapshot: Record<string, number>;
  /** Plain-text user message — caller must not include real names/places */
  user_message?: string;
  session_turn: number;
}

export interface ContextOptions {
  userMessage?: string;
  sessionTurn?: number;
  agentName?: string;
  personalityId?: string;
  agentTone?: string;
}

/**
 * Build sanitized context from local SQLite state.
 * Includes personality and tone so the backend can tailor the coaching voice.
 */
export async function buildSanitizedContext(
  db: SQLiteDatabase,
  options: ContextOptions = {},
): Promise<SanitizedContextPayload> {
  const {
    userMessage,
    sessionTurn = 1,
    agentName = 'your coach',
    personalityId = 'spark',
    agentTone = 'supportive',
  } = options;

  // Read last signal pull from sync_state
  let dominant_state: string | null = null;
  let signal_snapshot: Record<string, number> = {};

  try {
    const signalRow = await db.getFirstAsync<{
      dominant_state: string | null;
      consistency_score: number | null;
      goal_drift_score: number | null;
      stress_score: number | null;
      disengagement_score: number | null;
      recovery_score: number | null;
    }>(
      `SELECT dominant_state, consistency_score, goal_drift_score, stress_score,
              disengagement_score, recovery_score
       FROM sync_state WHERE id = 1`,
    );
    if (signalRow) {
      dominant_state = signalRow.dominant_state ?? null;
      signal_snapshot = {
        consistency_score: signalRow.consistency_score ?? 0,
        goal_drift_score: signalRow.goal_drift_score ?? 0,
        stress_escalation_score: signalRow.stress_score ?? 0,
        disengagement_risk_score: signalRow.disengagement_score ?? 0,
        recovery_score: signalRow.recovery_score ?? 0,
      };
    }
  } catch (_) {
    // No signals synced yet — proceed with empty
  }

  // Read active patterns (source_type only — no content)
  let active_patterns: string[] = [];
  try {
    const patternRows = await db.getAllAsync<{ source_type: string }>(
      `SELECT DISTINCT source_type FROM local_memory_items
       WHERE is_synced = 1 AND is_private = 0
       ORDER BY created_at DESC LIMIT 10`,
    );
    active_patterns = patternRows.map((r) => r.source_type);
  } catch (_) {
    // No synced patterns yet
  }

  return {
    personality_id: personalityId,
    agent_tone: agentTone,
    agent_name: agentName,
    dominant_state,
    active_patterns,
    signal_snapshot,
    user_message: userMessage,
    session_turn: sessionTurn,
  };
}
