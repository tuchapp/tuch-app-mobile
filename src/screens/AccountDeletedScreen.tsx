/**
 * AccountDeletedScreen
 *
 * Static content.
 *
 * Components needed:
 *  - Confirmation message
 *  - Farewell text
 *  - Return-to-login button
 */
import { View, Text, SafeAreaView } from "react-native";

export function AccountDeletedScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Account Deleted</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Your account has been removed</Text>
    </SafeAreaView>
  );
}
