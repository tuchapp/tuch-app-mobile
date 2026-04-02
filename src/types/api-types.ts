export type ApiEnvelope<T> = {
  data: T;
  meta: Record<string, unknown>;
};

export type GoalClarityResult = {
  title: string | null;
  objective: string | null;
  suggested_frequency: string | null;
  confidence: number;
  needs_more_info: boolean;
  clarifying_question: string | null;
};

export type Goal = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status: string;
  priority: string;
  progress_percent: number;
  target_date?: string | null;
  accountability_frequency?: string | null;
  custom_accountability_schedule?: string | null;
  ai_title?: string | null;
  ai_objective?: string | null;
  raw_user_input?: string | null;
  ai_clarity_accepted?: boolean | null;
  /** Enriched by dashboard — latest check-in notification for this goal. */
  latest_check_in_notification?: { id: string; channel: string; status: string; created_at: string; delivered_at?: string | null } | null;
  /** Enriched by dashboard — latest check-in response (goal_update). */
  latest_check_in_response?: { id: string; goal_id: string; note?: string | null; metadata?: Record<string, unknown> | null; created_at: string } | null;
  /** Enriched by dashboard — extracted response status: completed, missed, partial, skipped. */
  last_check_in_status?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type GoalMilestone = {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
};

export type GoalDetail = Goal & {
  milestones: GoalMilestone[];
  updates: Array<Record<string, unknown>>;
};

export type AccountabilityFrequency =
  | "daily"
  | "weekdays"
  | "twice_weekly"
  | "weekly"
  | "custom";

export type GoalSuggestionRecord = {
  id: string;
  user_id: string;
  source_type: "coach_chat" | "journal_entry";
  source_id: string;
  candidate_title: string;
  candidate_description?: string | null;
  confidence_score: number;
  inferred_start_date?: string | null;
  inferred_target_date?: string | null;
  inferred_category?: string | null;
  suggested_reason?: string | null;
  suggested_check_in_frequency?: AccountabilityFrequency | null;
  suggestion_status: "pending" | "accepted" | "dismissed" | "rejected" | "expired";
  matched_existing_goal_id?: string | null;
  accepted_goal_id?: string | null;
  detection_metadata?: {
    duplicate_match_possible?: boolean;
    explanation?: string | null;
    custom_accountability_schedule?: string | null;
    confirmation_ready_for_goal_creation?: boolean;
    snoozed_at?: string | null;
  } | null;
  last_presented_at?: string | null;
  accepted_at?: string | null;
  dismissed_at?: string | null;
  rejected_at?: string | null;
  expired_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalSuggestionDecisionUpdate = {
  /** accept = user confirmed with dates; quick_accept = one-tap using AI-inferred values */
  decision: "accept" | "quick_accept" | "dismiss" | "reject" | "not_now";
  start_date?: string | null;
  target_date?: string | null;
  accountability_frequency?: AccountabilityFrequency | null;
  /** Comma-separated day codes, e.g. "mon,wed,fri".  Set when the user picks specific days. */
  custom_accountability_schedule?: string | null;
};

// ---------------------------------------------------------------------------
// Two-way accountability messaging
// ---------------------------------------------------------------------------

export type PendingAccountabilityAction = {
  id: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  policy_reason: string;
  related_goal_id: string | null;
  expires_at: string | null;
  created_at: string;
};

export type PendingActionDecision = "confirm" | "reject";

export type CheckInRecord = {
  id: string;
  goal_id: string;
  response_status: "completed" | "missed" | "partial" | "skipped" | null;
  check_in_date: string | null;
  channel: "sms" | "email" | null;
  note: string | null;
  created_at: string;
};

export type InboundMessageRecord = {
  id: string;
  source_channel: "sms" | "email";
  sender_address: string;
  received_at: string;
  normalized_body: string | null;
  related_notification_id: string | null;
  related_goal_id: string | null;
  parsed_intent_type: string | null;
  parse_confidence: number | null;
  parse_layer: "layer1_deterministic" | "layer2_structured" | "layer3_ai" | "none" | null;
  action_decision: string | null;
  action_applied: boolean;
  action_applied_at: string | null;
  created_at: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    [key: string]: unknown;
  };
};

