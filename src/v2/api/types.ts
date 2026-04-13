/** V2 API request/response type definitions. */

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export interface AgentRegisterRequest {
  agent_id: string;
  stripe_customer_id: string;
  tier?: string;
}

export interface AgentRegisterResponse {
  agent_id: string;
  tier: string;
  status: string;
  registered_at: string;
}

export interface AgentStatusResponse {
  agent_id: string;
  tier: string;
  status: string;
  registered_at: string;
  last_sync_at?: string;
  subscription_valid_until?: string;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export interface PatternRecord {
  pattern_key: string;
  pattern_value: Record<string, unknown>;
  confidence: number;
  source_count?: number;
  window_days?: number;
}

export interface MemorySyncRequest {
  patterns: PatternRecord[];
}

export interface MemorySyncResponse {
  upserted: number;
}

export interface MemoryItem {
  id: string;
  pattern_key: string;
  pattern_value: Record<string, unknown>;
  confidence: number;
  source_count: number;
  window_days: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryListResponse {
  items: MemoryItem[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export interface FeatureItem {
  feature_name: string;
  feature_value?: number | null;
  feature_json?: Record<string, unknown> | null;
  confidence_level?: string;
  window_start?: string;
  window_end?: string;
}

export interface FeatureSyncRequest {
  features: FeatureItem[];
}

export interface FeatureSyncResponse {
  stored: number;
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export interface SignalSet {
  consistency_score: number;
  goal_drift_score: number;
  stress_escalation_score: number;
  disengagement_risk_score: number;
  recovery_score: number;
  dominant_state: string;
}

export interface SignalSetResponse {
  signal_set: SignalSet;
  computed_at: string;
}

// ---------------------------------------------------------------------------
// Brain Query
// ---------------------------------------------------------------------------

export interface BrainQueryRequest {
  query_type: string;
  sanitized_context: Record<string, unknown>;
}

export interface BrainQueryResponse {
  /** Field name matches backend BrainQueryResponse.response_text */
  response_text: string;
  query_type: string;
  follow_up_suggestions?: string[];
  memory_context_used?: boolean;
  tokens_used?: number;
}

// ---------------------------------------------------------------------------
// Interventions
// ---------------------------------------------------------------------------

export interface InterventionEvaluateResponse {
  should_intervene: boolean;
  intervention_class?: string;
  recommended_tone?: string;
  trigger_reason?: string;
}

export interface InterventionContentRequest {
  intervention_class: string;
  tone: string;
  sanitized_context: Record<string, unknown>;
}

export interface InterventionContentResponse {
  title: string;
  body: string;
  cta: string;
  intervention_run_id: string;
}

export interface OutcomeReportRequest {
  outcome: 'opened' | 'dismissed' | 'acted' | 'ignored';
  time_to_respond_seconds?: number;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export interface PreferencesSyncRequest {
  preferred_channel_rank?: string[];
  preferred_tone_rank?: string[];
  best_send_window?: Record<string, unknown>;
  class_preference_overrides?: Record<string, unknown>;
}
