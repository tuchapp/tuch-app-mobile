/**
 * V2 SQLite database entry point.
 * Opens the database, creates all tables (idempotent), and runs column migrations
 * for existing installs (errors on duplicate columns are silently swallowed).
 */
import * as SQLite from 'expo-sqlite';
import { ALL_MIGRATIONS, COLUMN_MIGRATIONS } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

/** Get or open the V2 database. */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('tuch_v2.db');
  }
  return _db;
}

/** @deprecated Use getDatabase() */
export const openDatabase = getDatabase;

/**
 * Initialize the database. Call once at app startup before rendering anything.
 * Safe to call multiple times — all operations are idempotent.
 */
export async function initDatabase(): Promise<void> {
  const db = getDatabase();

  // 1. Create tables (all use CREATE TABLE IF NOT EXISTS)
  for (const sql of ALL_MIGRATIONS) {
    try {
      await db.execAsync(sql);
    } catch (e: any) {
      console.warn('[DB] Migration warning:', e?.message ?? e);
    }
  }

  // 2. Add new columns to existing tables (safe: ignore "duplicate column" errors)
  for (const migration of COLUMN_MIGRATIONS) {
    try {
      await db.execAsync(migration.sql);
    } catch (e: any) {
      // SQLite error code 1 with "duplicate column name" is expected on re-runs
      if (!e?.message?.includes('duplicate column')) {
        console.warn(`[DB] Column migration warning (${migration.description}):`, e?.message ?? e);
      }
    }
  }

  // 3. Migrate existing 'name' data to 'agent_name' if needed
  try {
    await db.execAsync(
      `UPDATE agent_profile SET agent_name = name WHERE agent_name IS NULL AND name IS NOT NULL`,
    );
  } catch (_) {
    // 'name' column may not exist on fresh installs — that's fine
  }
}