export type JournalEntry = {
  id: string;
  title?: string | null;
  entry_text: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
};

export type MoodLog = {
  id: string;
  mood_value: number;
  energy_value: number;
  stress_value: number;
  note?: string | null;
  created_at: string;
};

export type OnboardingResponse = {
  id: string;
  question_key: string;
  response_text?: string | null;
  response_json?: unknown;
  created_at: string;
};

export type MoodSummary = {
  range: string;
  avg_mood: number;
  avg_energy: number;
  avg_stress: number;
  trend: {
    mood: string;
    energy: string;
    stress: string;
  };
};

export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: {
    memory_context_used?: boolean;
    follow_up_suggestions?: string[];
  } | null;
};

export type ChatSession = {
  id: string;
  conversation_id?: string;
  status: string;
  started_at: string;
  ended_at?: string | null;
  updated_at?: string;
  messages?: ChatMessage[];
  summary?: {
    summary_text: string;
    commitments?: Array<{ label: string; text: string }>;
    extracted_themes?: string[];
  } | null;
};

export type WeeklyReview = {
  id: string;
  title?: string | null;
  period_start: string;
  period_end: string;
  summary_text: string;
  recommendations: string[];
  created_at: string;
  delivery_status?: Record<string, unknown> | null;
};

export type DailySummary = {
  id: string;
  title?: string | null;
  summary_date: string;
  summary_text: string;
  why_this_matters?: string | null;
  recommendations: string[];
  activity_count: number;
  created_at: string;
};

export type MemoryItem = {
  id: string;
  memory_type: "working" | "episodic" | "semantic";
  memory_text: string;
  explanation_text?: string | null;
  importance_score: number;
  is_user_visible: boolean;
  created_at: string;
};

export type AuthContext = {
  user: {
    id: string;
    email: string;
    timezone: string;
    onboarding_status: string;
    is_active: boolean;
  };
  profile?: {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
  } | null;
  preferences?: {
    coaching_tone?: string | null;
    preferred_message_length?: string | null;
    summary_frequency?: string | null;
  } | null;
};

export type UserAccount = {
  id: string;
  email: string;
  phone?: string | null;
  timezone: string;
  onboarding_status: string;
  is_active: boolean;
};

export type UserProfile = {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
};

export type UserPreferences = {
  user_id: string;
  coaching_tone?: string | null;
  preferred_message_length?: string | null;
  preferred_check_in_time?: string | null;
  sms_opt_in?: boolean;
  email_opt_in?: boolean;
  push_opt_in?: boolean;
  summary_frequency?: string | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
};

export type ConsentRecord = {
  id: string;
  consent_type: string;
  consent_status: string;
  source?: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  channel: "in_app" | "email" | "sms" | "push";
  /** Classification: goal_auto_created, goal_check_in_reminder, etc. */
  type?: string | null;
  subject?: string | null;
  body: string;
  status: string;
  /** Domain entity this notification is about, e.g. "goal". */
  entity_type?: string | null;
  /** UUID of the entity this notification is about. */
  entity_id?: string | null;
  /** Arbitrary structured payload, e.g. goal_id, custom_schedule. */
  metadata?: Record<string, unknown> | null;
  created_at: string;
  delivered_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
};

export type NotificationDeliveryAttempt = {
  id: string;
  notification_id: string;
  provider_name: string;
  provider_response?: Record<string, unknown> | null;
  attempt_number: number;
  attempted_at: string;
  notification_channel?: string | null;
  notification_status?: string | null;
  notification_subject?: string | null;
  failure_reason?: string | null;
};

