/**
 * ResetPasswordScreen
 *
 * API endpoints:
 *  - supabase.auth.getSession()
 *  - supabase.auth.updateUser()
 *
 * Components needed:
 *  - New password input
 *  - Confirm password input
 *  - Submit button
 */
import { View, Text, SafeAreaView } from "react-native";

export function ResetPasswordScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Reset Password</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Choose a new password</Text>
    </SafeAreaView>
  );
}
