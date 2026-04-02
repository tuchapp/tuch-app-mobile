/**
 * SettingsScreen
 *
 * Coaching tone, timezone, message length, check-in time, summary frequency,
 * quiet hours, email/SMS/push toggles, sign-out, and account deletion.
 *
 * API:
 *  - GET   /api/v1/users/me
 *  - GET   /api/v1/preferences/me
 *  - PATCH /api/v1/users/me
 *  - PATCH /api/v1/preferences/me
 *  - DELETE /api/v1/users/me
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPatch, apiDelete } from "../lib/api";
import { supabase } from "../lib/supabase";
import {
  COACHING_TONES,
  DEFAULT_COACHING_TONE,
} from "../utils/coaching-tones";
import type {
  ApiEnvelope,
  UserAccount,
  UserPreferences,
} from "../types/api-types";

// ── Picker options ──────────────────────────────────────────────────────
const MESSAGE_LENGTHS = [
  { value: "short", label: "Concise" },
  { value: "medium", label: "Standard" },
  { value: "long", label: "Detailed" },
];
const SUMMARY_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const CONFIRM_PHRASE = "DELETE";

export function SettingsScreen() {
  // ── Remote data ─────────────────────────────────────────────────────
  const [user, setUser] = useState<UserAccount | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Form fields ─────────────────────────────────────────────────────
  const [coachingTone, setCoachingTone] = useState<string>(DEFAULT_COACHING_TONE);
  const [messageLength, setMessageLength] = useState("medium");
  const [checkInTime, setCheckInTime] = useState("");
  const [summaryFrequency, setSummaryFrequency] = useState("weekly");
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [pushOptIn, setPushOptIn] = useState(false);

  // ── Account delete ──────────────────────────────────────────────────
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([
        apiGet<ApiEnvelope<UserAccount>>("/api/v1/users/me"),
        apiGet<ApiEnvelope<UserPreferences>>("/api/v1/preferences/me"),
      ]);
      setUser(u.data);
      setPrefs(p.data);

      setCoachingTone(p.data.coaching_tone ?? DEFAULT_COACHING_TONE);
      setMessageLength(p.data.preferred_message_length ?? "medium");
      setCheckInTime(p.data.preferred_check_in_time ?? "");
      setSummaryFrequency(p.data.summary_frequency ?? "weekly");
      setQuietStart(p.data.quiet_hours_start ?? "");
      setQuietEnd(p.data.quiet_hours_end ?? "");
      setEmailOptIn(p.data.email_opt_in ?? true);
      setSmsOptIn(p.data.sms_opt_in ?? true);
      setPushOptIn(p.data.push_opt_in ?? false);
      setError(null);
    } catch {
      setError("Could not load settings. Pull to retry.");
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

  // ── Save ────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        apiPatch("/api/v1/users/me", {
          timezone: user?.timezone ?? null,
        }),
        apiPatch("/api/v1/preferences/me", {
          coaching_tone: coachingTone,
          preferred_message_length: messageLength,
          preferred_check_in_time: checkInTime || null,
          summary_frequency: summaryFrequency,
          quiet_hours_start: quietStart || null,
          quiet_hours_end: quietEnd || null,
          email_opt_in: emailOptIn,
          sms_opt_in: smsOptIn,
          push_opt_in: pushOptIn,
        }),
      ]);
      setSuccessMsg("Settings saved.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError("Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Sign out ────────────────────────────────────────────────────────
  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  // ── Account delete ──────────────────────────────────────────────────
  async function handleDelete() {
    if (deletePhrase !== CONFIRM_PHRASE) return;
    setDeleting(true);
    try {
      await apiDelete("/api/v1/users/me");
      await supabase.auth.signOut();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Account deletion failed.",
      );
      setDeleting(false);
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
        <Text style={s.heading}>Settings</Text>

        {error && <Text style={s.errorBanner}>{error}</Text>}
        {successMsg && <Text style={s.successBanner}>{successMsg}</Text>}

        {/* ── Coaching tone ── */}
        <View style={s.section}>
          <Text style={s.eyebrow}>Coaching</Text>
          <Text style={s.sectionTitle}>Coaching tone</Text>
          <Text style={s.muted}>
            Choose how your coach communicates.
          </Text>
          <View style={s.toneGrid}>
            {COACHING_TONES.map((tone) => (
              <Pressable
                key={tone.value}
                style={[
                  s.toneCard,
                  coachingTone === tone.value && s.toneCardActive,
                ]}
                onPress={() => setCoachingTone(tone.value)}
              >
                <Text
                  style={[
                    s.toneLabel,
                    coachingTone === tone.value && s.toneLabelActive,
                  ]}
                >
                  {tone.label}
                </Text>
                <Text style={s.toneDesc}>{tone.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Timezone ── */}
        <View style={s.section}>
          <Text style={s.eyebrow}>General</Text>
          <Text style={s.sectionTitle}>Timezone</Text>
          <View style={s.readOnlyRow}>
            <Text style={s.readOnlyValue}>
              {user?.timezone ?? "Not set"}
            </Text>
            <Text style={s.muted}>Auto-detected from your device</Text>
          </View>
        </View>

        {/* ── Message length ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Message length</Text>
          <View style={s.chipRow}>
            {MESSAGE_LENGTHS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  s.chip,
                  messageLength === opt.value && s.chipActive,
                ]}
                onPress={() => setMessageLength(opt.value)}
              >
                <Text
                  style={[
                    s.chipText,
                    messageLength === opt.value && s.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Check-in time ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Check-in time</Text>
          <Text style={s.muted}>HH:MM format (e.g. 09:00)</Text>
          <TextInput
            style={s.input}
            value={checkInTime}
            onChangeText={setCheckInTime}
            placeholder="09:00"
            placeholderTextColor="#999"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* ── Summary frequency ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Summary frequency</Text>
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

        {/* ── Quiet hours ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quiet hours</Text>
          <Text style={s.muted}>HH:MM format</Text>
          <View style={s.rowInputs}>
            <View style={s.halfInput}>
              <Text style={s.label}>Start</Text>
              <TextInput
                style={s.input}
                value={quietStart}
                onChangeText={setQuietStart}
                placeholder="22:00"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={s.halfInput}>
              <Text style={s.label}>End</Text>
              <TextInput
                style={s.input}
                value={quietEnd}
                onChangeText={setQuietEnd}
                placeholder="07:00"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        </View>

        {/* ── Notification toggles ── */}
        <View style={s.section}>
          <Text style={s.eyebrow}>Notifications</Text>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Email notifications</Text>
            <Switch
              value={emailOptIn}
              onValueChange={setEmailOptIn}
              trackColor={{ false: "#d1d5db", true: "#c084fc" }}
              thumbColor={emailOptIn ? "#7e22ce" : "#f4f3f4"}
            />
          </View>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>SMS notifications</Text>
            <Switch
              value={smsOptIn}
              onValueChange={setSmsOptIn}
              trackColor={{ false: "#d1d5db", true: "#c084fc" }}
              thumbColor={smsOptIn ? "#7e22ce" : "#f4f3f4"}
            />
          </View>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Push notifications</Text>
            <Switch
              value={pushOptIn}
              onValueChange={setPushOptIn}
              trackColor={{ false: "#d1d5db", true: "#c084fc" }}
              thumbColor={pushOptIn ? "#7e22ce" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* ── Save button ── */}
        <Pressable
          style={[s.button, saving && s.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.buttonText}>Save settings</Text>
          )}
        </Pressable>

        {/* ── Sign out ── */}
        <View style={s.section}>
          <Pressable style={s.signOutButton} onPress={handleSignOut}>
            <Text style={s.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        {/* ── Danger zone ── */}
        <View style={[s.section, s.dangerSection]}>
          <Text style={s.eyebrow}>Danger zone</Text>
          <Text style={s.sectionTitle}>Delete account</Text>
          <Text style={s.muted}>
            Permanently deletes your account and all associated data -- goals,
            journal entries, check-in history, preferences, and coaching memory.
            Once deleted, your data cannot be recovered.
          </Text>

          {deleteStep === "idle" ? (
            <Pressable
              style={s.dangerButton}
              onPress={() => setDeleteStep("confirm")}
            >
              <Text style={s.dangerButtonText}>Delete my account</Text>
            </Pressable>
          ) : (
            <View style={s.deleteConfirmBox}>
              <Text style={s.label}>
                Type {CONFIRM_PHRASE} to confirm
              </Text>
              <TextInput
                style={s.input}
                value={deletePhrase}
                onChangeText={setDeletePhrase}
                placeholder={CONFIRM_PHRASE}
                placeholderTextColor="#999"
                autoCapitalize="characters"
                autoComplete="off"
                editable={!deleting}
              />
              <View style={s.deleteActions}>
                <Pressable
                  style={s.ghostButton}
                  onPress={() => {
                    setDeleteStep("idle");
                    setDeletePhrase("");
                  }}
                  disabled={deleting}
                >
                  <Text style={s.ghostButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    s.dangerButton,
                    (deleting || deletePhrase !== CONFIRM_PHRASE) &&
                      s.buttonDisabled,
                  ]}
                  onPress={handleDelete}
                  disabled={deleting || deletePhrase !== CONFIRM_PHRASE}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.dangerButtonText}>
                      Yes, delete everything
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
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
  sectionTitle: { fontSize: 17, fontWeight: "600", color: "#111", marginBottom: 4 },
  muted: { fontSize: 13, color: "#666", marginBottom: 10 },

  readOnlyRow: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 14,
  },
  readOnlyValue: { fontSize: 15, color: "#111", fontWeight: "500", marginBottom: 2 },

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
  rowInputs: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1 },

  // Coaching tone grid
  toneGrid: { gap: 10, marginTop: 4 },
  toneCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
  },
  toneCardActive: {
    borderColor: "#7e22ce",
    backgroundColor: "#faf5ff",
  },
  toneLabel: { fontSize: 15, fontWeight: "600", color: "#333" },
  toneLabelActive: { color: "#7e22ce" },
  toneDesc: { fontSize: 13, color: "#666", marginTop: 2 },

  // Chip selector
  chipRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
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

  // Switch rows
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  switchLabel: { fontSize: 15, color: "#333" },

  // Buttons
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  ghostButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  ghostButtonText: { fontSize: 15, color: "#333", fontWeight: "500" },

  signOutButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { fontSize: 16, color: "#333", fontWeight: "600" },

  // Danger zone
  dangerSection: {
    borderTopWidth: 1,
    borderTopColor: "#fca5a5",
    paddingTop: 20,
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  deleteConfirmBox: { gap: 10, marginTop: 8 },
  deleteActions: { flexDirection: "row", gap: 12 },
});