export type NotificationDiagnostics = {
  total_notifications: number;
  status_counts: Record<string, number>;
  channel_counts: Record<string, number>;
  recent_attempt_count: number;
  recent_attempt_source_notifications: number;
  latest_failed_notification?: NotificationItem | null;
  latest_delivered_notification?: NotificationItem | null;
  last_attempt_at?: string | null;
};

export type DashboardPayload = {
  user: {
    id: string;
    email: string;
    timezone: string;
    onboarding_status: string;
  };
  profile?: {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
  } | null;
  preferences?: UserPreferences | null;
  highlights: {
    active_goal_count: number;
    average_goal_progress: number;
    journal_count: number;
    mood_summary: {
      avg_mood: number;
      avg_energy: number;
      avg_stress: number;
    };
  };
  behavior: {
    momentum: {
      label: string;
      score: number;
    };
    risk: {
      label: string;
      score: number;
    };
    scores: {
      consistency: number;
      disengagement_risk: number;
      goal_drift: number;
      stress_escalation: number;
      recovery: number;
      engagement: number;
    };
    coach_focus: string[];
    latest_intervention?: {
      trigger_type?: string | null;
      outcome?: string | null;
      evaluated_at?: string | null;
      notification?: NotificationItem | null;
    } | null;
  };
  goals: Goal[];
  journals: JournalEntry[];
  latest_daily_summary?: DailySummary | null;
  latest_review?: WeeklyReview | null;
  visible_memories: MemoryItem[];
  pending_goal_suggestions: Array<{
    id: string;
    candidate_title: string;
    candidate_description?: string | null;
    confidence_score: number;
    source_type: "coach_chat" | "journal_entry";
    source_id: string;
    updated_at?: string | null;
  }>;
};

export type DashboardTimelineItem = {
  id: string;
  type: "goal" | "journal" | "mood" | "review" | "summary" | "intervention";
  title: string;
  summary: string;
  created_at: string;
};

export type PersonalizationInsights = {
  items: string[];
  framing?: string | null;
  dominant_state?: string | null;
  last_updated_at?: string | null;
};

export type AdminMetrics = {
  active_users_7d: number;
  goal_creation_7d: number;
  journal_entries_7d: number;
  goal_completion_rate: number;
  weekly_review_open_rate: number;
  intervention_reengagement_rate: number;
  weekly_reviews_generated_7d: number;
  class_effectiveness: Array<{
    name: string;
    run_count: number;
    meaningful_rate: number;
    effectiveness_score: number;
  }>;
  channel_effectiveness: Array<{
    name: string;
    run_count: number;
    meaningful_rate: number;
    effectiveness_score: number;
  }>;
  tone_effectiveness: Array<{
    name: string;
    run_count: number;
    meaningful_rate: number;
    effectiveness_score: number;
  }>;
  timing_effectiveness: Array<{
    name: string;
    run_count: number;
    meaningful_rate: number;
    effectiveness_score: number;
  }>;
  false_positive_triggers: Array<{
    name: string;
    run_count: number;
    false_positive_rate: number;
    meaningful_rate: number;
  }>;
  trigger_quality: Array<{
    name: string;
    run_count: number;
    low_confidence_rate: number;
    false_positive_rate: number;
    average_trigger_score: number;
    average_candidate_score: number;
  }>;
  suppression_reasons: Array<{
    name: string;
    count: number;
  }>;
  state_class_effectiveness: Array<{
    state: string;
    name: string;
    run_count: number;
    meaningful_rate: number;
    effectiveness_score: number;
  }>;
  state_tone_effectiveness: Array<{
    state: string;
    name: string;
    run_count: number;
    meaningful_rate: number;
    effectiveness_score: number;
  }>;
  fatigue_effectiveness: Array<{
    name: string;
    run_count: number;
    meaningful_rate: number;
    effectiveness_score: number;
    average_fatigue_score: number;
  }>;
  fatigue_distribution: {
    low: number;
    moderate: number;
    high: number;
    average_score: number;
  };
  fatigue_trend: {
    label: string;
    recent_average_score: number;
    previous_average_score: number;
    delta: number;
  };
  ai_backfill_status: {
    memory_explanations_missing: number;
    daily_summary_presentations_missing: number;
  };
  goal_suggestion_funnel: {
    created_30d: number;
    presented_30d: number;
    accepted_30d: number;
    dismissed_30d: number;
    rejected_30d: number;
    not_now_30d: number;
    converted_30d: number;
    pending_current: number;
    acceptance_rate: number;
    conversion_rate: number;
    status_counts: Array<{
      name: string;
      count: number;
    }>;
    source_counts: Array<{
      name: string;
      count: number;
    }>;
  };
  ai_generation_health: {
    lineage_events_30d: number;
    generated_events_30d: number;
    reused_events_30d: number;
    fallback_events_30d: number;
    fallback_rate: number;
    weekly_reviews_cache_ready: number;
    daily_summaries_cache_ready: number;
    conversation_summaries_cache_ready: number;
    journals_cache_ready: number;
    memory_explanations_ready: number;
    reuse_by_task: Array<{
      name: string;
      generated_count: number;
      reused_count: number;
      reuse_rate: number;
    }>;
    fallback_by_task: Array<{
      name: string;
      fallback_count: number;
      total_count: number;
      fallback_rate: number;
    }>;
    validation_statuses: Array<{
      name: string;
      count: number;
    }>;
    top_tasks: Array<{
      name: string;
      count: number;
    }>;
    providers: Array<{
      name: string;
      count: number;
    }>;
  };
  fresh_policy_count: number;
  stale_policy_count: number;
};

