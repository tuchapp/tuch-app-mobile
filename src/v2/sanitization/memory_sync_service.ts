/**
 * Memory sync service — runs sanitization pipeline and pushes patterns to backend.
 */

import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../db/index';
import { MemoryRepository } from '../db/repositories/memory';
import { computeAllFeatures } from '../features/feature_engine';
import { runSanitizationPipeline } from './sanitization_pipeline';
import { apiClient } from '../api/client';
import type { MemorySyncResponse } from '../api/types';

export interface SyncResult {
  itemsProcessed: number;
  patternsSynced: number;
  discarded: number;
}

export async function syncMemoryToBackend(
  db?: SQLite.SQLiteDatabase
): Promise<SyncResult> {
  const database = db ?? openDatabase();
  const memoryRepo = new MemoryRepository(database);

  // Get unsynced, non-private items
  const unsynced = memoryRepo.findUnsynced();
  if (unsynced.length === 0) {
    return { itemsProcessed: 0, patternsSynced: 0, discarded: 0 };
  }

  // Compute features for context (no PII)
  const features = await computeAllFeatures(database);

  // Run sanitization pipeline
  const patterns = runSanitizationPipeline(unsynced, features);
  const discarded = unsynced.length - patterns.length;

  if (patterns.length > 0) {
    const response = await apiClient.post<MemorySyncResponse>('/agent/memory/sync', { patterns });

    // Mark processed items as synced regardless of whether they produced a pattern
    // (they were either sanitized or safely discarded — either way, don't retry)
    for (const item of unsynced) {
      memoryRepo.markSynced(item.id);
    }

    // Update sync state
    try {
      database.runSync(
        `INSERT OR REPLACE INTO sync_state (id, last_memory_sync, updated_at) VALUES (1, ?, ?)`,
        [new Date().toISOString(), new Date().toISOString()]
      );
    } catch {
      // Non-critical
    }

    return {
      itemsProcessed: unsynced.length,
      patternsSynced: response.upserted,
      discarded,
    };
  } else {
    // All items were discarded — still mark as synced to avoid retry loops
    for (const item of unsynced) {
      memoryRepo.markSynced(item.id);
    }

    return {
      itemsProcessed: unsynced.length,
      patternsSynced: 0,
      discarded: unsynced.length,
    };
  }
}
