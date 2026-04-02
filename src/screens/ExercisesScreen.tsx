/**
 * ExercisesScreen
 *
 * API endpoints:
 *  - POST /api/v1/exercises/completions
 *
 * Components needed:
 *  - Exercise card list
 *  - Exercise detail / player view
 *  - Completion tracking
 */
import { View, Text, SafeAreaView } from "react-native";

export function ExercisesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Exercises</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Mindfulness exercises</Text>
    </SafeAreaView>
  );
}