export type AdminUserSearchResult = {
  id: string;
  email: string;
  phone?: string | null;
  timezone: string;
  onboarding_status: string;
  is_active: boolean;
  created_at: string;
  goal_count: number;
  active_goal_count: number;
  journal_count: number;
  mood_count: number;
  last_event_at?: string | null;
};

export type AdminUserOverview = {
  user: UserAccount | null;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    username?: string | null;
    bio?: string | null;
  } | null;
  preferences?: UserPreferences | null;
  goal_count: number;
  journal_count: number;
  mood_count: number;
  conversation_count: number;
  latest_daily_summary?: DailySummary | null;
  recent_daily_summaries: DailySummary[];
  latest_review?: WeeklyReview | null;
  recent_notifications: NotificationItem[];
  notification_diagnostics: NotificationDiagnostics;
  recent_delivery_attempts: NotificationDeliveryAttempt[];
  recent_memories: MemoryItem[];
  recent_signals: Array<{
    id: string;
    signal_type: string;
    score: number;
    explanation?: string | null;
    detected_at: string;
  }>;
  recent_interventions: InterventionRun[];
  recent_events: Array<{
    id: string;
    event_name: string;
    entity_type?: string | null;
    created_at: string;
  }>;
  goal_suggestions: {
    created_30d: number;
    presented_30d: number;
    accepted_30d: number;
    dismissed_30d: number;
    rejected_30d: number;
    not_now_30d: number;
    converted_30d: number;
    pending_current: number;
    acceptance_rate: number;
    conversion_rate: number;
    status_counts: Array<{
      name: string;
      count: number;
    }>;
    source_counts: Array<{
      name: string;
      count: number;
    }>;
    recent_suggestions: Array<{
      id: string;
      candidate_title: string;
      source_type: string;
      suggestion_status: string;
      confidence_score: number;
      accepted_goal_id?: string | null;
      last_presented_at?: string | null;
      updated_at?: string | null;
    }>;
  };
  ai_generation: {
    generated_events_30d: number;
    reused_events_30d: number;
    fallback_events_30d: number;
    reuse_by_task: Array<{
      name: string;
      generated_count: number;
      reused_count: number;
      reuse_rate: number;
    }>;
    fallback_by_task: Array<{
      name: string;
      fallback_count: number;
      total_count: number;
      fallback_rate: number;
    }>;
    validation_statuses: Array<{
      name: string;
      count: number;
    }>;
    recent_activity: Array<{
      task_key: string;
      outcome: string;
      created_at?: string | null;
    }>;
    cache_ready: {
      weekly_reviews: number;
      daily_summaries: number;
      journals: number;
      conversation_summaries: number;
      memory_explanations: number;
    };
  };
};

