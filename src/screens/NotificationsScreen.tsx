/**
 * NotificationsScreen
 *
 * API endpoints:
 *  - GET   /api/v1/preferences/me
 *  - GET   /api/v1/goals
 *  - PATCH /api/v1/preferences/me
 *
 * Components needed:
 *  - Notification preference toggles
 *  - Per-goal notification settings
 *  - Save button
 */
import { View, Text, SafeAreaView } from "react-native";

export function NotificationsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Notifications</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Manage notification preferences</Text>
    </SafeAreaView>
  );
}
