/**
 * GoalUpdateScreen -- Manual progress update
 *
 * API endpoints:
 *  - GET  /api/v1/goals/{goalId}
 *  - POST /api/v1/goals/{goalId}/updates
 */
import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { apiGet, apiPost } from "../lib/api";
import type { GoalDetail } from "../types/api-types";
import type { GoalsStackParamList } from "../navigation/MainTabs";

type Props = NativeStackScreenProps<GoalsStackParamList, "GoalUpdate">;

export function GoalUpdateScreen({ route, navigation }: Props) {
  const { goalId } = route.params;

  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);

  const fetchGoal = useCallback(async () => {
    try {
      const res = await apiGet<{ data: GoalDetail }>(`/api/v1/goals/${goalId}`);
      setGoal(res.data);
      setProgress(res.data.progress_percent ?? 0);
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

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        update_type: "manual_update",
        note: note.trim() || null,
      };
      if (progress !== null && !isNaN(progress)) {
        body.progress_percent = Math.min(100, Math.max(0, progress));
      }
      await apiPost(`/api/v1/goals/${goalId}/updates`, body);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post update.");
    } finally {
      setSubmitting(false);
    }
  }

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
          {goal && (
            <View style={s.goalHeader}>
              <Text style={s.goalTitle}>{goal.title}</Text>
              <View style={s.progressTrack}>
                <View
                  style={[s.progressFill, { width: `${goal.progress_percent}%` }]}
                />
              </View>
              <Text style={s.progressLabel}>
                Currently {goal.progress_percent}% complete
              </Text>
            </View>
          )}

          {error && <Text style={s.error}>{error}</Text>}

          {/* Note */}
          <Text style={s.label}>
            What progress have you made?
          </Text>
          <Text style={s.hint}>Share a quick update</Text>
          <TextInput
            style={[s.input, { minHeight: 120, textAlignVertical: "top" }]}
            value={note}
            onChangeText={setNote}
            placeholder="Describe what you've done, any blockers, or how you're feeling about this goal..."
            placeholderTextColor="#999"
            multiline
            autoFocus
          />

          {/* Progress slider */}
          <Text style={[s.label, { marginTop: 20 }]}>
            Progress
          </Text>
          <Text style={s.hint}>Current completion % (optional)</Text>

          <View style={s.sliderRow}>
            <Pressable
              style={s.sliderBtn}
              onPress={() => setProgress(Math.max(0, progress - 5))}
            >
              <Text style={s.sliderBtnText}>-</Text>
            </Pressable>
            <View style={s.sliderTrackContainer}>
              <View style={s.sliderTrack}>
                <View
                  style={[s.sliderFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={s.sliderValue}>{progress}%</Text>
            </View>
            <Pressable
              style={s.sliderBtn}
              onPress={() => setProgress(Math.min(100, progress + 5))}
            >
              <Text style={s.sliderBtnText}>+</Text>
            </Pressable>
          </View>

          {/* Direct input */}
          <View style={s.directInputRow}>
            <Text style={s.muted}>Or type a value: </Text>
            <TextInput
              style={[s.input, { width: 70, textAlign: "center", paddingVertical: 8 }]}
              value={String(progress)}
              onChangeText={(t) => {
                const v = parseInt(t, 10);
                if (!isNaN(v)) setProgress(Math.min(100, Math.max(0, v)));
                else if (t === "") setProgress(0);
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          {/* Submit / Cancel */}
          <View style={s.formActions}>
            <Pressable
              style={[s.button, submitting && s.buttonDisabled]}
              disabled={submitting}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.buttonText}>Post update</Text>
              )}
            </Pressable>
            <Pressable style={s.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={s.secondaryButtonText}>Cancel</Text>
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

  goalHeader: {
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  goalTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  progressTrack: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: "#7e22ce", borderRadius: 3 },
  progressLabel: { fontSize: 12, color: "#888", marginTop: 4 },

  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 2 },
  hint: { fontSize: 12, color: "#888", marginBottom: 8 },
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
  error: {
    fontSize: 14,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    overflow: "hidden",
    marginBottom: 12,
  },

  // Slider
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  sliderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  sliderBtnText: { fontSize: 20, color: "#7e22ce", fontWeight: "600" },
  sliderTrackContainer: { flex: 1, alignItems: "center" },
  sliderTrack: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  sliderFill: { height: 8, backgroundColor: "#7e22ce", borderRadius: 4 },
  sliderValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7e22ce",
    marginTop: 6,
  },

  directInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

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
  formActions: { marginTop: 28, gap: 4 },
});