export type InterventionRule = {
  id: string;
  rule_name: string;
  trigger_type: string;
  channel: string;
  is_active: boolean;
  priority: number;
  rule_definition: {
    signal?: string;
    threshold?: number;
    cadence_hours?: number;
  };
};

export type InterventionRun = {
  id: string;
  trigger_type: string;
  outcome: string;
  generated_content?: string | null;
  evaluated_at: string;
  rule?: InterventionRule | null;
};

export type AdminRulesResponse = {
  data: InterventionRule[];
  meta: {
    total_rules?: number;
    active_rules?: number;
    channels?: Record<string, number>;
    triggers?: Record<string, number>;
  };
};

export type AdminInterventionsResponse = {
  data: InterventionRun[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    active_rule_count?: number;
    outcomes?: Record<string, number>;
  };
};

export type AdminJob = {
  id: string;
  job_type: string;
  status: string;
  payload?: Record<string, unknown>;
  priority: number;
  attempts: number;
  max_attempts: number;
  available_at: string;
  started_at?: string | null;
  deadline_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  dead_lettered_at?: string | null;
  last_error?: string | null;
  failure_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
};

export type AdminJobsResponse = {
  data: AdminJob[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    status_counts?: Record<string, number>;
    job_type_counts?: Record<string, number>;
    category_counts?: Record<string, number>;
    backlog_by_category?: Record<string, number>;
    backlog_by_role?: Record<string, number>;
    retrying_jobs?: number;
    dead_lettered_jobs?: number;
    timed_out_processing_jobs?: number;
    oldest_queued_age_minutes?: number;
    oldest_processing_age_minutes?: number;
    average_queued_age_minutes?: number;
    average_processing_age_minutes?: number;
    completed_last_24h?: number;
    completed_last_24h_by_role?: Record<string, number>;
    failed_last_24h?: number;
    dead_lettered_last_24h?: number;
    average_completion_duration_minutes_24h?: number;
    incident_counts?: Array<{
      name: string;
      count: number;
    }>;
    recent_incidents?: Array<{
      id?: string | null;
      action: string;
      job_id?: string | null;
      job_type: string;
      job_category: string;
      status?: string | null;
      reason?: string | null;
      attempts?: number;
      max_attempts?: number;
      created_at?: string | null;
    }>;
  };
};

export type AdminAuditLog = {
  id: string;
  actor_user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at: string;
};

export type AdminAuditLogsResponse = {
  data: AdminAuditLog[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    action_counts?: Record<string, number>;
    entity_counts?: Record<string, number>;
  };
};

export type AdminUsersResponse = {
  data: AdminUserSearchResult[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    query?: string;
  };
};

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export type HabitLoop = {
  id: string;
  user_id: string;
  name: string;
  cue: string | null;
  routine: string | null;
  reward: string | null;
  is_positive: boolean;
  is_active: boolean;
  streak: number;
  best_streak: number;
  last_logged_at: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export type ExerciseCompletion = {
  id: string;
  user_id: string;
  exercise_type: string;
  exercise_name: string;
  duration_seconds: number;
  ambient_sound: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Reflections
// ---------------------------------------------------------------------------

export type StructuredReflection = {
  id: string;
  user_id: string;
  reflection_type: "daily" | "weekly" | "monthly";
  responses: Record<string, string>;
  period_label: string;
  ai_summary: string | null;
  ai_patterns: string[] | null;
  created_at: string;
};

