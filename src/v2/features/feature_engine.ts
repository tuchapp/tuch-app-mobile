/**
 * V2 Feature Engine — computes behavioral features from local SQLite data.
 * All computation is on-device. No PII leaves the device here.
 */

import * as SQLite from 'expo-sqlite';
import type { FeatureItem } from '../api/types';

export type FeatureSet = FeatureItem[];

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function linear_slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export async function computeAllFeatures(db: SQLite.SQLiteDatabase): Promise<FeatureSet> {
  const features: FeatureItem[] = [];
  const now = new Date().toISOString();
  const sevenDaysAgo = daysAgo(7);
  const fourteenDaysAgo = daysAgo(14);

  // ── Activity ──────────────────────────────────────────────────────────────

  // days_since_last_meaningful_action
  const lastAction = db.getFirstSync<{ last: string }>(
    `SELECT MAX(created_at) as last FROM (
       SELECT created_at FROM journal_entries WHERE is_deleted = 0
       UNION ALL SELECT created_at FROM mood_logs
       UNION ALL SELECT created_at FROM goal_updates
       UNION ALL SELECT started_at as created_at FROM conversations
     )`
  );
  const lastActionDate = lastAction?.last;
  const daysSince = lastActionDate
    ? Math.floor((Date.now() - new Date(lastActionDate).getTime()) / 86400000)
    : null;
  features.push({
    feature_name: 'days_since_last_meaningful_action',
    feature_value: daysSince,
    confidence_level: daysSince !== null ? 'high' : 'low',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  // app_opens_last_7d (from local_events domain='app')
  const appOpens = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM local_events WHERE domain = 'app' AND event_type = 'open' AND created_at >= ?`,
    [sevenDaysAgo]
  );
  features.push({
    feature_name: 'app_opens_last_7d',
    feature_value: appOpens?.cnt ?? 0,
    confidence_level: 'medium',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  // journal_days_last_7d
  const journalDays = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(DISTINCT DATE(created_at)) as cnt FROM journal_entries WHERE is_deleted = 0 AND created_at >= ?`,
    [sevenDaysAgo]
  );
  features.push({
    feature_name: 'journal_days_last_7d',
    feature_value: journalDays?.cnt ?? 0,
    confidence_level: 'high',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  // mood_logs_last_7d
  const moodLogs = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM mood_logs WHERE created_at >= ?`,
    [sevenDaysAgo]
  );
  features.push({
    feature_name: 'mood_logs_last_7d',
    feature_value: moodLogs?.cnt ?? 0,
    confidence_level: 'high',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  // goal_updates_last_7d
  const goalUpdates = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM goal_updates WHERE created_at >= ?`,
    [sevenDaysAgo]
  );
  features.push({
    feature_name: 'goal_updates_last_7d',
    feature_value: goalUpdates?.cnt ?? 0,
    confidence_level: 'high',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  // chat_sessions_last_7d
  const chatSessions = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM conversations WHERE started_at >= ?`,
    [sevenDaysAgo]
  );
  features.push({
    feature_name: 'chat_sessions_last_7d',
    feature_value: chatSessions?.cnt ?? 0,
    confidence_level: 'high',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  // ── Goals ─────────────────────────────────────────────────────────────────

  const activeGoals = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM goals WHERE status = 'active' AND is_archived = 0`
  );
  features.push({
    feature_name: 'active_goals_count',
    feature_value: activeGoals?.cnt ?? 0,
    confidence_level: 'high',
  });

  // active goals without update in last 7 days
  const goalsWithoutUpdate = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM goals g
     WHERE g.status = 'active' AND g.is_archived = 0
       AND NOT EXISTS (
         SELECT 1 FROM goal_updates gu
         WHERE gu.goal_id = g.id AND gu.created_at >= ?
       )`,
    [sevenDaysAgo]
  );
  features.push({
    feature_name: 'active_goals_without_update_last_7d',
    feature_value: goalsWithoutUpdate?.cnt ?? 0,
    confidence_level: 'high',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  // overdue milestones
  const overdueMilestones = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM goal_milestones
     WHERE due_date < ? AND completed_at IS NULL`,
    [now]
  );
  features.push({
    feature_name: 'overdue_milestones_count',
    feature_value: overdueMilestones?.cnt ?? 0,
    confidence_level: 'high',
  });

  // upcoming deadlines next 14 days
  const nextTwoWeeks = new Date();
  nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);
  const upcomingDeadlines = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM goal_milestones
     WHERE due_date >= ? AND due_date <= ? AND completed_at IS NULL`,
    [now, nextTwoWeeks.toISOString()]
  );
  features.push({
    feature_name: 'upcoming_deadlines_next_14d',
    feature_value: upcomingDeadlines?.cnt ?? 0,
    confidence_level: 'high',
    window_start: now,
    window_end: nextTwoWeeks.toISOString(),
  });

  // milestones completed last 14 days
  const milestonesCompleted = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM goal_milestones WHERE completed_at >= ?`,
    [fourteenDaysAgo]
  );
  features.push({
    feature_name: 'milestones_completed_last_14d',
    feature_value: milestonesCompleted?.cnt ?? 0,
    confidence_level: 'high',
    window_start: fourteenDaysAgo,
    window_end: now,
  });

  // average goal progress velocity (last 14 days)
  const progressUpdates = db.getAllSync<{ progress: number }>(
    `SELECT progress FROM goal_updates WHERE created_at >= ? AND progress IS NOT NULL ORDER BY created_at ASC`,
    [fourteenDaysAgo]
  );
  let velocity: number | null = null;
  if (progressUpdates.length >= 2) {
    const values = progressUpdates.map((r) => r.progress);
    velocity = linear_slope(values);
  }
  features.push({
    feature_name: 'average_goal_progress_velocity_14d',
    feature_value: velocity,
    confidence_level: velocity !== null ? 'medium' : 'low',
    window_start: fourteenDaysAgo,
    window_end: now,
  });

  // ── Mood / Energy / Stress ─────────────────────────────────────────────────

  const moodData = db.getAllSync<{ mood: number; energy: number; stress: number }>(
    `SELECT mood, energy, stress FROM mood_logs WHERE created_at >= ? ORDER BY created_at ASC`,
    [sevenDaysAgo]
  );

  const avgMood = moodData.length > 0
    ? moodData.reduce((s, r) => s + r.mood, 0) / moodData.length
    : null;
  features.push({
    feature_name: 'avg_mood_7d',
    feature_value: avgMood,
    confidence_level: moodData.length >= 3 ? 'high' : moodData.length > 0 ? 'medium' : 'low',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  const avgEnergy = moodData.length > 0
    ? moodData.reduce((s, r) => s + r.energy, 0) / moodData.length
    : null;
  features.push({
    feature_name: 'avg_energy_7d',
    feature_value: avgEnergy,
    confidence_level: moodData.length >= 3 ? 'high' : moodData.length > 0 ? 'medium' : 'low',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  const avgStress = moodData.length > 0
    ? moodData.reduce((s, r) => s + r.stress, 0) / moodData.length
    : null;
  features.push({
    feature_name: 'avg_stress_7d',
    feature_value: avgStress,
    confidence_level: moodData.length >= 3 ? 'high' : moodData.length > 0 ? 'medium' : 'low',
    window_start: sevenDaysAgo,
    window_end: now,
  });

  // Slopes (last 5 mood logs)
  const last5Moods = db.getAllSync<{ mood: number; energy: number; stress: number }>(
    `SELECT mood, energy, stress FROM mood_logs ORDER BY created_at DESC LIMIT 5`
  ).reverse();

  const stressSlope = last5Moods.length >= 2 ? linear_slope(last5Moods.map((r) => r.stress)) : null;
  features.push({
    feature_name: 'stress_slope_5_logs',
    feature_value: stressSlope,
    confidence_level: last5Moods.length >= 5 ? 'high' : last5Moods.length >= 2 ? 'medium' : 'low',
  });

  const energySlope = last5Moods.length >= 2 ? linear_slope(last5Moods.map((r) => r.energy)) : null;
  features.push({
    feature_name: 'energy_slope_5_logs',
    feature_value: energySlope,
    confidence_level: last5Moods.length >= 5 ? 'high' : last5Moods.length >= 2 ? 'medium' : 'low',
  });

  // ── Notifications ─────────────────────────────────────────────────────────

  const notifSent = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM notification_log WHERE sent_at >= ?`,
    [fourteenDaysAgo]
  );
  const notifResponded = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM notification_log WHERE sent_at >= ? AND (opened_at IS NOT NULL OR acted_at IS NOT NULL)`,
    [fourteenDaysAgo]
  );
  const responseRate =
    notifSent?.cnt && notifSent.cnt > 0
      ? (notifResponded?.cnt ?? 0) / notifSent.cnt
      : null;
  features.push({
    feature_name: 'notification_response_rate_14d',
    feature_value: responseRate,
    confidence_level: (notifSent?.cnt ?? 0) >= 3 ? 'high' : (notifSent?.cnt ?? 0) > 0 ? 'medium' : 'low',
    window_start: fourteenDaysAgo,
    window_end: now,
  });

  return features;
}
