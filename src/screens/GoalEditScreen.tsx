/**
 * GoalEditScreen
 *
 * API endpoints:
 *  - PATCH  /api/v1/goals/{id}
 *  - DELETE /api/v1/goals/{id}
 *
 * Components needed:
 *  - Goal form (title, description, target date, etc.)
 *  - Save button
 *  - Delete button with confirmation
 */
import { View, Text, SafeAreaView } from "react-native";

export function GoalEditScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Edit Goal</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Modify your goal</Text>
    </SafeAreaView>
  );
}
