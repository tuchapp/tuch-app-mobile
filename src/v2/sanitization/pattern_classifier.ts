/**
 * Pattern classifier — maps abstracted text + features to a behavioral pattern key.
 * Rule-based. Returns null if no confident match (text should be discarded).
 */

import type { FeatureItem, PatternRecord } from '../api/types';

function getFeature(features: FeatureItem[], name: string): number | null {
  return features.find((f) => f.feature_name === name)?.feature_value ?? null;
}

const PATTERN_RULES: Array<{
  key: string;
  test: (text: string, features: FeatureItem[]) => boolean;
  deriveValue: (text: string, features: FeatureItem[]) => Record<string, unknown>;
}> = [
  {
    key: 'ritual_adherence',
    test: (text) =>
      /\b(morning|evening|routine|ritual|habit|daily|each day|every day)\b/i.test(text),
    deriveValue: (text) => ({
      signal: text.length > 100 ? 'detailed_ritual' : 'brief_mention',
      sentiment: /miss|skip|forgot|didn't/i.test(text) ? 'missed' : 'maintained',
    }),
  },
  {
    key: 'consistency_trend',
    test: (_text, features) => {
      const journalDays = getFeature(features, 'journal_days_last_7d');
      const moodLogs = getFeature(features, 'mood_logs_last_7d');
      return journalDays !== null || moodLogs !== null;
    },
    deriveValue: (_text, features) => ({
      journal_days_7d: getFeature(features, 'journal_days_last_7d'),
      mood_logs_7d: getFeature(features, 'mood_logs_last_7d'),
    }),
  },
  {
    key: 'recovery_speed',
    test: (text) =>
      /\b(bounce back|recovered|back on track|fresh start|reset|trying again)\b/i.test(text),
    deriveValue: (text) => ({
      signal: 'recovery_language',
      text_fragment: text.slice(0, 50),
    }),
  },
  {
    key: 'initiation_resistance',
    test: (text) =>
      /\b(hard to start|can't begin|procrastinat|stuck|haven't started|don't know where)\b/i.test(text),
    deriveValue: () => ({ signal: 'initiation_blocked' }),
  },
  {
    key: 'goal_velocity',
    test: (_text, features) => getFeature(features, 'average_goal_progress_velocity_14d') !== null,
    deriveValue: (_text, features) => ({
      velocity: getFeature(features, 'average_goal_progress_velocity_14d'),
      active_goals: getFeature(features, 'active_goals_count'),
    }),
  },
  {
    key: 'milestone_completion_rate',
    test: (_text, features) => {
      const completed = getFeature(features, 'milestones_completed_last_14d');
      const overdue = getFeature(features, 'overdue_milestones_count');
      return completed !== null || overdue !== null;
    },
    deriveValue: (_text, features) => ({
      completed_14d: getFeature(features, 'milestones_completed_last_14d'),
      overdue: getFeature(features, 'overdue_milestones_count'),
    }),
  },
  {
    key: 'goal_abandonment_signal',
    test: (text) =>
      /\b(gave up|dropped|stopped|abandoned|no longer|quit|not worth|pointless)\b/i.test(text),
    deriveValue: () => ({ signal: 'abandonment_language' }),
  },
  {
    key: 'deadline_pressure_response',
    test: (text) =>
      /\b(deadline|due date|overdue|running out of time|crunch|behind schedule)\b/i.test(text),
    deriveValue: (text) => ({
      signal: /stress|anxious|worried|panic/i.test(text) ? 'stress_response' : 'neutral_acknowledgment',
    }),
  },
  {
    key: 'stress_trajectory',
    test: (_text, features) => getFeature(features, 'stress_slope_5_logs') !== null,
    deriveValue: (_text, features) => ({
      slope: getFeature(features, 'stress_slope_5_logs'),
      avg_stress: getFeature(features, 'avg_stress_7d'),
    }),
  },
  {
    key: 'energy_trend',
    test: (_text, features) => getFeature(features, 'energy_slope_5_logs') !== null,
    deriveValue: (_text, features) => ({
      slope: getFeature(features, 'energy_slope_5_logs'),
      avg_energy: getFeature(features, 'avg_energy_7d'),
    }),
  },
  {
    key: 'overwhelm_frequency',
    test: (text) =>
      /\b(overwhelm|too much|can't cope|drowning|buried|exhausted|burned out)\b/i.test(text),
    deriveValue: () => ({ signal: 'overwhelm_language' }),
  },
  {
    key: 'sentiment_slope',
    test: (_text, features) => {
      const moodSlope = getFeature(features, 'avg_mood_7d');
      return moodSlope !== null;
    },
    deriveValue: (_text, features) => ({
      avg_mood: getFeature(features, 'avg_mood_7d'),
    }),
  },
  {
    key: 'channel_responsiveness',
    test: (_text, features) =>
      getFeature(features, 'notification_response_rate_14d') !== null,
    deriveValue: (_text, features) => ({
      response_rate: getFeature(features, 'notification_response_rate_14d'),
    }),
  },
  {
    key: 'timing_preference',
    test: (text) =>
      /\b(morning|evening|afternoon|night|midnight|noon|early|late)\b/i.test(text),
    deriveValue: (text) => {
      const hour = /morning/i.test(text) ? 'morning' :
        /evening|night/i.test(text) ? 'evening' :
        /afternoon/i.test(text) ? 'afternoon' : 'unspecified';
      return { preferred_time_of_day: hour };
    },
  },
  {
    key: 'tone_affinity',
    test: (text) =>
      /\b(love|enjoy|prefer|like|appreciate|feel good|helpful|useful|motivat)\b/i.test(text),
    deriveValue: (text) => ({
      positive_signal: text.slice(0, 60),
    }),
  },
  {
    key: 'prompt_fatigue',
    test: (text) =>
      /\b(annoying|too many|stop|ignore|dismiss|not helpful|don't want)\b/i.test(text),
    deriveValue: () => ({ signal: 'fatigue_language' }),
  },
];

export function classify(
  abstractedText: string,
  features: FeatureItem[]
): PatternRecord | null {
  for (const rule of PATTERN_RULES) {
    if (rule.test(abstractedText, features)) {
      const value = rule.deriveValue(abstractedText, features);
      // Confidence: higher if both text and features match
      const confidence =
        rule.test(abstractedText, []) && features.length > 0 ? 0.85 :
        rule.test(abstractedText, []) ? 0.75 : 0.70;

      return {
        pattern_key: rule.key,
        pattern_value: value,
        confidence,
        source_count: 1,
        window_days: 7,
      };
    }
  }
  return null;
}
