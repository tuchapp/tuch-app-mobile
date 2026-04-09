/**
 * Builds a sanitized context payload safe for POST /api/v2/agent/query.
 * NEVER includes: goal titles, journal text, names, or any personal content.
 * Only behavioral abstractions + signal scores.
 */
import { SQLiteDatabase } from 'expo-sqlite';

export interface SanitizedContextPayload {
  dominant_state: string | null;
  active_patterns: string[];
  signal_snapshot: Record<string, number>;
  /** Plain-text user message — no names or specifics should be passed here */
  user_message?: string;
  session_turn: number;
}

/**
 * Build sanitized context from local SQLite state.
 * @param db - Open SQLite database
 * @param userMessage - Raw user text (caller responsible for omitting PII)
 * @param sessionTurn - Turn index within the current conversation
 */
export async function buildSanitizedContext(
  db: SQLiteDatabase,
  userMessage?: string,
  sessionTurn: number = 1,
): Promise<SanitizedContextPayload> {
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

  // Read active patterns (pattern_key only, no content)
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
    dominant_state,
    active_patterns,
    signal_snapshot,
    user_message: userMessage,
    session_turn: sessionTurn,
  };
}
