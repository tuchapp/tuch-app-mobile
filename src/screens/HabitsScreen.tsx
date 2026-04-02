/**
 * HabitsScreen -- Manage habit loops: create, log, archive.
 *
 * API endpoints:
 *  - GET  /api/v1/habits
 *  - POST /api/v1/habits
 *  - POST /api/v1/habits/{id}/log
 *  - POST /api/v1/habits/{id}/archive
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
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPost } from "../lib/api";
import { formatDate } from "../utils/format-date";
import type { HabitLoop, ApiEnvelope } from "../types/api-types";

function isLoggedToday(habit: HabitLoop): boolean {
  if (!habit.last_logged_at) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const last = new Date(habit.last_logged_at);
  const lastDate = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  return lastDate === today;
}

export function HabitsScreen() {
  const [habits, setHabits] = useState<HabitLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cue, setCue] = useState("");
  const [routine, setRoutine] = useState("");
  const [reward, setReward] = useState("");
  const [isPositive, setIsPositive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Track in-flight log/archive operations per habit id
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const fetchHabits = useCallback(async () => {
    try {
      setError(null);
      const res = await apiGet<ApiEnvelope<HabitLoop[]>>("/api/v1/habits");
      setHabits(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load habits.");
    }
  }, []);

  useEffect(() => {
    fetchHabits().finally(() => setLoading(false));
  }, [fetchHabits]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHabits();
    setRefreshing(false);
  }, [fetchHabits]);

  async function handleCreate() {
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await apiPost("/api/v1/habits", {
        name: name.trim(),
        cue: cue.trim() || null,
        routine: routine.trim() || null,
        reward: reward.trim() || null,
        is_positive: isPositive,
      });
      setName("");
      setCue("");
      setRoutine("");
      setReward("");
      setIsPositive(true);
      setShowForm(false);
      await fetchHabits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create habit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLog(habitId: string, completed: boolean) {
    setBusyIds((prev) => new Set(prev).add(habitId));
    try {
      await apiPost(`/api/v1/habits/${habitId}/log`, { completed });
      await fetchHabits();
    } catch (err) {
      // Swallow 409 (already logged today)
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("409")) {
        setError(msg || "Failed to log habit.");
      }
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  }

  function handleArchive(habitId: string, habitName: string) {
    Alert.alert(
      "Archive Habit",
      `Are you sure you want to archive "${habitName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            setBusyIds((prev) => new Set(prev).add(habitId));
            try {
              await apiPost(`/api/v1/habits/${habitId}/archive`);
              await fetchHabits();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to archive habit.");
            } finally {
              setBusyIds((prev) => {
                const next = new Set(prev);
                next.delete(habitId);
                return next;
              });
            }
          },
        },
      ],
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
          data={habits}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7e22ce" />
          }
          ListHeaderComponent={
            <>
              <Text style={s.screenTitle}>Habits</Text>

              {error && <Text style={s.error}>{error}</Text>}

              {/* Add habit form / button */}
              {showForm ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>New Habit Loop</Text>

                  <Text style={s.label}>Habit name</Text>
                  <TextInput
                    style={s.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Morning meditation"
                    placeholderTextColor="#999"
                  />

                  <Text style={s.label}>Cue (trigger)</Text>
                  <TextInput
                    style={s.input}
                    value={cue}
                    onChangeText={setCue}
                    placeholder="After coffee"
                    placeholderTextColor="#999"
                  />

                  <Text style={s.label}>Routine (action)</Text>
                  <TextInput
                    style={s.input}
                    value={routine}
                    onChangeText={setRoutine}
                    placeholder="Sit for 5 min"
                    placeholderTextColor="#999"
                  />

                  <Text style={s.label}>Reward</Text>
                  <TextInput
                    style={s.input}
                    value={reward}
                    onChangeText={setReward}
                    placeholder="Calm feeling"
                    placeholderTextColor="#999"
                  />

                  <Text style={[s.label, { marginTop: 12 }]}>Type</Text>
                  <View style={s.toggleRow}>
                    <Pressable
                      style={[s.toggleBtn, isPositive && s.toggleBtnActive]}
                      onPress={() => setIsPositive(true)}
                    >
                      <Text style={[s.toggleBtnText, isPositive && s.toggleBtnTextActive]}>
                        Building
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[s.toggleBtn, !isPositive && s.toggleBtnActive]}
                      onPress={() => setIsPositive(false)}
                    >
                      <Text style={[s.toggleBtnText, !isPositive && s.toggleBtnTextActive]}>
                        Breaking
                      </Text>
                    </Pressable>
                  </View>

                  <View style={s.formActions}>
                    <Pressable style={s.secondaryButton} onPress={() => setShowForm(false)}>
                      <Text style={s.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[s.button, submitting && s.buttonDisabled]}
                      onPress={handleCreate}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={s.buttonText}>Add Habit</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={s.addButton} onPress={() => setShowForm(true)}>
                  <Text style={s.addButtonText}>+ Add Habit Loop</Text>
                </Pressable>
              )}

              {habits.length > 0 && <Text style={s.sectionLabel}>Your Habits</Text>}
            </>
          }
          renderItem={({ item }) => {
            const logged = isLoggedToday(item);
            const busy = busyIds.has(item.id);
            return (
              <View style={[s.habitCard, logged && s.habitCardLogged]}>
                {/* Header row */}
                <View style={s.habitHeader}>
                  <View style={s.habitHeaderLeft}>
                    <View style={[s.typePill, !item.is_positive && s.typePillBreaking]}>
                      <Text style={[s.typePillText, !item.is_positive && s.typePillTextBreaking]}>
                        {item.is_positive ? "building" : "breaking"}
                      </Text>
                    </View>
                    <Text style={s.habitName} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <View style={s.habitHeaderRight}>
                    {item.streak > 0 && (
                      <Text style={s.streakText}>{item.streak}d streak</Text>
                    )}
                    <Pressable
                      onPress={() => handleArchive(item.id, item.name)}
                      hitSlop={8}
                      disabled={busy}
                    >
                      <Text style={s.archiveBtn}>X</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Cue / Routine / Reward labels */}
                {(item.cue || item.routine || item.reward) && (
                  <View style={s.loopRow}>
                    {item.cue ? (
                      <View style={s.loopChip}>
                        <Text style={s.loopChipText}>Cue: {item.cue}</Text>
                      </View>
                    ) : null}
                    {item.routine ? (
                      <View style={s.loopChip}>
                        <Text style={s.loopChipText}>Routine: {item.routine}</Text>
                      </View>
                    ) : null}
                    {item.reward ? (
                      <View style={s.loopChip}>
                        <Text style={s.loopChipText}>Reward: {item.reward}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Log buttons or logged state */}
                {logged ? (
                  <Text style={s.loggedText}>Logged today</Text>
                ) : (
                  <View style={s.logActions}>
                    <Pressable
                      style={[s.logBtn, busy && s.buttonDisabled]}
                      onPress={() => handleLog(item.id, true)}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator color="#7e22ce" size="small" />
                      ) : (
                        <Text style={s.logBtnText}>Done</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[s.logBtn, s.logBtnMissed, busy && s.buttonDisabled]}
                      onPress={() => handleLog(item.id, false)}
                      disabled={busy}
                    >
                      <Text style={[s.logBtnText, { opacity: 0.7 }]}>Missed</Text>
                    </Pressable>
                  </View>
                )}

                {/* Meta line */}
                <View style={s.metaRow}>
                  {item.last_logged_at && (
                    <Text style={s.metaText}>Last: {formatDate(item.last_logged_at)}</Text>
                  )}
                  {item.best_streak > 1 && (
                    <Text style={s.metaText}>Best: {item.best_streak}d</Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyText}>
                No habits yet. Add a habit loop to start building consistency.
              </Text>
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
  // Form
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4, marginTop: 8 },
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
  toggleRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  toggleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  toggleBtnActive: {
    backgroundColor: "#7e22ce",
    borderColor: "#7e22ce",
  },
  toggleBtnText: { fontSize: 14, fontWeight: "600", color: "#333" },
  toggleBtnTextActive: { color: "#fff" },
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7e22ce",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  // Habit cards
  habitCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  habitCardLogged: {
    borderColor: "rgba(34,197,94,0.4)",
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  habitHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  habitHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  typePill: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typePillBreaking: {
    backgroundColor: "rgba(220,38,38,0.1)",
  },
  typePillText: { fontSize: 11, fontWeight: "600", color: "#16a34a" },
  typePillTextBreaking: { color: "#dc2626" },
  habitName: { fontSize: 16, fontWeight: "600", color: "#111", flex: 1 },
  streakText: { fontSize: 13, fontWeight: "600", color: "#f59e0b" },
  archiveBtn: { fontSize: 14, color: "#999", fontWeight: "600", padding: 4 },
  // Loop labels
  loopRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  loopChip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  loopChipText: { fontSize: 12, color: "#555" },
  // Log actions
  loggedText: { fontSize: 14, fontWeight: "500", color: "#16a34a", marginTop: 10 },
  logActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  logBtn: {
    borderWidth: 1,
    borderColor: "#7e22ce",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  logBtnMissed: {
    borderColor: "#d1d5db",
  },
  logBtnText: { fontSize: 14, fontWeight: "600", color: "#7e22ce" },
  // Meta
  metaRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  metaText: { fontSize: 12, color: "#999" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 15, color: "#999", textAlign: "center" },
});
