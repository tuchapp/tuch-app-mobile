/**
 * SuccessScreen
 *
 * API endpoints:
 *  - GET /api/v1/stripe/subscription-status
 *
 * Components needed:
 *  - Success animation / icon
 *  - Subscription confirmation details
 *  - Continue / go-to-dashboard button
 */
import { View, Text, SafeAreaView } from "react-native";

export function SuccessScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Success!</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Subscription confirmed</Text>
    </SafeAreaView>
  );
}
