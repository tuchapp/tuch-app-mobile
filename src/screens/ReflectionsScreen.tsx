/**
 * ReflectionsScreen — Structured reflection check-ins
 *
 * API endpoints:
 *  - GET  /api/v1/reflections
 *  - POST /api/v1/reflections
 */
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPost } from "../lib/api";
import { formatDate } from "../utils/format-date";
import type { ApiEnvelope, StructuredReflection } from "../types/api-types";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type TemplateKey = "daily" | "weekly" | "monthly";

const TEMPLATES: Record<TemplateKey, { name: string; emoji: string; questions: string[] }> = {
  daily: {
    name: "Daily Check-In",
    emoji: "\uD83C\uDF05",
    questions: [
      "How are you feeling right now, honestly?",
      "What's one thing weighing on your mind today?",
      "What went well today? What are you grateful for?",
      "Is there anything you're avoiding or resisting?",
      "What does your body need right now?",
    ],
  },
  weekly: {
    name: "Weekly Review",
    emoji: "\uD83D\uDCC5",
    questions: [
      "What was the emotional theme of your week?",
      "What patterns did you notice in your stress or energy?",
      "Did you make progress on something important? What helped or hindered?",
      "What conversations or interactions stood out?",
      "What would you do differently next week?",
      "What are you carrying into next week that you could let go of?",
    ],
  },
  monthly: {
    name: "Monthly Reflection",
    emoji: "\uD83C\uDF19",
    questions: [
      "Looking back at this month, how have you grown?",
      "What recurring challenges kept showing up?",
      "What relationships or connections felt nourishing? Which felt draining?",
      "Are your daily habits aligned with your deeper values?",
      "What goal or intention do you want to carry into next month?",
      "What would your future self thank you for starting now?",
    ],
  },
};

function getPeriodLabel(type: TemplateKey): string {
  const now = new Date();
  if (type === "daily") return now.toISOString().slice(0, 10);
  if (type === "weekly") {
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return now.toISOString().slice(0, 7);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReflectionsScreen() {
  const [reflections, setReflections] = useState<StructuredReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [activeType, setActiveType] = useState<TemplateKey | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const fetchReflections = useCallback(async () => {
    try {
      const payload = await apiGet<ApiEnvelope<StructuredReflection[]>>("/api/v1/reflections");
      setReflections(payload.data ?? []);
    } catch {
      // Fail gracefully
    }
  }, []);

  useEffect(() => {
    fetchReflections().finally(() => setLoading(false));
  }, [fetchReflections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReflections();
    setRefreshing(false);
  }, [fetchReflections]);

  const handleSubmit = async () => {
    if (!activeType) return;
    const hasAnyResponse = Object.values(responses).some((v) => v.trim().length > 0);
    if (!hasAnyResponse) {
      Alert.alert("Empty reflection", "Please answer at least one question.");
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/v1/reflections", {
        reflection_type: activeType,
        period_label: getPeriodLabel(activeType),
        responses,
      });
      setActiveType(null);
      setResponses({});
      await fetchReflections();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not save reflection.");
    } finally {
      setSubmitting(false);
    }
  };

  const template = activeType ? TEMPLATES[activeType] : null;

  // ── Form view ──
  if (activeType && template) {
    return (
      <SafeAreaView style={s.safeArea}>
        <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={s.screenTitle}>Reflections</Text>
          <Text style={s.formIntro}>
            Take your time with each question. There are no wrong answers.
          </Text>

          {template.questions.map((question, i) => (
            <View key={i} style={s.fieldGroup}>
              <Text style={s.fieldLabel}>{question}</Text>
              <TextInput
                style={s.textArea}
                value={responses[question] ?? ""}
                onChangeText={(text) =>
                  setResponses((prev) => ({ ...prev, [question]: text }))
                }
                placeholder="Write freely..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          ))}

          <View style={s.actionRow}>
            <Pressable
              style={s.secondaryButton}
              onPress={() => {
                setActiveType(null);
                setResponses({});
              }}
            >
              <Text style={s.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.primaryButton, submitting && s.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.primaryButtonText}>Complete Reflection</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Main list view ──
  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        <Text style={s.screenTitle}>Reflections</Text>

        {/* Template picker */}
        <Text style={s.sectionEyebrow}>CHECK IN</Text>
        <Text style={s.sectionTitle}>Structured reflections</Text>

        <View style={s.templateGrid}>
          {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(
            ([key, tmpl]) => (
              <Pressable
                key={key}
                style={s.templateCard}
                onPress={() => {
                  setActiveType(key);
                  setResponses({});
                }}
              >
                <Text style={s.templateEmoji}>{tmpl.emoji}</Text>
                <Text style={s.templateName}>{tmpl.name}</Text>
                <Text style={s.templateMeta}>{tmpl.questions.length} questions</Text>
              </Pressable>
            )
          )}
        </View>

        {/* Past reflections */}
        {reflections.length > 0 && (
          <>
            <Text style={[s.sectionEyebrow, { marginTop: 32 }]}>HISTORY</Text>
            <Text style={s.sectionTitle}>Past reflections</Text>

            {reflections.map((r) => (
              <View key={r.id} style={s.card}>
                <View style={s.cardHeaderRow}>
                  <View style={s.cardHeaderLeft}>
                    <View style={s.pill}>
                      <Text style={s.pillText}>{r.reflection_type}</Text>
                    </View>
                    <Text style={s.cardMeta}>{r.period_label}</Text>
                  </View>
                  <Text style={s.cardMeta}>{formatDate(r.created_at)}</Text>
                </View>

                {r.ai_summary ? (
                  <Text style={s.aiSummary}>{r.ai_summary}</Text>
                ) : null}

                {r.ai_patterns && r.ai_patterns.length > 0 && (
                  <View style={s.patternsRow}>
                    {r.ai_patterns.map((p, i) => (
                      <View key={i} style={s.pill}>
                        <Text style={s.pillText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {reflections.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyText}>
              No reflections yet. Choose a template above to begin your first check-in.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BRAND = "#7e22ce";

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 28, fontWeight: "700", color: "#111", marginBottom: 24 },
  sectionEyebrow: { fontSize: 12, fontWeight: "600", color: BRAND, letterSpacing: 1, marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 12 },

  // Template picker
  templateGrid: { gap: 10, marginBottom: 8 },
  templateCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  templateEmoji: { fontSize: 28 },
  templateName: { fontSize: 16, fontWeight: "600", color: "#111" },
  templateMeta: { fontSize: 12, color: "#999" },

  // Form
  formIntro: { fontSize: 14, color: "#666", lineHeight: 22, textAlign: "center", marginBottom: 20 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  textArea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#fff",
    minHeight: 80,
  },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 8, justifyContent: "center" },
  primaryButton: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    flex: 1,
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  secondaryButtonText: { fontSize: 15, color: "#333", fontWeight: "500" },
  buttonDisabled: { opacity: 0.6 },

  // History cards
  card: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardMeta: { fontSize: 12, color: "#999" },
  pill: {
    backgroundColor: "rgba(126, 34, 206, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, color: BRAND, fontWeight: "500", textTransform: "capitalize" },
  aiSummary: { fontSize: 14, color: "#666", fontStyle: "italic", lineHeight: 21, marginBottom: 8 },
  patternsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 22 },
});
