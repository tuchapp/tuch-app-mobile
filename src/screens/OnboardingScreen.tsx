/**
 * OnboardingScreen
 *
 * API endpoints:
 *  - PATCH /api/v1/profiles/me
 *  - PATCH /api/v1/users/me
 *  - POST  /api/v1/onboarding/responses
 *  - PATCH /api/v1/preferences/me
 *  - POST  /api/v1/onboarding/complete
 *
 * Components needed:
 *  - Multi-step wizard / stepper
 *  - Profile fields (name, avatar, etc.)
 *  - Onboarding question cards
 *  - Preference toggles
 *  - Progress indicator
 */
import { View, Text, SafeAreaView } from "react-native";

export function OnboardingScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Onboarding</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Welcome! Let us set up your account.</Text>
    </SafeAreaView>
  );
}
