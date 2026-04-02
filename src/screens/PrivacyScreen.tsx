/**
 * PrivacyScreen
 *
 * Static content + account delete action.
 *
 * Components needed:
 *  - Privacy policy text
 *  - Data usage explanation
 *  - Delete-account button with confirmation modal
 */
import { View, Text, SafeAreaView } from "react-native";

export function PrivacyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Privacy</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Your data, your control</Text>
    </SafeAreaView>
  );
}
