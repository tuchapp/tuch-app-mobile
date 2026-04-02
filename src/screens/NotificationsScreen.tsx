/**
 * NotificationsScreen (Check-ins)
 *
 * Active goals with accountability schedules, nudges for goals missing
 * schedules, email/SMS opt-in toggles, check-in time, summary frequency.
 *
 * API:
 *  - GET   /api/v1/preferences/me
 *  - GET   /api/v1/goals
 *  - PATCH /api/v1/preferences/me
 */
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPatch } from "../lib/api";
import type {
  ApiEnvelope,
  Goal,
  UserPreferences,
} from "../types/api-types";

const SUMMARY_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function NotificationsScreen() {
  // ── Data ────────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Form fields ─────────────────────────────────────────────────────
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");
  const [summaryFrequency, setSummaryFrequency] = useState("weekly");

  // ── Fetch ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [p, g] = await Promise.all([
        apiGet<ApiEnvelope<UserPreferences>>("/api/v1/preferences/me"),
        apiGet<{ data: Goal[] }>("/api/v1/goals"),
      ]);
      setPrefs(p.data);
      setGoals(g.data);
      setEmailOptIn(p.data.email_opt_in ?? false);
      setSmsOptIn(p.data.sms_opt_in ?? false);
      setCheckInTime(p.data.preferred_check_in_time ?? "");
      setSummaryFrequency(p.data.summary_frequency ?? "weekly");
      setError(null);
    } catch {
      setError("Could not load notification settings. Pull to retry.");
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

  // ── Derived ─────────────────────────────────────────────────────────
  const activeGoals = goals.filter((g) => g.status === "active");
  const goalsWithSchedule = activeGoals.filter(
    (g) => g.accountability_frequency,
  );
  const goalsWithoutSchedule = activeGoals.filter(
    (g) => !g.accountability_frequency,
  );

  // ── Save ────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiPatch("/api/v1/preferences/me", {
        email_opt_in: emailOptIn,
        sms_opt_in: smsOptIn,
        push_opt_in: false,
        preferred_check_in_time: checkInTime || null,
        summary_frequency: summaryFrequency || null,
      });
      setSuccessMsg("Preferences saved.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError("Could not save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#7e22ce" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7e22ce"
          />
        }
      >
        <Text style={s.heading}>Check-ins</Text>

        {error && <Text style={s.errorBanner}>{error}</Text>}
        {successMsg && <Text style={s.successBanner}>{successMsg}</Text>}

        {/* ── Goal check-in schedule ── */}
        <View style={s.section}>
          <Text style={s.eyebrow}>Active goals</Text>
          <Text style={s.sectionTitle}>Check-in schedule</Text>

          {activeGoals.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>
                No active goals yet. Create a goal to activate check-in
                reminders.
              </Text>
            </View>
          ) : (
            <>
              {goalsWithSchedule.length > 0 && (
                <View style={s.goalList}>
                  {goalsWithSchedule.map((goal) => (
                    <View key={goal.id} style={s.goalCard}>
                      <View style={s.goalRow}>
                        <Text style={s.goalTitle} numberOfLines={1}>
                          {goal.title}
                        </Text>
                        <View style={s.pillActive}>
                          <Text style={s.pillText}>
                            {goal.accountability_frequency?.replace(/_/g, " ")}
                          </Text>
                        </View>
                      </View>
                      {goal.target_date && (
                        <Text style={s.goalMeta}>Due {goal.target_date}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {goalsWithoutSchedule.length > 0 && (
                <View style={s.nudgeSection}>
                  <Text style={s.nudgeText}>
                    {goalsWithoutSchedule.length} active goal
                    {goalsWithoutSchedule.length === 1 ? "" : "s"} without a
                    check-in schedule -- reminders won't fire until this is set.
                  </Text>
                  {goalsWithoutSchedule.map((goal) => (
                    <View key={goal.id} style={s.nudgeRow}>
                      <Text style={s.nudgeGoalTitle} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      <View style={s.pillMissing}>
                        <Text style={s.pillMissingText}>No schedule</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Delivery preferences ── */}
        <View style={s.section}>
          <Text style={s.eyebrow}>Preferences</Text>
          <Text style={s.sectionTitle}>Check-in delivery</Text>
          <Text style={s.muted}>
            Choose how and when Tuch sends your accountability check-in
            reminders.
          </Text>

          {/* Toggles */}
          <View style={s.switchRow}>
            <View style={s.switchInfo}>
              <Text style={s.switchLabel}>Email</Text>
              <Text style={s.switchHint}>Reminders sent to your inbox</Text>
            </View>
            <Switch
              value={emailOptIn}
              onValueChange={setEmailOptIn}
              trackColor={{ false: "#d1d5db", true: "#c084fc" }}
              thumbColor={emailOptIn ? "#7e22ce" : "#f4f3f4"}
            />
          </View>
          <View style={s.switchRow}>
            <View style={s.switchInfo}>
              <Text style={s.switchLabel}>SMS</Text>
              <Text style={s.switchHint}>
                Reminders sent as text messages
              </Text>
            </View>
            <Switch
              value={smsOptIn}
              onValueChange={setSmsOptIn}
              trackColor={{ false: "#d1d5db", true: "#c084fc" }}
              thumbColor={smsOptIn ? "#7e22ce" : "#f4f3f4"}
            />
          </View>

          {/* Check-in time */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Preferred check-in time</Text>
            <Text style={s.fieldHint}>Daily reminder window (HH:MM)</Text>
            <TextInput
              style={s.input}
              value={checkInTime}
              onChangeText={setCheckInTime}
              placeholder="09:00"
              placeholderTextColor="#999"
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Summary frequency */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Review frequency</Text>
            <View style={s.chipRow}>
              {SUMMARY_FREQUENCIES.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    s.chip,
                    summaryFrequency === opt.value && s.chipActive,
                  ]}
                  onPress={() => setSummaryFrequency(opt.value)}
                >
                  <Text
                    style={[
                      s.chipText,
                      summaryFrequency === opt.value && s.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── Save ── */}
        <Pressable
          style={[s.button, saving && s.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.buttonText}>Save preferences</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 24, paddingTop: 16, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: "700", color: "#111", marginBottom: 20 },

  errorBanner: {
    fontSize: 14,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  successBanner: {
    fontSize: 14,
    color: "#16a34a",
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    overflow: "hidden",
  },

  section: { marginBottom: 28 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7e22ce",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  muted: { fontSize: 13, color: "#666", marginBottom: 12 },

  // Goal cards
  goalList: { gap: 8, marginTop: 8 },
  goalCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 14,
  },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalTitle: { fontSize: 15, fontWeight: "600", color: "#111", flex: 1, marginRight: 10 },
  pillActive: {
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { fontSize: 12, fontWeight: "500", color: "#16a34a" },
  goalMeta: { fontSize: 12, color: "#888", marginTop: 4 },

  // Nudge section
  nudgeSection: {
    marginTop: 12,
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 14,
  },
  nudgeText: { fontSize: 13, color: "#92400e", marginBottom: 8 },
  nudgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
  },
  nudgeGoalTitle: { fontSize: 14, color: "#333", flex: 1, marginRight: 10 },
  pillMissing: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillMissingText: { fontSize: 12, fontWeight: "500", color: "#92400e" },

  emptyBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
  },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center" },

  // Toggle rows
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 15, fontWeight: "600", color: "#333" },
  switchHint: { fontSize: 12, color: "#888", marginTop: 2 },

  // Field groups
  fieldGroup: { marginTop: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  fieldHint: { fontSize: 12, color: "#888", marginBottom: 6 },
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

  // Chips
  chipRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 6 },
  chip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  chipActive: { borderColor: "#7e22ce", backgroundColor: "#faf5ff" },
  chipText: { fontSize: 14, color: "#555" },
  chipTextActive: { color: "#7e22ce", fontWeight: "600" },

  // Save button
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
