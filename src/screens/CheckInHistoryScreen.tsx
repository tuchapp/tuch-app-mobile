/**
 * CheckInHistoryScreen
 *
 * API endpoints:
 *  - GET /api/v1/goals/check-ins?page_size=30
 *  - GET /api/v1/goals
 *
 * Components needed:
 *  - Check-in list (FlatList with pagination)
 *  - Check-in card component
 *  - Filter by goal
 */
import { View, Text, SafeAreaView } from "react-native";

export function CheckInHistoryScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Check-in History</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>All your check-in responses</Text>
    </SafeAreaView>
  );
}
