/**
 * ForgotPasswordScreen
 *
 * API endpoints:
 *  - POST /api/v1/auth/forgot-password
 *
 * Components needed:
 *  - Email input
 *  - Submit button
 *  - Back-to-login link
 */
import { View, Text, SafeAreaView } from "react-native";

export function ForgotPasswordScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Forgot Password</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Enter your email to reset</Text>
    </SafeAreaView>
  );
}
