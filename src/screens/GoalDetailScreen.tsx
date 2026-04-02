/**
 * GoalDetailScreen -- Single goal view with milestones and check-ins
 *
 * API endpoints:
 *  - GET   /api/v1/goals/{goalId}
 *  - PATCH /api/v1/goals/{goalId}/milestones/{id}
 */
import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { apiGet, apiPatch } from "../lib/api";
import { formatDate } from "../utils/format-date";
import type { GoalDetail, CheckInRecord } from "../types/api-types";
import type { GoalsStackParamList } from "../navigation/MainTabs";

type Props = NativeStackScreenProps<GoalsStackParamList, "GoalDetail">;

const STATUS_PILL_COLOR: Record<string, string> = {
  completed: "#16a34a",
  missed: "#dc2626",
  partial: "#f59e0b",
  skipped: "#6b7280",
};

export function GoalDetailScreen({ route, navigation }: Props) {
  const { goalId } = route.params;

  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingMilestone, setTogglingMilestone] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [goalRes, ciRes] = await Promise.all([
        apiGet<{ data: GoalDetail }>(`/api/v1/goals/${goalId}`),
        apiGet<{ data: CheckInRecord[] }>(`/api/v1/goals/${goalId}/check-ins`).catch(
          () => ({ data: [] as CheckInRecord[] }),
        ),
      ]);
      setGoal(goalRes.data);
      setCheckIns(ciRes.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData]),
  );

  async function toggleMilestone(milestoneId: string, completed: boolean) {
    setTogglingMilestone(milestoneId);
    try {
      await apiPatch(`/api/v1/goals/${goalId}/milestones/${milestoneId}`, {
        is_completed: !completed,
      });
      fetchData();
    } catch {
      // silent
    } finally {
      setTogglingMilestone(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <ActivityIndicator size="large" color="#7e22ce" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={s.safeArea}>
        <Text style={[s.muted, { textAlign: "center", marginTop: 40 }]}>
          Goal not found.
        </Text>
      </SafeAreaView>
    );
  }

  const completedCount = checkIns.filter((ci) => ci.response_status === "completed").length;
  const missedCount = checkIns.filter((ci) => ci.response_status === "missed").length;
  const statusColor =
    goal.status === "active" ? "#7e22ce" : goal.status === "completed" ? "#16a34a" : "#999";

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor="#7e22ce"
          />
        }
      >
        {/* ── Goal summary ── */}
        <View style={s.card}>
          <View style={s.metaRow}>
            <View style={[s.pill, { backgroundColor: statusColor }]}>
              <Text style={s.pillText}>{goal.status}</Text>
            </View>
            {goal.category && (
              <View style={[s.pill, { backgroundColor: "#e5e7eb" }]}>
                <Text style={[s.pillText, { color: "#333" }]}>{goal.category}</Text>
              </View>
            )}
            {goal.priority && (
              <View style={[s.pill, { backgroundColor: "#e5e7eb" }]}>
                <Text style={[s.pillText, { color: "#333" }]}>{goal.priority}</Text>
              </View>
            )}
          </View>

          {goal.target_date && (
            <Text style={[s.muted, { marginTop: 6 }]}>
              Due {formatDate(goal.target_date)}
            </Text>
          )}
          {goal.accountability_frequency && (
            <Text style={[s.muted, { marginTop: 2 }]}>
              {goal.accountability_frequency.replace(/_/g, " ")}
            </Text>
          )}

          {goal.ai_objective ? (
            <View style={{ marginTop: 12 }}>
              <Text style={s.objectiveLabel}>OBJECTIVE</Text>
              <Text style={s.objectiveText}>{goal.ai_objective}</Text>
            </View>
          ) : goal.description ? (
            <Text style={[s.muted, { marginTop: 10, fontSize: 14, lineHeight: 20 }]}>
              {goal.description}
            </Text>
          ) : null}

          {/* Progress bar */}
          <View style={s.progressTrack}>
            <View
              style={[s.progressFill, { width: `${goal.progress_percent}%` }]}
            />
          </View>
          <Text style={s.progressLabel}>{goal.progress_percent}% complete</Text>

          {/* Setup nudge */}
          {goal.status === "active" &&
            (!goal.target_date || !goal.accountability_frequency) && (
              <Pressable
                onPress={() => navigation.navigate("GoalEdit", { goalId })}
                style={{ marginTop: 8 }}
              >
                <Text style={s.nudgeText}>
                  {!goal.target_date && !goal.accountability_frequency
                    ? "Set end date & check-in schedule to activate reminders"
                    : !goal.target_date
                      ? "Set an end date to track progress"
                      : "Set a check-in schedule to activate reminders"}
                </Text>
              </Pressable>
            )}
        </View>

        {/* Action buttons */}
        <View style={s.actionRow}>
          <Pressable
            style={s.actionBtn}
            onPress={() => navigation.navigate("GoalEdit", { goalId })}
          >
            <Text style={s.actionBtnText}>Edit</Text>
          </Pressable>
          <Pressable
            style={s.actionBtn}
            onPress={() => navigation.navigate("GoalUpdate", { goalId })}
          >
            <Text style={s.actionBtnText}>Update Progress</Text>
          </Pressable>
        </View>

        {/* ── Milestones ── */}
        {(goal.milestones?.length ?? 0) > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={s.sectionTitle}>Milestones</Text>
            {goal.milestones.map((m) => (
              <View key={m.id} style={s.milestoneRow}>
                <View style={s.flex}>
                  <Text style={s.milestoneTitle}>{m.title}</Text>
                  {m.due_date && (
                    <Text style={s.muted}>Due {formatDate(m.due_date)}</Text>
                  )}
                </View>
                {m.is_completed ? (
                  <View style={[s.pill, { backgroundColor: "#16a34a" }]}>
                    <Text style={s.pillText}>done</Text>
                  </View>
                ) : (
                  <Pressable
                    style={s.completeBtn}
                    onPress={() => toggleMilestone(m.id, m.is_completed)}
                    disabled={togglingMilestone === m.id}
                  >
                    {togglingMilestone === m.id ? (
                      <ActivityIndicator size="small" color="#7e22ce" />
                    ) : (
                      <Text style={s.completeBtnText}>Complete</Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Check-in history ── */}
        <View style={{ marginTop: 20 }}>
          <Text style={s.sectionTitle}>Check-in History</Text>
          {checkIns.length > 0 ? (
            <>
              <View style={s.summaryRow}>
                <Text style={s.muted}>
                  {checkIns.length} response{checkIns.length !== 1 ? "s" : ""}
                </Text>
                <Text>
                  <Text style={{ color: "#7e22ce" }}>{completedCount} completed</Text>
                  {missedCount > 0 && (
                    <Text style={s.muted}> {"\u00B7"} {missedCount} missed</Text>
                  )}
                </Text>
              </View>
              {checkIns.map((ci) => {
                const statusKey = ci.response_status ?? "unknown";
                const pillColor = STATUS_PILL_COLOR[statusKey] ?? "#6b7280";
                return (
                  <View key={ci.id} style={s.checkInCard}>
                    <View style={s.flex}>
                      <Text style={s.checkInDate}>
                        {formatDate(ci.check_in_date)}
                      </Text>
                      {ci.note && (
                        <Text style={s.muted} numberOfLines={2}>
                          {ci.note}
                        </Text>
                      )}
                    </View>
                    <View style={s.checkInRight}>
                      {ci.channel && (
                        <View style={[s.pill, { backgroundColor: "#e5e7eb" }]}>
                          <Text style={[s.pillText, { color: "#333" }]}>
                            {ci.channel}
                          </Text>
                        </View>
                      )}
                      <View style={[s.pill, { backgroundColor: pillColor }]}>
                        <Text style={s.pillText}>{statusKey}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={[s.muted, { marginTop: 8 }]}>
              No check-in replies yet.
              {goal.status === "active" && !goal.accountability_frequency
                ? " Set a check-in schedule to activate reminders."
                : ""}
            </Text>
          )}
        </View>

        {/* Navigation links */}
        <View style={s.navRow}>
          <Pressable
            style={s.navBtn}
            onPress={() => navigation.navigate("GoalsList")}
          >
            <Text style={s.navBtnText}>All goals</Text>
          </Pressable>
          <Pressable
            style={s.navBtn}
            onPress={() => navigation.navigate("CheckInHistory")}
          >
            <Text style={s.navBtnText}>Full history</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  objectiveLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  objectiveText: { fontSize: 14, color: "#111", lineHeight: 20 },

  progressTrack: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: "#7e22ce", borderRadius: 3 },
  progressLabel: { fontSize: 12, color: "#888", marginTop: 4 },

  nudgeText: { fontSize: 13, color: "#7e22ce", fontWeight: "500" },

  muted: { fontSize: 13, color: "#888" },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionBtnText: { fontSize: 14, fontWeight: "600", color: "#333" },

  // Milestones
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  milestoneTitle: { fontSize: 14, fontWeight: "600", color: "#111" },
  completeBtn: {
    borderWidth: 1,
    borderColor: "#7e22ce",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  completeBtnText: { fontSize: 13, color: "#7e22ce", fontWeight: "600" },

  // Check-ins
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  checkInCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  checkInDate: { fontSize: 14, fontWeight: "600", color: "#111" },
  checkInRight: { flexDirection: "row", gap: 6, alignItems: "center", flexShrink: 0 },

  // Navigation
  navRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  navBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  navBtnText: { fontSize: 13, color: "#333", fontWeight: "500" },
});
