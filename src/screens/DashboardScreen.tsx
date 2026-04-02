/**
 * DashboardScreen
 *
 * API endpoints:
 *  - GET /api/v1/dashboard
 *  - GET /api/v1/moods?page_size=1
 *  - GET /api/v1/notifications
 *  - GET /api/v1/accountability/pending-actions
 *
 * Components needed:
 *  - Daily overview card
 *  - Latest mood indicator
 *  - Notification badge / list
 *  - Pending actions list
 *  - Quick-action buttons
 */
import { View, Text, SafeAreaView } from "react-native";

export function DashboardScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Dashboard</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Your daily overview</Text>
    </SafeAreaView>
  );
}
