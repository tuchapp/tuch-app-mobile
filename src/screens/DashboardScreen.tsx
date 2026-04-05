/**
 * DashboardScreen — Main overview after login
 *
 * API: GET /api/v1/dashboard
 *
 * Sections:
 *  - Timezone-aware greeting + coach focus
 *  - Active goals (first 4) with progress bars and check-in status
 *  - Latest journal entry preview
 *  - Latest mood log
 */
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet } from "../lib/api";
import { SkeletonScreen } from "../components/Skeleton";
import { formatDate, formatRelativeDate } from "../utils/format-date";
import type { DashboardPayload, ApiEnvelope, Goal } from "../types/api-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreetingForTimezone(timezone?: string): string {
  const resolved = timezone || "UTC";
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: resolved,
      }).format(new Date()),
    );
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  } catch {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }
}

function formatFrequency(f?: string | null): string {
  if (!f) return "";
  return f.replaceAll("_", " ");
}

function formatCheckInStatus(status?: string | null): string {
  if (!status) return "";
  const labels: Record<string, string> = {
    completed: "Completed",
    missed: "Missed",
    partial: "Partial",
    skipped: "Skipped",
  };
  return labels[status] || status;
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${clamped}%` }]} />
    </View>
  );
}

function GoalCard({ goal, timezone }: { goal: Goal; timezone?: string }) {
  const hasSchedule = !!goal.accountability_frequency;
  const hasDate = !!goal.target_date;

  return (
    <View style={s.card}>
      {/* Status pill */}
      <View style={s.goalHeaderRow}>
        <View style={[s.pill, goal.status === "active" && s.pillActive]}>
          <Text style={[s.pillText, goal.status === "active" && s.pillTextActive]}>
            {goal.status === "active" ? "Active" : goal.status}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={s.goalTitle}>{goal.title}</Text>

      {/* Progress */}
      <ProgressBar percent={goal.progress_percent} />
      <Text style={s.progressLabel}>{goal.progress_percent}% complete</Text>

      {/* Frequency + target date */}
      {(hasSchedule || hasDate) && (
        <Text style={s.goalMeta}>
          {hasSchedule ? `Check-ins: ${formatFrequency(goal.accountability_frequency)}` : ""}
          {hasSchedule && hasDate ? " \u00B7 " : ""}
          {hasDate ? `Ends ${formatDate(goal.target_date, timezone)}` : ""}
        </Text>
      )}

      {/* Last check-in status */}
      {hasSchedule && goal.last_check_in_status && (
        <Text style={s.goalMeta}>
          Last check-in:{" "}
          <Text style={s.bold}>{formatCheckInStatus(goal.last_check_in_status)}</Text>
          {goal.latest_check_in_response?.created_at
            ? ` \u00B7 ${timeAgo(goal.latest_check_in_response.created_at)}`
            : ""}
        </Text>
      )}

      {/* Awaiting reply */}
      {hasSchedule &&
        !goal.last_check_in_status &&
        goal.latest_check_in_notification && (
          <Text style={s.goalMeta}>
            Check-in sent {timeAgo(goal.latest_check_in_notification.created_at)} — awaiting
            your reply
          </Text>
        )}

      {/* Setup nudge */}
      {goal.status === "active" && (!hasDate || !hasSchedule) && (
        <Text style={s.nudge}>
          {!hasDate && !hasSchedule
            ? "Set end date & check-in schedule"
            : !hasDate
              ? "Set end date"
              : "Set check-in schedule"}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function DashboardScreen() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const envelope = await apiGet<ApiEnvelope<DashboardPayload>>("/api/v1/dashboard");
      setData(envelope.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchDashboard();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <SkeletonScreen />
      </SafeAreaView>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centered}>
          <Text style={s.errorTitle}>Something went wrong</Text>
          <Text style={s.errorBody}>{error ?? "Unable to load dashboard data."}</Text>
          <Pressable style={s.retryButton} onPress={onRefresh}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const displayName =
    data.profile?.display_name ||
    data.profile?.first_name ||
    data.user.email ||
    "there";
  const greeting = getGreetingForTimezone(data.user.timezone);
  const coachPrompt =
    data.behavior?.coach_focus?.[0] ||
    data.behavior?.latest_intervention?.notification?.body ||
    "What is the next concrete step toward your most important goal?";
  const goals = data.goals.slice(0, 4);
  const latestJournal = data.journals[0] ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7e22ce"
            colors={["#7e22ce"]}
          />
        }
      >
        {/* ── Greeting + Coach focus ── */}
        <SectionHeader eyebrow="Today" title={`${greeting}, ${displayName}`} />
        <View style={s.card}>
          <Text style={s.coachText}>{coachPrompt}</Text>
        </View>

        {/* ── Active goals ── */}
        <SectionHeader eyebrow="Accountability" title="Active goals" />
        {goals.length > 0 ? (
          goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} timezone={data.user.timezone} />
          ))
        ) : (
          <View style={s.card}>
            <Text style={s.emptyText}>No active goals yet. Create your first goal to get started.</Text>
          </View>
        )}

        {/* ── Latest journal ── */}
        <SectionHeader eyebrow="Latest entry" title="Journal" />
        {latestJournal ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{latestJournal.title || "Untitled entry"}</Text>
            <Text style={s.cardBody} numberOfLines={3}>
              {latestJournal.entry_text}
            </Text>
            <Text style={s.cardTimestamp}>
              {formatRelativeDate(latestJournal.created_at, data.user.timezone)}
            </Text>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.emptyText}>Your latest journal entry appears here.</Text>
          </View>
        )}

        {/* ── Latest mood ── */}
        <SectionHeader eyebrow="Recent signal" title="Mood" />
        {data.highlights.mood_summary.avg_mood > 0 ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>
              Mood {data.highlights.mood_summary.avg_mood.toFixed(1)}/5 {"\u00B7"} Energy{" "}
              {data.highlights.mood_summary.avg_energy.toFixed(1)}/5
            </Text>
            <Text style={s.cardBody}>
              Stress {data.highlights.mood_summary.avg_stress.toFixed(1)}/5
            </Text>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.emptyText}>Log a mood check-in.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  scrollContent: { padding: 24, paddingBottom: 40 },

  // Loading
  loadingText: { marginTop: 12, fontSize: 15, color: "#666" },

  // Error
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 8 },
  errorBody: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  retryButton: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Section header
  sectionHeader: { marginTop: 24, marginBottom: 8 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7e22ce",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#111" },

  // Card
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111", marginBottom: 4 },
  cardBody: { fontSize: 14, color: "#555", lineHeight: 20 },
  cardTimestamp: { fontSize: 12, color: "#999", marginTop: 8 },

  // Coach focus
  coachText: { fontSize: 15, color: "#444", lineHeight: 22 },

  // Goal card
  goalHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  goalTitle: { fontSize: 16, fontWeight: "600", color: "#111", marginBottom: 8 },
  goalMeta: { fontSize: 13, color: "#666", marginTop: 4 },
  bold: { fontWeight: "700" },
  nudge: { fontSize: 13, color: "#7e22ce", fontWeight: "500", marginTop: 8 },

  // Pill
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  pillActive: { backgroundColor: "#f3e8ff" },
  pillText: { fontSize: 12, fontWeight: "500", color: "#555" },
  pillTextActive: { color: "#7e22ce" },

  // Progress bar
  progressTrack: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: 6,
    backgroundColor: "#7e22ce",
    borderRadius: 3,
  },
  progressLabel: { fontSize: 12, color: "#888" },

  // Empty state
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", paddingVertical: 8 },
});
