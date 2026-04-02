/**
 * GoalUpdateScreen
 *
 * API endpoints:
 *  - POST /api/v1/goals/{id}/updates
 *
 * Components needed:
 *  - Progress input (slider / numeric)
 *  - Notes text area
 *  - Submit button
 */
import { View, Text, SafeAreaView } from "react-native";

export function GoalUpdateScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Update Progress</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Log your progress</Text>
    </SafeAreaView>
  );
}
