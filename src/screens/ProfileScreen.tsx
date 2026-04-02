/**
 * ProfileScreen
 *
 * API endpoints:
 *  - GET /api/v1/users/me
 *  - GET /api/v1/profiles/me
 *
 * Components needed:
 *  - Avatar display
 *  - User info fields (name, email, etc.)
 *  - Edit-profile button
 *  - Subscription status badge
 */
import { View, Text, SafeAreaView } from "react-native";

export function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Profile</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Your profile info</Text>
    </SafeAreaView>
  );
}
