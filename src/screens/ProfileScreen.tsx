/**
 * ProfileScreen
 *
 * Fetch user account + profile, display PII (obscured), allow inline
 * editing of first_name and last_name, pull-to-refresh.
 *
 * API:
 *  - GET  /api/v1/users/me
 *  - GET  /api/v1/profiles/me
 *  - PATCH /api/v1/profiles/me
 */
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPatch } from "../lib/api";
import { obscureLastName, obscureEmail, obscurePhone } from "../utils/obscure";
import type { ApiEnvelope, UserAccount, UserProfile } from "../types/api-types";

export function ProfileScreen() {
  // ── Data state ──────────────────────────────────────────────────────
  const [user, setUser] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Edit state ──────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([
        apiGet<ApiEnvelope<UserAccount>>("/api/v1/users/me"),
        apiGet<ApiEnvelope<UserProfile>>("/api/v1/profiles/me"),
      ]);
      setUser(u.data);
      setProfile(p.data);
      setFirstName(p.data.first_name ?? "");
      setLastName(p.data.last_name ?? "");
      setError(null);
    } catch {
      setError("Could not load your profile. Pull to retry.");
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

  // ── Save edits ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!firstName.trim()) {
      Alert.alert("Validation", "First name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await apiPatch("/api/v1/profiles/me", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setProfile((prev) =>
        prev
          ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim() }
          : prev,
      );
      setEditing(false);
      setSuccessMsg("Profile updated.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      Alert.alert("Error", "Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setEditing(false);
  }

  // ── Loading state ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#7e22ce" />
        </View>
      </SafeAreaView>
    );
  }

  const initials = ((profile?.first_name ?? "T")[0] ?? "T").toUpperCase();

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
        <Text style={s.heading}>Your profile</Text>

        {error && <Text style={s.errorBanner}>{error}</Text>}

        {/* Avatar + name */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.displayName}>
            {profile?.first_name || "Tuch user"}
          </Text>
        </View>

        {/* Account details card */}
        <View style={s.card}>
          <Text style={s.eyebrow}>Account details</Text>

          {editing ? (
            <>
              <Text style={s.label}>First name</Text>
              <TextInput
                style={s.input}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                placeholder="First name"
                placeholderTextColor="#999"
              />

              <Text style={s.label}>Last name</Text>
              <TextInput
                style={s.input}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                placeholder="Last name"
                placeholderTextColor="#999"
              />

              <View style={s.editActions}>
                <Pressable
                  style={[s.button, saving && s.buttonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.buttonText}>Save changes</Text>
                  )}
                </Pressable>
                <Pressable style={s.ghostButton} onPress={cancelEdit}>
                  <Text style={s.ghostButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={s.row}>
                <Text style={s.rowLabel}>First name</Text>
                <Text style={s.rowValue}>{profile?.first_name ?? "--"}</Text>
              </View>

              <View style={s.row}>
                <Text style={s.rowLabel}>Last name</Text>
                <Text style={s.rowValue}>
                  {obscureLastName(profile?.last_name)}
                </Text>
              </View>

              <View style={s.row}>
                <Text style={s.rowLabel}>Email</Text>
                <Text style={s.rowValue}>{obscureEmail(user?.email)}</Text>
              </View>

              <View style={s.row}>
                <Text style={s.rowLabel}>Phone</Text>
                <Text style={s.rowValue}>
                  {obscurePhone(user?.phone) ?? "Not added"}
                </Text>
              </View>

              <View style={s.row}>
                <Text style={s.rowLabel}>Timezone</Text>
                <Text style={s.rowValue}>{user?.timezone ?? "--"}</Text>
              </View>

              <Pressable
                style={s.editButton}
                onPress={() => setEditing(true)}
              >
                <Text style={s.editButtonText}>Edit name</Text>
              </Pressable>
            </>
          )}

          {successMsg && <Text style={s.successMsg}>{successMsg}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 24, paddingTop: 16 },
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

  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#7e22ce",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  displayName: { fontSize: 18, fontWeight: "600", color: "#111" },

  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7e22ce",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  rowLabel: { fontSize: 14, fontWeight: "600", color: "#555" },
  rowValue: { fontSize: 14, color: "#111" },

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
    marginBottom: 8,
  },
  editActions: { gap: 10, marginTop: 8 },
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  ghostButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  ghostButtonText: { fontSize: 15, color: "#333", fontWeight: "500" },

  editButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  editButtonText: { color: "#7e22ce", fontSize: 15, fontWeight: "600" },

  successMsg: {
    fontSize: 14,
    color: "#16a34a",
    textAlign: "center",
    marginTop: 4,
  },
});
