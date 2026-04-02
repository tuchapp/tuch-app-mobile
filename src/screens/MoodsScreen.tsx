/**
 * MoodsScreen
 *
 * API endpoints:
 *  - GET  /api/v1/moods
 *  - GET  /api/v1/moods/summary
 *  - POST /api/v1/moods
 *
 * Components needed:
 *  - Mood picker (emoji / slider)
 *  - Mood history list
 *  - Mood summary chart
 */
import { View, Text, SafeAreaView } from "react-native";

export function MoodsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Moods</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Track your mood</Text>
    </SafeAreaView>
  );
}
