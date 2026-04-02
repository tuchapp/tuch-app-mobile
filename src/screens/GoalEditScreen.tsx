/**
 * GoalEditScreen -- Edit goal fields + accountability schedule + delete
 *
 * API endpoints:
 *  - GET    /api/v1/goals/{goalId}
 *  - PATCH  /api/v1/goals/{goalId}
 *  - PATCH  /api/v1/goals/{goalId}/accountability
 *  - DELETE /api/v1/goals/{goalId}
 */
import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { apiGet, apiPatch, apiDelete } from "../lib/api";
import { useAccountabilityDays } from "../hooks/use-accountability-days";
import {
  DAYS,
  FREQUENCY_OPTIONS,
  capitaliseDay,
  parseDays,
} from "../utils/utils";
import type { GoalDetail, AccountabilityFrequency } from "../types/api-types";
import type { GoalsStackParamList } from "../navigation/MainTabs";

type Props = NativeStackScreenProps<GoalsStackParamList, "GoalEdit">;

export function GoalEditScreen({ route, navigation }: Props) {
  const { goalId } = route.params;

  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "completed">("active");

  // Accountability
  const {
    selectedDays,
    frequency,
    setFrequency,
    toggleDay,
    sortedDays,
    customSchedule,
    effectiveFrequency,
    resetSchedule,
  } = useAccountabilityDays();

  const fetchGoal = useCallback(async () => {
    try {
      const res = await apiGet<{ data: GoalDetail }>(`/api/v1/goals/${goalId}`);
      const g = res.data;
      setGoal(g);
      setTitle(g.title);
      setDescription(g.description ?? "");
      setCategory(g.category ?? "");
      setPriority((g.priority as "low" | "medium" | "high") ?? "medium");
      setTargetDate(g.target_date ?? "");
      setStatus((g.status as "active" | "paused" | "completed") ?? "active");

      // Initialize accountability days
      const isCustom = g.accountability_frequency === "custom";
      const initDays = isCustom ? parseDays(g.custom_accountability_schedule) : [];
      const initFreq = isCustom
        ? ""
        : ((g.accountability_frequency as AccountabilityFrequency) ?? "");
      resetSchedule(initDays, initFreq);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchGoal();
    }, [fetchGoal]),
  );

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // 1. Patch the goal itself
      await apiPatch(`/api/v1/goals/${goalId}`, {
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        priority,
        target_date: targetDate.trim() || null,
        status,
      });

      // 2. Update accountability schedule
      if (effectiveFrequency === "custom" && customSchedule) {
        const reminderDays = customSchedule.split(",").map((d) => d.trim());
        await apiPatch(`/api/v1/goals/${goalId}/accountability`, {
          reminder_days: reminderDays,
        });
      } else if (effectiveFrequency && effectiveFrequency !== "custom") {
        await apiPatch(`/api/v1/goals/${goalId}`, {
          accountability_frequency: effectiveFrequency,
        });
      }

      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      "Delete Goal",
      "This will permanently remove the goal and all its check-in history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await apiDelete(`/api/v1/goals/${goalId}`);
              navigation.navigate("GoalsList");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to delete.");
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  const priorities: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];
  const statuses: Array<"active" | "paused" | "completed"> = [
    "active",
    "paused",
    "completed",
  ];

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <ActivityIndicator size="large" color="#7e22ce" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error && <Text style={s.error}>{error}</Text>}

          {/* Title */}
          <Text style={s.label}>Title</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Goal title"
            placeholderTextColor="#999"
          />

          {/* End date */}
          <Text style={s.label}>
            End date <Text style={s.hint}>(YYYY-MM-DD)</Text>
          </Text>
          <TextInput
            style={s.input}
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="2026-12-31"
            placeholderTextColor="#999"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          {/* Category */}
          <Text style={s.label}>Category</Text>
          <TextInput
            style={s.input}
            value={category}
            onChangeText={setCategory}
            placeholder="Health, Career..."
            placeholderTextColor="#999"
          />

          {/* Priority */}
          <Text style={s.label}>Priority</Text>
          <View style={s.chipRow}>
            {priorities.map((p) => (
              <Pressable
                key={p}
                style={[s.chip, priority === p && s.chipActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[s.chipText, priority === p && s.chipTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Status */}
          <Text style={s.label}>Status</Text>
          <View style={s.chipRow}>
            {statuses.map((st) => (
              <Pressable
                key={st}
                style={[s.chip, status === st && s.chipActive]}
                onPress={() => setStatus(st)}
              >
                <Text style={[s.chipText, status === st && s.chipTextActive]}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Description */}
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
            placeholder="What matters here?"
            placeholderTextColor="#999"
            multiline
          />

          {/* Day picker */}
          <Text style={s.label}>
            Check-in schedule <Text style={s.hint}>(needed for reminders)</Text>
          </Text>
          <Text style={[s.muted, { marginBottom: 6 }]}>
            Pick the days you want accountability reminders sent.
          </Text>
          <View style={s.dayRow}>
            {DAYS.map((day) => {
              const active = selectedDays.includes(day.code);
              return (
                <Pressable
                  key={day.code}
                  style={[s.dayBtn, active && s.dayBtnActive]}
                  onPress={() => toggleDay(day.code)}
                >
                  <Text style={[s.dayBtnText, active && s.dayBtnTextActive]}>
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {sortedDays.length === 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={s.label}>Or choose a general frequency</Text>
              <View style={s.freqRow}>
                <Pressable
                  style={[s.freqBtn, !frequency && s.freqBtnActive]}
                  onPress={() => setFrequency("" as AccountabilityFrequency)}
                >
                  <Text style={[s.freqBtnText, !frequency && s.freqBtnTextActive]}>
                    None
                  </Text>
                </Pressable>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[s.freqBtn, frequency === opt.value && s.freqBtnActive]}
                    onPress={() => setFrequency(opt.value)}
                  >
                    <Text
                      style={[
                        s.freqBtnText,
                        frequency === opt.value && s.freqBtnTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {sortedDays.length > 0 && (
            <Text style={[s.muted, { marginTop: 6 }]}>
              Reminders on:{" "}
              <Text style={s.bold}>{sortedDays.map(capitaliseDay).join(", ")}</Text>
            </Text>
          )}

          {/* Save / Cancel */}
          <View style={s.formActions}>
            <Pressable
              style={[s.button, (saving || deleting) && s.buttonDisabled]}
              disabled={saving || deleting || !title.trim()}
              onPress={handleSave}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.buttonText}>Save changes</Text>
              )}
            </Pressable>
            <Pressable style={s.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={s.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>

          {/* Danger zone */}
          <View style={s.dangerZone}>
            <Text style={s.dangerTitle}>Danger Zone</Text>
            <Text style={[s.muted, { marginBottom: 12 }]}>
              Deleting a goal removes it and all associated check-in history. This
              action cannot be undone.
            </Text>
            <Pressable
              style={[s.dangerButton, deleting && s.buttonDisabled]}
              disabled={deleting}
              onPress={handleDelete}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.dangerButtonText}>Delete goal</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 14, marginBottom: 4 },
  hint: { fontWeight: "400", color: "#888", fontSize: 12 },
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
  muted: { fontSize: 13, color: "#888" },
  bold: { fontWeight: "700" },
  error: {
    fontSize: 14,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    overflow: "hidden",
    marginBottom: 8,
  },

  // Chip row (priority / status)
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#7e22ce", borderColor: "#7e22ce" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextActive: { color: "#fff", fontWeight: "600" },

  // Day picker
  dayRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  dayBtnActive: { backgroundColor: "#7e22ce", borderColor: "#7e22ce" },
  dayBtnText: { fontSize: 14, color: "#333" },
  dayBtnTextActive: { color: "#fff", fontWeight: "600" },

  // Frequency picker
  freqRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  freqBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  freqBtnActive: { backgroundColor: "#7e22ce", borderColor: "#7e22ce" },
  freqBtnText: { fontSize: 13, color: "#333" },
  freqBtnTextActive: { color: "#fff", fontWeight: "600" },

  // Buttons
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: { fontSize: 15, color: "#333", fontWeight: "500" },
  formActions: { marginTop: 24, gap: 4 },

  // Danger zone
  dangerZone: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: "#fecaca",
    paddingTop: 20,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: 8,
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
