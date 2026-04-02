/**
 * ResetPasswordScreen
 *
 * Lets the user set a new password after tapping the reset link.
 * Requires an active Supabase recovery session.
 *
 * Auth:
 *  - supabase.auth.getSession()  (verify recovery session)
 *  - supabase.auth.updateUser()  (set new password)
 */
import { useState, useEffect } from "react";
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
import { supabase } from "../lib/supabase";
import { validatePassword, PASSWORD_RULES } from "../utils/password";
import type { AuthStackParamList } from "../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export function ResetPasswordScreen({ navigation }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  // Verify an active recovery session exists; if not, go back to login.
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigation.replace("Login");
      } else {
        setSessionReady(true);
      }
    }
    checkSession();
  }, [navigation]);

  async function handleSubmit() {
    if (!password || !confirm) {
      setError("Please fill in both fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: sbError } = await supabase.auth.updateUser({ password });
      if (sbError) throw sbError;

      // Success — the auth state listener in App.tsx will detect the active
      // session and navigate to the main app automatically.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Password update failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Waiting for session check
  if (sessionReady === null) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#7e22ce" />
          <Text style={s.loadingText}>Verifying your reset link...</Text>
        </View>
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
          {/* Brand */}
          <Text style={s.brand}>Tuch</Text>

          <View style={s.form}>
            <Text style={s.title}>Set a new password.</Text>
            <Text style={s.subtitle}>
              Choose a strong password. You'll use it to sign in from now on.
            </Text>

            {/* New password */}
            <Text style={s.label}>New password</Text>
            <View style={s.passwordWrap}>
              <TextInput
                style={[s.input, s.flex]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoComplete="password-new"
                placeholder={PASSWORD_RULES.placeholder}
                placeholderTextColor="#999"
                editable={!loading}
              />
              <Pressable
                style={s.toggleBtn}
                onPress={() => setShowPw((v) => !v)}
              >
                <Text style={s.toggleText}>{showPw ? "Hide" : "Show"}</Text>
              </Pressable>
            </View>
            <Text style={s.hint}>{PASSWORD_RULES.hint}</Text>

            {/* Confirm password */}
            <Text style={s.label}>Confirm new password</Text>
            <View style={s.passwordWrap}>
              <TextInput
                style={[s.input, s.flex]}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPw}
                autoComplete="password-new"
                placeholder="Repeat your new password"
                placeholderTextColor="#999"
                editable={!loading}
              />
            </View>

            {error && <Text style={s.error}>{error}</Text>}

            <Pressable
              style={[s.button, loading && s.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.buttonText}>Save new password</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { fontSize: 15, color: "#666" },
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
  passwordWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleBtn: { paddingHorizontal: 8, paddingVertical: 12 },
  toggleText: { fontSize: 14, color: "#7e22ce", fontWeight: "500" },
  hint: { fontSize: 12, color: "#888", marginTop: -4 },
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
});
