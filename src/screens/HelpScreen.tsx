/**
 * HelpScreen
 *
 * Static content.
 *
 * Components needed:
 *  - FAQ accordion / list
 *  - Contact support link
 *  - App version info
 */
import { View, Text, SafeAreaView } from "react-native";

export function HelpScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Help</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>FAQ and support</Text>
    </SafeAreaView>
  );
}
