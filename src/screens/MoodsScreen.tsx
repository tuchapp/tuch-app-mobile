/**
 * MoodsScreen -- Log and review mood check-ins.
 *
 * API endpoints:
 *  - GET  /api/v1/moods
 *  - GET  /api/v1/moods/summary
 *  - POST /api/v1/moods
 */
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPost } from "../lib/api";
import { formatDate } from "../utils/format-date";
import type { MoodLog, MoodSummary, PaginatedResponse, ApiEnvelope } from "../types/api-types";

const MOOD_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Very High",
};

type ScaleKey = "mood" | "energy" | "stress";

export function MoodsScreen() {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [summary, setSummary] = useState<MoodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [moodValue, setMoodValue] = useState(3);
  const [energyValue, setEnergyValue] = useState(3);
  const [stressValue, setStressValue] = useState(3);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [moodsRes, summaryRes] = await Promise.all([
        apiGet<PaginatedResponse<MoodLog>>("/api/v1/moods"),
        apiGet<ApiEnvelope<MoodSummary>>("/api/v1/moods/summary").catch(() => null),
      ]);
      setLogs(moodsRes.data ?? []);
      if (summaryRes?.data) setSummary(summaryRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load moods.");
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function handleSubmit() {
    if (moodValue < 1 || energyValue < 1 || stressValue < 1) return;

    setSubmitting(true);
    try {
      await apiPost("/api/v1/moods", {
        mood_value: moodValue,
        energy_value: energyValue,
        stress_value: stressValue,
        note: note.trim() || null,
      });
      setMoodValue(3);
      setEnergyValue(3);
      setStressValue(3);
      setNote("");
      setShowForm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log mood.");
    } finally {
      setSubmitting(false);
    }
  }

  function ScaleButtons({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) {
    return (
      <View style={s.scaleGroup}>
        <Text style={s.label}>{label}</Text>
        <View style={s.scaleRow}>
          {[1, 2, 3, 4, 5].map((v) => (
            <Pressable
              key={v}
              style={[s.scaleBtn, v === value && s.scaleBtnActive]}
              onPress={() => onChange(v)}
            >
              <Text style={[s.scaleBtnText, v === value && s.scaleBtnTextActive]}>
                {v}
              </Text>
              <Text style={[s.scaleBtnLabel, v === value && s.scaleBtnLabelActive]}>
                {MOOD_LABELS[v]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <ActivityIndicator color="#7e22ce" size="large" style={s.centered} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
      >
        <FlatList
          data={logs.slice(0, 20)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7e22ce" />
          }
          ListHeaderComponent={
            <>
              <Text style={s.screenTitle}>Mood Logs</Text>

              {error && <Text style={s.error}>{error}</Text>}

              {/* New mood button / form */}
              {showForm ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Check-in</Text>

                  <ScaleButtons label="Mood" value={moodValue} onChange={setMoodValue} />
                  <ScaleButtons label="Energy" value={energyValue} onChange={setEnergyValue} />
                  <ScaleButtons label="Stress" value={stressValue} onChange={setStressValue} />

                  <Text style={[s.label, { marginTop: 12 }]}>Note (optional)</Text>
                  <TextInput
                    style={[s.input, { minHeight: 60 }]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="How are you feeling?"
                    placeholderTextColor="#999"
                    multiline
                    textAlignVertical="top"
                  />

                  <View style={s.formActions}>
                    <Pressable style={s.secondaryButton} onPress={() => setShowForm(false)}>
                      <Text style={s.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[s.button, submitting && s.buttonDisabled]}
                      onPress={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={s.buttonText}>Log mood</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={s.addButton} onPress={() => setShowForm(true)}>
                  <Text style={s.addButtonText}>+ New Mood Check-in</Text>
                </Pressable>
              )}

              {/* Summary stats */}
              {summary && (
                <View style={s.summaryCard}>
                  <Text style={s.sectionLabel}>Summary</Text>
                  <View style={s.summaryRow}>
                    <View style={s.summaryItem}>
                      <Text style={s.summaryValue}>{summary.avg_mood.toFixed(1)}</Text>
                      <Text style={s.summaryLabel}>Avg Mood</Text>
                    </View>
                    <View style={s.summaryItem}>
                      <Text style={s.summaryValue}>{summary.avg_energy.toFixed(1)}</Text>
                      <Text style={s.summaryLabel}>Avg Energy</Text>
                    </View>
                    <View style={s.summaryItem}>
                      <Text style={s.summaryValue}>{summary.avg_stress.toFixed(1)}</Text>
                      <Text style={s.summaryLabel}>Avg Stress</Text>
                    </View>
                  </View>
                </View>
              )}

              {logs.length > 0 && <Text style={s.sectionLabel}>Recent Logs</Text>}
            </>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitleText}>{MOOD_LABELS[item.mood_value]}</Text>
                <View style={s.pill}>
                  <Text style={s.pillText}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
              <Text style={s.bodyText}>
                Energy {item.energy_value}/5 {" \u2022 "} Stress {item.stress_value}/5
                {item.note ? ` \u2022 ${item.note}` : ""}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyText}>Your mood history will appear here.</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 20, paddingBottom: 40 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 20,
  },
  error: {
    fontSize: 14,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fff",
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  secondaryButtonText: { fontSize: 15, color: "#333", fontWeight: "500" },
  addButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: { fontSize: 15, color: "#7e22ce", fontWeight: "600" },
  // Scale buttons
  scaleGroup: { marginBottom: 12 },
  scaleRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  scaleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  scaleBtnActive: {
    backgroundColor: "#7e22ce",
    borderColor: "#7e22ce",
  },
  scaleBtnText: { fontSize: 16, fontWeight: "700", color: "#333" },
  scaleBtnTextActive: { color: "#fff" },
  scaleBtnLabel: { fontSize: 9, color: "#888", marginTop: 2 },
  scaleBtnLabelActive: { color: "rgba(255,255,255,0.8)" },
  // Summary
  summaryCard: {
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#7e22ce",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 },
  summaryItem: { alignItems: "center" },
  summaryValue: { fontSize: 24, fontWeight: "700", color: "#7e22ce" },
  summaryLabel: { fontSize: 12, color: "#666", marginTop: 2 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7e22ce",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitleText: { fontSize: 16, fontWeight: "600", color: "#111", flex: 1, marginRight: 8 },
  pill: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 12, color: "#666" },
  bodyText: { fontSize: 14, color: "#555", lineHeight: 20 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 15, color: "#999" },
});
