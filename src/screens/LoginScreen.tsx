/**
 * LoginScreen — Sign-in / Sign-up tabs
 *
 * Supabase: supabase.auth.signUp(), supabase.auth.setSession()
 * API: POST /api/v1/auth/password-login, POST /api/v1/auth/me
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
import { supabase } from "../lib/supabase";
import { apiPost } from "../lib/api";
import { validatePassword, PASSWORD_RULES } from "../utils/password";
import type { AuthStackParamList } from "../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;
type Mode = "signin" | "signup";

export function LoginScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>("signin");

  // Sign-in state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sign-up state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);

  async function handlePasswordLogin() {
    if (!identifier || !password) {
      setPasswordMessage("Enter your email or username and password.");
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage(null);
    try {
      const body = await apiPost<{
        data: {
          session: { access_token: string; refresh_token: string };
        };
      }>("/api/v1/auth/password-login", { identifier, password });

      const session = body.data.session;
      if (!session?.access_token || !session?.refresh_token) {
        throw new Error("Sign-in did not return a usable session.");
      }

      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) throw error;

      // Bootstrap user row
      await apiPost("/api/v1/auth/me", {}).catch(() => null);
      // Auth state change listener in App.tsx handles navigation
    } catch (err) {
      setPasswordMessage(
        err instanceof Error ? err.message : "Sign-in failed."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleSignUp() {
    if (!signupEmail || !signupPassword || !signupConfirm) {
      setSignupMessage("Please fill in all fields.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupMessage("Passwords do not match.");
      return;
    }
    const pwError = validatePassword(signupPassword);
    if (pwError) {
      setSignupMessage(pwError);
      return;
    }
    setSignupLoading(true);
    setSignupMessage(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });
      if (error) throw error;

      if (data.session?.access_token) {
        await apiPost("/api/v1/auth/me", {}).catch(() => null);
      } else {
        setSignupSuccess(true);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Account creation failed.";
      const lower = msg.toLowerCase();
      if (
        lower.includes("already registered") ||
        lower.includes("already exists")
      ) {
        setSignupMessage(
          "An account with this email already exists. Try signing in instead."
        );
      } else {
        setSignupMessage(msg);
      }
    } finally {
      setSignupLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setPasswordMessage(null);
    setSignupMessage(null);
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
          <Text style={s.brand}>Tuch</Text>

          <View style={s.tabBar}>
            <Pressable
              style={[s.tab, mode === "signin" && s.tabActive]}
              onPress={() => switchMode("signin")}
            >
              <Text style={[s.tabText, mode === "signin" && s.tabTextActive]}>
                Sign in
              </Text>
            </Pressable>
            <Pressable
              style={[s.tab, mode === "signup" && s.tabActive]}
              onPress={() => switchMode("signup")}
            >
              <Text style={[s.tabText, mode === "signup" && s.tabTextActive]}>
                Create account
              </Text>
            </Pressable>
          </View>

          {mode === "signin" && (
            <View style={s.form}>
              <Text style={s.label}>Email or username</Text>
              <TextInput
                style={s.input}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#999"
              />

              <View style={s.labelRow}>
                <Text style={s.label}>Password</Text>
                <Pressable
                  onPress={() => navigation.navigate("ForgotPassword")}
                >
                  <Text style={s.forgotLink}>Forgot password?</Text>
                </Pressable>
              </View>
              <View style={s.passwordWrap}>
                <TextInput
                  style={[s.input, s.flex]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  autoComplete="password"
                  placeholder="Your password"
                  placeholderTextColor="#999"
                />
                <Pressable
                  style={s.toggleBtn}
                  onPress={() => setShowPw((v) => !v)}
                >
                  <Text style={s.toggleText}>{showPw ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>

              {passwordMessage && (
                <Text style={s.error}>{passwordMessage}</Text>
              )}

              <Pressable
                style={[s.button, passwordLoading && s.buttonDisabled]}
                onPress={handlePasswordLogin}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.buttonText}>Sign in</Text>
                )}
              </Pressable>

              <View style={s.switchPrompt}>
                <Text style={s.switchLabel}>New to Tuch?</Text>
                <Pressable onPress={() => switchMode("signup")}>
                  <Text style={s.switchCta}>Create your account</Text>
                </Pressable>
              </View>
            </View>
          )}

          {mode === "signup" && (
            <View style={s.form}>
              {signupSuccess ? (
                <View style={s.successBox}>
                  <Text style={s.successTitle}>Check your inbox.</Text>
                  <Text style={s.successBody}>
                    We sent a confirmation link to{" "}
                    <Text style={s.bold}>{signupEmail}</Text>. Tap it to
                    activate your account.
                  </Text>
                  <Pressable
                    style={s.secondaryButton}
                    onPress={() => switchMode("signin")}
                  >
                    <Text style={s.secondaryButtonText}>Back to sign in</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={s.label}>Email</Text>
                  <TextInput
                    style={s.input}
                    value={signupEmail}
                    onChangeText={setSignupEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor="#999"
                  />

                  <Text style={s.label}>Password</Text>
                  <View style={s.passwordWrap}>
                    <TextInput
                      style={[s.input, s.flex]}
                      value={signupPassword}
                      onChangeText={setSignupPassword}
                      secureTextEntry={!showSignupPw}
                      autoComplete="password-new"
                      placeholder={PASSWORD_RULES.placeholder}
                      placeholderTextColor="#999"
                    />
                    <Pressable
                      style={s.toggleBtn}
                      onPress={() => setShowSignupPw((v) => !v)}
                    >
                      <Text style={s.toggleText}>
                        {showSignupPw ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={s.hint}>{PASSWORD_RULES.hint}</Text>

                  <Text style={s.label}>Confirm password</Text>
                  <TextInput
                    style={s.input}
                    value={signupConfirm}
                    onChangeText={setSignupConfirm}
                    secureTextEntry={!showSignupPw}
                    autoComplete="password-new"
                    placeholder="Re-enter password"
                    placeholderTextColor="#999"
                  />

                  {/* SMS consent — required for carrier compliance */}
                  <Pressable
                    style={s.consentRow}
                    onPress={() => setSmsConsent((v) => !v)}
                  >
                    <View
                      style={[
                        s.checkbox,
                        smsConsent && s.checkboxChecked,
                      ]}
                    >
                      {smsConsent && (
                        <Text style={s.checkmark}>&#10003;</Text>
                      )}
                    </View>
                    <Text style={s.consentText}>
                      I agree to receive transactional SMS notifications from
                      Tuch (accountability check-ins and wellness reminders).
                      Msg frequency varies (typically 1-3/day). Msg&Data rates
                      may apply. Reply <Text style={s.bold}>STOP</Text> to opt
                      out, <Text style={s.bold}>HELP</Text> for help. Consent
                      is not required for purchase.
                    </Text>
                  </Pressable>

                  {signupMessage && (
                    <Text style={s.error}>{signupMessage}</Text>
                  )}

                  <Pressable
                    style={[s.button, signupLoading && s.buttonDisabled]}
                    onPress={handleSignUp}
                    disabled={signupLoading}
                  >
                    {signupLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.buttonText}>Create account</Text>
                    )}
                  </Pressable>

                  <Text style={s.termsNote}>
                    By creating an account you agree to our Terms and Privacy
                    Policy.
                  </Text>
                </>
              )}
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#fff", elevation: 1 },
  tabText: { fontSize: 15, color: "#666" },
  tabTextActive: { color: "#111", fontWeight: "600" },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  forgotLink: { fontSize: 13, color: "#7e22ce" },
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
  switchPrompt: { alignItems: "center", marginTop: 24, gap: 6 },
  switchLabel: { fontSize: 15, color: "#666" },
  switchCta: { fontSize: 15, color: "#7e22ce", fontWeight: "600" },
  successBox: { alignItems: "center", gap: 12, paddingVertical: 24 },
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
  termsNote: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#7e22ce",
    borderColor: "#7e22ce",
  },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
});
