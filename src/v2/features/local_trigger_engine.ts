/**
 * Local trigger engine — evaluates triggers using only local feature data.
 * No network call required. Used for local notifications and pre-checks.
 */

import type { FeatureItem } from '../api/types';

export interface LocalTriggerResult {
  trigger: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

function getFeature(features: FeatureItem[], name: string): number | null {
  const f = features.find((f) => f.feature_name === name);
  return f?.feature_value ?? null;
}

export function evaluateLocalTriggers(features: FeatureItem[]): LocalTriggerResult[] {
  const results: LocalTriggerResult[] = [];

  const daysSince = getFeature(features, 'days_since_last_meaningful_action');
  const avgStress = getFeature(features, 'avg_stress_7d');
  const stressSlope = getFeature(features, 'stress_slope_5_logs');
  const goalsWithoutUpdate = getFeature(features, 'active_goals_without_update_last_7d');

  // ── Inactivity ─────────────────────────────────────────────────────────────
  if (daysSince !== null && daysSince >= 2) {
    results.push({
      trigger: 'inactivity',
      reason: `No meaningful activity in ${daysSince} day${daysSince === 1 ? '' : 's'}`,
      severity: daysSince >= 5 ? 'high' : daysSince >= 3 ? 'medium' : 'low',
    });
  }

  // ── Stress Warning ─────────────────────────────────────────────────────────
  if (avgStress !== null && avgStress >= 3.5 && stressSlope !== null && stressSlope > 0.3) {
    results.push({
      trigger: 'stress_warning',
      reason: `Stress averaging ${avgStress.toFixed(1)}/5 and rising`,
      severity: avgStress >= 4.5 ? 'high' : 'medium',
    });
  }

  // ── Goal Drift ─────────────────────────────────────────────────────────────
  if (goalsWithoutUpdate !== null && goalsWithoutUpdate >= 1 && daysSince !== null && daysSince >= 3) {
    results.push({
      trigger: 'goal_drift',
      reason: `${goalsWithoutUpdate} goal${goalsWithoutUpdate === 1 ? '' : 's'} without an update for ${daysSince} days`,
      severity: goalsWithoutUpdate >= 3 ? 'high' : 'medium',
    });
  }

  return results;
}
