/**
 * LoginScreen
 *
 * API endpoints:
 *  - POST /api/v1/auth/password-login
 *  - supabase.auth.signUp()
 *  - supabase.auth.setSession()
 *
 * Components needed:
 *  - Email input
 *  - Password input
 *  - Sign-in / Sign-up toggle
 *  - Submit button
 *  - Forgot-password link
 */
import { View, Text, SafeAreaView } from "react-native";

export function LoginScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Login</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Sign in or create account</Text>
    </SafeAreaView>
  );
}
