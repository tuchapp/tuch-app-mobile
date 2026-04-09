/**
 * V2 SQLite database entry point.
 * Opens the database and runs all migrations.
 */

import * as SQLite from 'expo-sqlite';
import { ALL_MIGRATIONS } from './schema';

// expo-sqlite v14+ API
let _db: SQLite.SQLiteDatabase | null = null;

export function openDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('tuch_v2.db');
  }
  return _db;
}

export async function runMigrations(): Promise<void> {
  const db = openDatabase();
  for (const sql of ALL_MIGRATIONS) {
    db.execSync(sql);
  }
}

export { _db as db };
