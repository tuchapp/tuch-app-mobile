/**
 * HabitsScreen
 *
 * API endpoints:
 *  - GET  /api/v1/habits
 *  - POST /api/v1/habits
 *  - POST /api/v1/habits/{id}/log
 *  - POST /api/v1/habits/{id}/archive
 *
 * Components needed:
 *  - Habits list with daily toggle
 *  - Add-habit form
 *  - Streak indicator
 *  - Archive action
 */
import { View, Text, SafeAreaView } from "react-native";

export function HabitsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Habits</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Build better habits</Text>
    </SafeAreaView>
  );
}
