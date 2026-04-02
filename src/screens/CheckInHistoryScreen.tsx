/**
 * CheckInHistoryScreen -- All check-ins across goals
 *
 * API endpoints:
 *  - GET /api/v1/goals                    (for goal names)
 *  - GET /api/v1/goals/check-ins?page_size=30
 */
import { useCallback, useState } from "react";
import {
  View,
  Text,
  SectionList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { apiGet } from "../lib/api";
import { formatDate } from "../utils/format-date";
import type { Goal, CheckInRecord } from "../types/api-types";
import type { GoalsStackParamList } from "../navigation/MainTabs";

type Props = NativeStackScreenProps<GoalsStackParamList, "CheckInHistory">;

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  missed: "Missed",
  partial: "Partial",
  skipped: "Skipped",
  unknown: "Pending",
};

const STATUS_PILL_COLOR: Record<string, string> = {
  completed: "#16a34a",
  missed: "#dc2626",
  partial: "#f59e0b",
  skipped: "#6b7280",
  unknown: "#6b7280",
};

type Section = {
  goalId: string;
  title: string;
  completedCount: number;
  missedCount: number;
  data: CheckInRecord[];
};

export function CheckInHistoryScreen({ navigation }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [allCheckIns, setAllCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [goalsRes, ciRes] = await Promise.all([
        apiGet<{ data: Goal[] }>("/api/v1/goals"),
        apiGet<{ data: CheckInRecord[] }>("/api/v1/goals/check-ins?page_size=30"),
      ]);

      const goals = goalsRes.data ?? [];
      const checkIns = ciRes.data ?? [];
      setAllCheckIns(checkIns);

      // Build lookup
      const goalTitleMap = new Map<string, string>(
        goals.map((g) => [g.id, g.title]),
      );

      // Group by goal_id
      const byGoal = new Map<string, CheckInRecord[]>();
      for (const ci of checkIns) {
        const group = byGoal.get(ci.goal_id) ?? [];
        group.push(ci);
        byGoal.set(ci.goal_id, group);
      }

      const newSections: Section[] = Array.from(byGoal.entries()).map(
        ([goalId, records]) => ({
          goalId,
          title: goalTitleMap.get(goalId) ?? "Unknown goal",
          completedCount: records.filter((r) => r.response_status === "completed").length,
          missedCount: records.filter((r) => r.response_status === "missed").length,
          data: records,
        }),
      );

      setSections(newSections);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData]),
  );

  // Summary stats
  const totalCount = allCheckIns.length;
  const completedTotal = allCheckIns.filter((ci) => ci.response_status === "completed").length;
  const missedTotal = allCheckIns.filter((ci) => ci.response_status === "missed").length;
  const partialTotal = allCheckIns.filter((ci) => ci.response_status === "partial").length;

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <ActivityIndicator size="large" color="#7e22ce" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (allCheckIns.length === 0) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.emptyContainer}>
          <Text style={s.emptyTitle}>No check-in replies yet</Text>
          <Text style={s.muted}>
            Replies to your accountability reminders will appear here once recorded.
          </Text>
          <Pressable
            style={s.navBtn}
            onPress={() => navigation.navigate("GoalsList")}
          >
            <Text style={s.navBtnText}>All goals</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
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
        ListHeaderComponent={
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>All Check-ins</Text>
            <View style={s.summaryRow}>
              <Text style={s.summaryItem}>
                {totalCount} total
              </Text>
              <Text style={[s.summaryItem, { color: "#7e22ce" }]}>
                {completedTotal} completed
              </Text>
              <Text style={s.summaryItem}>
                {missedTotal} missed
              </Text>
              <Text style={s.summaryItem}>
                {partialTotal} partial
              </Text>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderLeft}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.muted}>
                {section.data.length} response{section.data.length !== 1 ? "s" : ""}
                {section.completedCount > 0 && (
                  <Text style={{ color: "#7e22ce" }}>
                    {" \u00B7 "}{section.completedCount} completed
                  </Text>
                )}
                {section.missedCount > 0 && ` \u00B7 ${section.missedCount} missed`}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                navigation.navigate("GoalDetail", { goalId: section.goalId })
              }
            >
              <Text style={s.viewGoalLink}>View goal</Text>
            </Pressable>
          </View>
        )}
        renderItem={({ item: ci }) => {
          const statusKey = ci.response_status ?? "unknown";
          const pillColor = STATUS_PILL_COLOR[statusKey] ?? "#6b7280";
          return (
            <View style={s.checkInCard}>
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
                    <Text style={[s.pillText, { color: "#333" }]}>{ci.channel}</Text>
                  </View>
                )}
                <View style={[s.pill, { backgroundColor: pillColor }]}>
                  <Text style={s.pillText}>
                    {STATUS_LABEL[statusKey] ?? statusKey}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <Pressable
            style={[s.navBtn, { marginTop: 20 }]}
            onPress={() => navigation.navigate("GoalsList")}
          >
            <Text style={s.navBtnText}>All goals</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },

  // Empty
  emptyContainer: { padding: 24, alignItems: "center", marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },

  // Summary
  summaryCard: {
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  summaryTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 8 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  summaryItem: { fontSize: 14, color: "#555" },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sectionHeaderLeft: { flex: 1, marginRight: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 2 },
  viewGoalLink: { fontSize: 13, color: "#7e22ce", fontWeight: "500" },

  muted: { fontSize: 13, color: "#888" },

  // Check-in card
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
  checkInRight: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexShrink: 0,
  },
  pill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Nav button
  navBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  navBtnText: { fontSize: 13, color: "#333", fontWeight: "500" },
});
