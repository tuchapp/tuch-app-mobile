/**
 * GoalsScreen -- Goals list + create form
 *
 * API endpoints:
 *  - GET  /api/v1/goals
 *  - POST /api/v1/goals
 *  - POST /api/v1/goals/clarity
 */
import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { apiGet, apiPost } from "../lib/api";
import { SkeletonList } from "../components/Skeleton";
import { DatePickerField } from "../components/DatePickerField";
import { useAccountabilityDays } from "../hooks/use-accountability-days";
import {
  DAYS,
  FREQUENCY_OPTIONS,
  capitaliseDay,
  parseDays,
} from "../utils/utils";
import type {
  Goal,
  GoalClarityResult,
  ApiEnvelope,
  AccountabilityFrequency,
} from "../types/api-types";
import type { GoalsStackParamList } from "../navigation/MainTabs";

type Props = NativeStackScreenProps<GoalsStackParamList, "GoalsList">;

// ---------------------------------------------------------------------------
// Clarity overlay
// ---------------------------------------------------------------------------

function ClarityOverlay({
  result,
  rawInput,
  onAccept,
  onRegenerate,
  onDismiss,
  isRegenerating,
}: {
  result: GoalClarityResult;
  rawInput: string;
  onAccept: (title: string, objective: string, frequency: string) => void;
  onRegenerate: () => void;
  onDismiss: () => void;
  isRegenerating: boolean;
}) {
  const [editedTitle, setEditedTitle] = useState(result.title || "");
  const [editedObjective, setEditedObjective] = useState(result.objective || "");

  if (result.needs_more_info && result.clarifying_question) {
    return (
      <View style={s.clarityCard}>
        <Text style={s.clarityEyebrow}>Help us understand your goal</Text>
        <Text style={s.clarityQuestion}>{result.clarifying_question}</Text>
        <Pressable style={s.secondaryButton} onPress={onDismiss}>
          <Text style={s.secondaryButtonText}>Skip for now</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.clarityCard}>
      <View style={s.clarityHeader}>
        <Text style={s.clarityEyebrow}>Refined version of your goal</Text>
        <Pressable onPress={onDismiss}>
          <Text style={s.clarityDismiss}>X</Text>
        </Pressable>
      </View>

      <View style={s.clarityOriginal}>
        <Text style={s.clarityOriginalLabel}>You wrote</Text>
        <Text style={s.clarityOriginalText}>{`\u201C${rawInput}\u201D`}</Text>
      </View>

      <Text style={s.clarityFieldLabel}>Goal Title</Text>
      <TextInput
        style={s.input}
        value={editedTitle}
        onChangeText={setEditedTitle}
        maxLength={60}
      />

      <Text style={s.clarityFieldLabel}>Clear Objective</Text>
      <TextInput
        style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
        value={editedObjective}
        onChangeText={setEditedObjective}
        maxLength={400}
        multiline
      />

      {result.suggested_frequency && (
        <Text style={s.muted}>
          Suggested check-ins:{" "}
          <Text style={s.bold}>
            {result.suggested_frequency.replace(/_/g, " ")}
          </Text>
        </Text>
      )}

      <View style={s.clarityActions}>
        <Pressable
          style={[
            s.button,
            (!editedTitle.trim() || !editedObjective.trim()) && s.buttonDisabled,
          ]}
          disabled={!editedTitle.trim() || !editedObjective.trim()}
          onPress={() =>
            onAccept(
              editedTitle.trim(),
              editedObjective.trim(),
              result.suggested_frequency || "weekly",
            )
          }
        >
          <Text style={s.buttonText}>Use This Goal</Text>
        </Pressable>
        <Pressable
          style={[s.secondaryButton, isRegenerating && s.buttonDisabled]}
          disabled={isRegenerating}
          onPress={onRegenerate}
        >
          <Text style={s.secondaryButtonText}>
            {isRegenerating ? "Generating..." : "Try Different Version"}
          </Text>
        </Pressable>
        <Pressable onPress={onDismiss}>
          <Text style={s.linkText}>Keep My Original Wording</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function GoalsScreen({ navigation }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clarity state
  const [clarityResult, setClarityResult] = useState<GoalClarityResult | null>(null);
  const [clarityLoading, setClarityLoading] = useState(false);
  const [showClarity, setShowClarity] = useState(false);
  const [rawInput, setRawInput] = useState("");

  // Accountability
  const {
    selectedDays,
    frequency,
    setFrequency,
    toggleDay,
    sortedDays,
    customSchedule,
    effectiveFrequency,
  } = useAccountabilityDays();

  // Soft-gate
  const [showConfirm, setShowConfirm] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // ---- Fetch ----
  const fetchGoals = useCallback(async () => {
    try {
      const res = await apiGet<{ data: Goal[] }>("/api/v1/goals");
      setGoals(res.data ?? []);
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
      fetchGoals();
    }, [fetchGoals]),
  );

  function onRefresh() {
    setRefreshing(true);
    fetchGoals();
  }

  // ---- Clarity flow ----
  async function requestClarity(input: string, cat?: string) {
    setClarityLoading(true);
    setShowClarity(false);
    setShowConfirm(false);
    try {
      const res = await apiPost<ApiEnvelope<GoalClarityResult>>(
        "/api/v1/goals/clarity",
        { raw_input: input, category: cat || null },
      );
      setClarityResult(res.data);
      setShowClarity(true);
    } catch {
      submitDirectly();
    } finally {
      setClarityLoading(false);
    }
  }

  function handleClarityAccepted(
    aiTitle: string,
    objective: string,
    suggestedFreq: string,
  ) {
    setShowClarity(false);
    submitGoal({
      title: aiTitle,
      ai_title: clarityResult?.title || "",
      ai_objective: objective,
      raw_user_input: rawInput,
      ai_clarity_accepted: true,
      accountability_frequency:
        effectiveFrequency || suggestedFreq || undefined,
    });
  }

  function handleClarityRegenerate() {
    requestClarity(rawInput, category);
  }

  function handleClarityDismissed() {
    setShowClarity(false);
    submitDirectly();
  }

  function submitDirectly() {
    submitGoal({
      title,
      raw_user_input: rawInput,
      ai_clarity_accepted: false,
    });
  }

  // ---- Submit ----
  async function submitGoal(overrides: Record<string, unknown> = {}) {
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title,
        description: description || null,
        category: category || null,
        priority,
        target_date: targetDate || null,
        ...overrides,
      };
      if (effectiveFrequency) {
        payload.accountability_frequency = effectiveFrequency;
      }
      if (customSchedule) {
        payload.custom_accountability_schedule = customSchedule;
      }
      await apiPost("/api/v1/goals", payload);
      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setPriority("medium");
      setTargetDate("");
      setShowForm(false);
      setClarityResult(null);
      setShowClarity(false);
      setRawInput("");
      fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFormSubmit() {
    if (!title.trim()) return;
    const combined = [title, description].filter(Boolean).join(". ");
    setRawInput(combined);

    const missing: string[] = [];
    if (!targetDate) missing.push("end date");
    if (!effectiveFrequency) missing.push("check-in schedule");
    if (missing.length > 0) {
      setMissingFields(missing);
      setShowConfirm(true);
      return;
    }
    requestClarity(combined, category);
  }

  function proceedWithoutFields() {
    setShowConfirm(false);
    const combined = [title, description].filter(Boolean).join(". ");
    setRawInput(combined);
    requestClarity(combined, category);
  }

  // ---- Render helpers ----
  const priorities: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];

  function renderGoalCard({ item }: { item: Goal }) {
    const statusColor =
      item.status === "active" ? "#7e22ce" : item.status === "completed" ? "#16a34a" : "#999";
    return (
      <Pressable
        style={s.card}
        onPress={() => navigation.navigate("GoalDetail", { goalId: item.id })}
      >
        <View style={s.cardHeader}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[s.pill, { backgroundColor: statusColor }]}>
            <Text style={s.pillText}>{item.status}</Text>
          </View>
        </View>
        {item.category && <Text style={s.muted}>{item.category}</Text>}
        <View style={s.progressTrack}>
          <View
            style={[s.progressFill, { width: `${item.progress_percent}%` }]}
          />
        </View>
        <Text style={s.progressLabel}>{item.progress_percent}% complete</Text>
        {(item.accountability_frequency || item.target_date) && (
          <Text style={[s.muted, { marginTop: 2 }]}>
            {item.accountability_frequency
              ? `Check-ins: ${item.accountability_frequency.replace(/_/g, " ")}`
              : ""}
            {item.accountability_frequency && item.target_date ? " \u00B7 " : ""}
            {item.target_date ? `Ends ${item.target_date}` : ""}
          </Text>
        )}
      </Pressable>
    );
  }

  // ---- Main render ----
  if (loading && goals.length === 0) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={{ padding: 16 }}>
          <SkeletonList count={4} />
        </View>
      </SafeAreaView>
    );
  }

  // Show clarity overlay
  if (showClarity && clarityResult) {
    return (
      <SafeAreaView style={s.safeArea}>
        <ScrollView contentContainerStyle={s.scrollContent}>
          <ClarityOverlay
            result={clarityResult}
            rawInput={rawInput}
            onAccept={handleClarityAccepted}
            onRegenerate={handleClarityRegenerate}
            onDismiss={handleClarityDismissed}
            isRegenerating={clarityLoading}
          />
        </ScrollView>
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
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={renderGoalCard}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7e22ce"
            />
          }
          ListHeaderComponent={
            <>
              {/* ---- Create goal section ---- */}
              {!showForm ? (
                <Pressable
                  style={s.button}
                  onPress={() => setShowForm(true)}
                >
                  <Text style={s.buttonText}>+ New Goal</Text>
                </Pressable>
              ) : (
                <View style={s.formContainer}>
                  <Text style={s.sectionTitle}>New Goal</Text>

                  {clarityLoading && (
                    <View style={s.clarityLoadingBox}>
                      <ActivityIndicator color="#7e22ce" />
                      <Text style={s.muted}>Refining your goal...</Text>
                    </View>
                  )}

                  {error && <Text style={s.error}>{error}</Text>}

                  {/* Title */}
                  <Text style={s.label}>Title</Text>
                  <TextInput
                    style={s.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. get healthier, save money, read more"
                    placeholderTextColor="#999"
                  />

                  {/* End date */}
                  <Text style={s.label}>
                    End date{" "}
                    <Text style={s.hint}>(needed for reminders)</Text>
                  </Text>
                  <DatePickerField
                    label="End date"
                    value={targetDate}
                    onChange={(d) => {
                      setTargetDate(d);
                      if (showConfirm) setShowConfirm(false);
                    }}
                    placeholder="Select end date"
                    minimumDate={new Date()}
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
                  <View style={s.priorityRow}>
                    {priorities.map((p) => (
                      <Pressable
                        key={p}
                        style={[
                          s.priorityBtn,
                          priority === p && s.priorityBtnActive,
                        ]}
                        onPress={() => setPriority(p)}
                      >
                        <Text
                          style={[
                            s.priorityBtnText,
                            priority === p && s.priorityBtnTextActive,
                          ]}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Description */}
                  <Text style={s.label}>Description</Text>
                  <TextInput
                    style={[s.input, { minHeight: 60, textAlignVertical: "top" }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What does success look like?"
                    placeholderTextColor="#999"
                    multiline
                  />

                  {/* Day picker */}
                  <Text style={s.label}>
                    Check-in schedule{" "}
                    <Text style={s.hint}>(needed for reminders)</Text>
                  </Text>
                  <Text style={[s.muted, { marginBottom: 6 }]}>
                    Pick specific days, or choose a general frequency below.
                  </Text>
                  <View style={s.dayRow}>
                    {DAYS.map((day) => {
                      const active = selectedDays.includes(day.code);
                      return (
                        <Pressable
                          key={day.code}
                          style={[s.dayBtn, active && s.dayBtnActive]}
                          onPress={() => {
                            toggleDay(day.code);
                            if (showConfirm) setShowConfirm(false);
                          }}
                        >
                          <Text
                            style={[
                              s.dayBtnText,
                              active && s.dayBtnTextActive,
                            ]}
                          >
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
                          style={[
                            s.freqBtn,
                            !frequency && s.freqBtnActive,
                          ]}
                          onPress={() => {
                            setFrequency("" as AccountabilityFrequency);
                            if (showConfirm) setShowConfirm(false);
                          }}
                        >
                          <Text
                            style={[
                              s.freqBtnText,
                              !frequency && s.freqBtnTextActive,
                            ]}
                          >
                            None
                          </Text>
                        </Pressable>
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <Pressable
                            key={opt.value}
                            style={[
                              s.freqBtn,
                              frequency === opt.value && s.freqBtnActive,
                            ]}
                            onPress={() => {
                              setFrequency(opt.value);
                              if (showConfirm) setShowConfirm(false);
                            }}
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
                      <Text style={s.bold}>
                        {sortedDays.map(capitaliseDay).join(", ")}
                      </Text>
                    </Text>
                  )}

                  {/* Soft-gate */}
                  {showConfirm && (
                    <View style={s.confirmBox}>
                      <Text style={s.confirmText}>
                        <Text style={s.bold}>
                          Missing: {missingFields.join(" and ")}.
                        </Text>
                        {"\n"}Accountability reminders will not activate until both
                        an end date and check-in schedule are set. You can add them
                        later.
                      </Text>
                      <View style={s.confirmActions}>
                        <Pressable
                          style={[
                            s.secondaryButton,
                            (submitting || clarityLoading) && s.buttonDisabled,
                          ]}
                          disabled={submitting || clarityLoading}
                          onPress={proceedWithoutFields}
                        >
                          <Text style={s.secondaryButtonText}>
                            {clarityLoading
                              ? "Refining..."
                              : submitting
                                ? "Creating..."
                                : "Create anyway"}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => setShowConfirm(false)}>
                          <Text style={s.linkText}>Go back</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {/* Submit / cancel */}
                  {!showConfirm && (
                    <View style={s.formActions}>
                      <Pressable
                        style={[
                          s.button,
                          (submitting || clarityLoading) && s.buttonDisabled,
                        ]}
                        disabled={submitting || clarityLoading || !title.trim()}
                        onPress={handleFormSubmit}
                      >
                        {submitting || clarityLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={s.buttonText}>Create goal</Text>
                        )}
                      </Pressable>
                      <Pressable
                        style={s.secondaryButton}
                        onPress={() => setShowForm(false)}
                      >
                        <Text style={s.secondaryButtonText}>Cancel</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* Section label */}
              {goals.length > 0 && (
                <Text style={s.sectionTitle}>All Goals</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <Text style={[s.muted, { textAlign: "center", marginTop: 24 }]}>
              No goals yet. Create one to get started.
            </Text>
          }
        />
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
  scrollContent: { padding: 16 },
  listContent: { padding: 16, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginTop: 20,
    marginBottom: 12,
  },

  // Goal card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111", flex: 1, marginRight: 8 },
  pill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  progressTrack: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: "#7e22ce", borderRadius: 3 },
  progressLabel: { fontSize: 12, color: "#888", marginTop: 4 },

  // Form
  formContainer: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 12, marginBottom: 4 },
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

  // Priority
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  priorityBtnActive: {
    backgroundColor: "#7e22ce",
    borderColor: "#7e22ce",
  },
  priorityBtnText: { fontSize: 14, color: "#333" },
  priorityBtnTextActive: { color: "#fff", fontWeight: "600" },

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
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: { fontSize: 15, color: "#333", fontWeight: "500" },
  linkText: { fontSize: 14, color: "#7e22ce", fontWeight: "500", marginTop: 12, textAlign: "center" },

  formActions: { marginTop: 16, gap: 4 },

  // Confirm soft-gate
  confirmBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  confirmText: { fontSize: 14, color: "#92400e", lineHeight: 20 },
  confirmActions: { marginTop: 12, gap: 8 },

  // Clarity overlay
  clarityCard: {
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
    borderRadius: 12,
    padding: 20,
  },
  clarityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  clarityEyebrow: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7e22ce",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clarityDismiss: { fontSize: 18, color: "#999", fontWeight: "600", padding: 4 },
  clarityOriginal: {
    backgroundColor: "#f3e8ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  clarityOriginalLabel: { fontSize: 12, color: "#7e22ce", marginBottom: 4 },
  clarityOriginalText: { fontSize: 14, color: "#333", fontStyle: "italic" },
  clarityFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 4,
  },
  clarityQuestion: { fontSize: 15, color: "#333", lineHeight: 22, marginBottom: 12 },
  clarityActions: { marginTop: 16, gap: 8, alignItems: "center" },
  clarityLoadingBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 16,
    justifyContent: "center",
  },
});
