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
    const signalRow = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_state WHERE key = 'last_signals'`,
    );
    if (signalRow?.value) {
      const parsed = JSON.parse(signalRow.value);
      dominant_state = parsed.dominant_state ?? null;
      signal_snapshot = parsed.signals ?? {};
    }
  } catch (_) {
    // No signals synced yet — proceed with empty
  }

  // Read active patterns (pattern_key only — no content)
  let active_patterns: string[] = [];
  try {
    const patternRows = await db.getAllAsync<{ memory_type: string }>(
      `SELECT DISTINCT memory_type FROM local_memory_items
       WHERE is_synced = 1 AND is_private = 0
       ORDER BY created_at DESC LIMIT 10`,
    );
    active_patterns = patternRows.map((r) => r.memory_type);
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
