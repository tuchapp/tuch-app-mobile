/**
 * GoalsScreen
 *
 * API endpoints:
 *  - GET  /api/v1/goals
 *  - POST /api/v1/goals
 *  - POST /api/v1/goals/clarity
 *
 * Components needed:
 *  - Goals list (FlatList)
 *  - Goal card component
 *  - Add-goal FAB / button
 *  - Goal clarity wizard
 */
import { View, Text, SafeAreaView } from "react-native";

export function GoalsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Goals</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Track your goals</Text>
    </SafeAreaView>
  );
}
