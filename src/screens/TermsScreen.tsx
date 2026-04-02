/**
 * TermsScreen
 *
 * Static content.
 *
 * Components needed:
 *  - Terms of service text (ScrollView)
 *  - Last-updated date
 */
import { View, Text, SafeAreaView } from "react-native";

export function TermsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Terms and Conditions</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Terms of service</Text>
    </SafeAreaView>
  );
}
