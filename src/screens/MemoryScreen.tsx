/**
 * MemoryScreen — AI memory system with feedback
 *
 * API endpoints:
 *  - GET  /api/v1/memories?type={type}
 *  - POST /api/v1/memories/{id}/feedback
 */
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPost } from "../lib/api";
import type { ApiEnvelope, MemoryItem } from "../types/api-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MemoryFilter = "all" | "working" | "episodic" | "semantic";

const FILTERS: { key: MemoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "working", label: "Working" },
  { key: "episodic", label: "Episodic" },
  { key: "semantic", label: "Semantic" },
];

type FeedbackType = "use_more" | "use_less" | "hide" | "remove";

const FEEDBACK_ACTIONS: { type: FeedbackType; label: string }[] = [
  { type: "use_more", label: "Use more" },
  { type: "use_less", label: "Use less" },
  { type: "hide", label: "Hide" },
  { type: "remove", label: "Remove" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MemoryScreen() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

  const fetchMemories = useCallback(async (type: MemoryFilter) => {
    try {
      const path = type === "all"
        ? "/api/v1/memories"
        : `/api/v1/memories?type=${type}`;
      const payload = await apiGet<ApiEnvelope<MemoryItem[]>>(path);
      setMemories(payload.data ?? []);
    } catch {
      // Fail gracefully
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMemories(filter).finally(() => setLoading(false));
  }, [filter, fetchMemories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMemories(filter);
    setRefreshing(false);
  }, [filter, fetchMemories]);

  const handleFeedback = async (memoryId: string, feedbackType: FeedbackType) => {
    setFeedbackLoading(memoryId);
    try {
      await apiPost(`/api/v1/memories/${memoryId}/feedback`, {
        feedback_type: feedbackType,
        feedback_note: null,
      });
      // Re-fetch to reflect changes (e.g. hidden/removed items disappear)
      await fetchMemories(filter);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not submit feedback.");
    } finally {
      setFeedbackLoading(null);
    }
  };

  const renderMemoryCard = ({ item }: { item: MemoryItem }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.pill}>
          <Text style={s.pillText}>{item.memory_type}</Text>
        </View>
      </View>

      <Text style={s.memoryText}>{item.memory_text}</Text>

      {item.explanation_text ? (
        <Text style={s.explanationText}>{item.explanation_text}</Text>
      ) : null}

      {/* Feedback buttons */}
      <View style={s.feedbackRow}>
        {feedbackLoading === item.id ? (
          <ActivityIndicator size="small" color={BRAND} />
        ) : (
          FEEDBACK_ACTIONS.map((action) => (
            <Pressable
              key={action.type}
              style={s.feedbackButton}
              onPress={() => handleFeedback(item.id, action.type)}
            >
              <Text style={s.feedbackButtonText}>{action.label}</Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.headerContainer}>
        <Text style={s.screenTitle}>Memory</Text>

        {/* Filter tabs */}
        <View style={s.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[s.filterTab, filter === f.key && s.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.filterTabText, filter === f.key && s.filterTabTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id}
          renderItem={renderMemoryCard}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyText}>No memories found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BRAND = "#7e22ce";

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  headerContainer: { paddingHorizontal: 24, paddingTop: 16 },
  screenTitle: { fontSize: 28, fontWeight: "700", color: "#111", marginBottom: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 24, paddingTop: 8, paddingBottom: 40 },

  // Filter tabs
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  filterTabActive: {
    backgroundColor: BRAND,
  },
  filterTabText: { fontSize: 13, color: "#666", fontWeight: "500" },
  filterTabTextActive: { color: "#fff" },

  // Memory cards
  card: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", marginBottom: 8 },
  pill: {
    backgroundColor: "rgba(126, 34, 206, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, color: BRAND, fontWeight: "500", textTransform: "capitalize" },

  memoryText: { fontSize: 14, color: "#444", lineHeight: 21, marginBottom: 4 },
  explanationText: { fontSize: 13, color: "#888", lineHeight: 20, marginBottom: 8 },

  // Feedback
  feedbackRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  feedbackButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  feedbackButtonText: { fontSize: 12, color: "#555", fontWeight: "500" },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center" },
});
