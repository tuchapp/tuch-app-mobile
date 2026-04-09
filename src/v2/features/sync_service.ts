/**
 * Feature sync service — computes features locally and pushes to backend.
 */

import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../db/index';
import { computeAllFeatures } from './feature_engine';
import { apiClient } from '../api/client';
import type { FeatureSyncResponse } from '../api/types';

export async function syncFeaturesToBackend(
  db?: SQLite.SQLiteDatabase
): Promise<FeatureSyncResponse> {
  const database = db ?? openDatabase();
  const features = await computeAllFeatures(database);

  // Filter out features with null values and low confidence before sync
  const syncable = features.filter(
    (f) => f.feature_value !== null && f.confidence_level !== 'low'
  );

  return apiClient.post<FeatureSyncResponse>('/agent/features/sync', { features: syncable });
}
