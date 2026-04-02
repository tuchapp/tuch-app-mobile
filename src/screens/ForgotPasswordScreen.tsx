/**
 * ForgotPasswordScreen
 *
 * Lets the user request a password-reset email.
 * API: POST /api/v1/auth/forgot-password (unauthenticated)
 */
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { AuthStackParamList } from "../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email) {
      setError("Enter the email address attached to your account.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiRequest(
        "/api/v1/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
        { noAuth: true },
      );
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Request failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
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
          {/* Brand */}
          <Text style={s.brand}>Tuch</Text>

          {sent ? (
            /* ── Success state ── */
            <View style={s.successBox}>
              <Text style={s.successIcon}>✉</Text>
              <Text style={s.successTitle}>Check your inbox.</Text>
              <Text style={s.successBody}>
                If <Text style={s.bold}>{email}</Text> is attached to a Tuch
                account, you will receive a password reset link shortly.
              </Text>
              <Pressable
                style={s.secondaryButton}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={s.secondaryButtonText}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            /* ── Request form ── */
            <View style={s.form}>
              <Text style={s.title}>Reset your password.</Text>
              <Text style={s.subtitle}>
                Enter the email address on your account. We'll send you a secure
                link to set a new password.
              </Text>

              <Text style={s.label}>Email address</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#999"
                editable={!loading}
              />

              {error && <Text style={s.error}>{error}</Text>}

              <Pressable
                style={[s.button, loading && s.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.buttonText}>Send reset link</Text>
                )}
              </Pressable>

              <View style={s.switchPrompt}>
                <Text style={s.switchLabel}>Remember your password?</Text>
                <Pressable onPress={() => navigation.navigate("Login")}>
                  <Text style={s.switchCta}>Sign in instead.</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60 },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 32,
    color: "#7e22ce",
  },
  form: { gap: 12 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
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
  error: {
    fontSize: 14,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    overflow: "hidden",
  },
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchPrompt: { alignItems: "center", marginTop: 24, gap: 6 },
  switchLabel: { fontSize: 15, color: "#666" },
  switchCta: { fontSize: 15, color: "#7e22ce", fontWeight: "600" },
  successBox: { alignItems: "center", gap: 12, paddingVertical: 24 },
  successIcon: { fontSize: 48 },
  successTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  successBody: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
  bold: { fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  secondaryButtonText: { fontSize: 15, color: "#333", fontWeight: "500" },
});
