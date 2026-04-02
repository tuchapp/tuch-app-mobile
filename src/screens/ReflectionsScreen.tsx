/**
 * ReflectionsScreen
 *
 * API endpoints:
 *  - GET  /api/v1/reflections
 *  - POST /api/v1/reflections
 *
 * Components needed:
 *  - Reflection prompts / questions
 *  - Reflection history list
 *  - New reflection form
 */
import { View, Text, SafeAreaView } from "react-native";

export function ReflectionsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Reflections</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Structured reflection check-ins</Text>
    </SafeAreaView>
  );
}
