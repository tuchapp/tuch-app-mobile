/**
 * GoalDetailScreen
 *
 * API endpoints:
 *  - GET /api/v1/goals/{id}
 *  - GET /api/v1/goals/{id}/check-ins
 *
 * Components needed:
 *  - Goal header (title, status, progress)
 *  - Check-in history list
 *  - Edit / Delete actions
 *  - Update-progress button
 */
import { View, Text, SafeAreaView } from "react-native";

export function GoalDetailScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Goal Detail</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>View goal details</Text>
    </SafeAreaView>
  );
}
