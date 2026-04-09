/**
 * V2 on-device SQLite schema definitions.
 * Device is source of truth — all user data lives here, never on the backend.
 */

export const CREATE_AGENT_PROFILE = `
  CREATE TABLE IF NOT EXISTS agent_profile (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    agent_id         TEXT NOT NULL,
    agent_name       TEXT,
    coaching_tone    TEXT NOT NULL DEFAULT 'supportive',
    personality_id   TEXT NOT NULL DEFAULT 'spark',
    quiet_hours_start TEXT,
    quiet_hours_end   TEXT,
    timezone         TEXT NOT NULL DEFAULT 'America/New_York',
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    registered_at    TEXT,
    last_signal_pull TEXT,
    dominant_state   TEXT,
    tier             TEXT NOT NULL DEFAULT 'standard',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_GOALS = `
  CREATE TABLE IF NOT EXISTS goals (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    description   TEXT,
    category      TEXT,
    status        TEXT NOT NULL DEFAULT 'active',
    target_date   TEXT,
    progress      REAL NOT NULL DEFAULT 0,
    is_archived   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_GOAL_MILESTONES = `
  CREATE TABLE IF NOT EXISTS goal_milestones (
    id           TEXT PRIMARY KEY,
    goal_id      TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    due_date     TEXT,
    completed_at TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_GOAL_UPDATES = `
  CREATE TABLE IF NOT EXISTS goal_updates (
    id         TEXT PRIMARY KEY,
    goal_id    TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    note       TEXT,
    progress   REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_JOURNAL_ENTRIES = `
  CREATE TABLE IF NOT EXISTS journal_entries (
    id           TEXT PRIMARY KEY,
    content      TEXT NOT NULL,
    is_deleted   INTEGER NOT NULL DEFAULT 0,
    is_private   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_MOOD_LOGS = `
  CREATE TABLE IF NOT EXISTS mood_logs (
    id         TEXT PRIMARY KEY,
    mood       REAL NOT NULL,
    energy     REAL NOT NULL,
    stress     REAL NOT NULL,
    note       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_CONVERSATIONS = `
  CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT PRIMARY KEY,
    title      TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at   TEXT
  );
`;

export const CREATE_CONVERSATION_MESSAGES = `
  CREATE TABLE IF NOT EXISTS conversation_messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_LOCAL_MEMORY_ITEMS = `
  CREATE TABLE IF NOT EXISTS local_memory_items (
    id            TEXT PRIMARY KEY,
    source_type   TEXT NOT NULL,
    source_id     TEXT,
    raw_text      TEXT NOT NULL,
    is_private    INTEGER NOT NULL DEFAULT 0,
    is_synced     INTEGER NOT NULL DEFAULT 0,
    synced_at     TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_LOCAL_EVENTS = `
  CREATE TABLE IF NOT EXISTS local_events (
    id         TEXT PRIMARY KEY,
    domain     TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload    TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_NOTIFICATION_LOG = `
  CREATE TABLE IF NOT EXISTS notification_log (
    id                TEXT PRIMARY KEY,
    intervention_class TEXT,
    channel           TEXT,
    sent_at           TEXT NOT NULL DEFAULT (datetime('now')),
    opened_at         TEXT,
    dismissed_at      TEXT,
    acted_at          TEXT
  );
`;

export const CREATE_SYNC_STATE = `
  CREATE TABLE IF NOT EXISTS sync_state (
    id                  INTEGER PRIMARY KEY CHECK (id = 1),
    last_feature_sync   TEXT,
    last_memory_sync    TEXT,
    last_signal_pull    TEXT,
    dominant_state      TEXT,
    consistency_score   REAL,
    goal_drift_score    REAL,
    stress_score        REAL,
    disengagement_score REAL,
    recovery_score      REAL,
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

/**
 * Column migrations — ADD COLUMN statements for existing installs.
 * These are safe to run on both new and existing databases (ALTER TABLE ADD COLUMN is idempotent-safe
 * since we catch the "duplicate column" error in runMigrations).
 */
export const COLUMN_MIGRATIONS: Array<{ sql: string; description: string }> = [
  {
    sql: `ALTER TABLE agent_profile ADD COLUMN agent_name TEXT`,
    description: 'Rename name -> agent_name for spec alignment',
  },
  {
    sql: `ALTER TABLE agent_profile ADD COLUMN personality_id TEXT NOT NULL DEFAULT 'spark'`,
    description: 'Add personality_id column',
  },
  {
    sql: `ALTER TABLE agent_profile ADD COLUMN quiet_hours_start TEXT`,
    description: 'Add quiet_hours_start',
  },
  {
    sql: `ALTER TABLE agent_profile ADD COLUMN quiet_hours_end TEXT`,
    description: 'Add quiet_hours_end',
  },
  {
    sql: `ALTER TABLE agent_profile ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/New_York'`,
    description: 'Add timezone',
  },
  {
    sql: `ALTER TABLE agent_profile ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0`,
    description: 'Add onboarding_completed flag',
  },
];

export const ALL_MIGRATIONS = [
  CREATE_AGENT_PROFILE,
  CREATE_GOALS,
  CREATE_GOAL_MILESTONES,
  CREATE_GOAL_UPDATES,
  CREATE_JOURNAL_ENTRIES,
  CREATE_MOOD_LOGS,
  CREATE_CONVERSATIONS,
  CREATE_CONVERSATION_MESSAGES,
  CREATE_LOCAL_MEMORY_ITEMS,
  CREATE_LOCAL_EVENTS,
  CREATE_NOTIFICATION_LOG,
  CREATE_SYNC_STATE,
];
