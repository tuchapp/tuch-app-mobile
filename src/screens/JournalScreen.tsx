/**
 * JournalScreen
 *
 * API endpoints:
 *  - GET  /api/v1/journals
 *  - POST /api/v1/journals
 *
 * Components needed:
 *  - Journal entries list (FlatList)
 *  - Journal entry card
 *  - New entry composer
 *  - Rich text / markdown input
 */
import { View, Text, SafeAreaView } from "react-native";

export function JournalScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Journal</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Write and reflect</Text>
    </SafeAreaView>
  );
}
