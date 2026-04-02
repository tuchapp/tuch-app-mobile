/**
 * PricingScreen
 *
 * API endpoints:
 *  - POST /api/v1/stripe/checkout
 *
 * Components needed:
 *  - Plan comparison cards (Free vs Pro)
 *  - Feature list
 *  - Upgrade / checkout button
 *  - Current plan indicator
 */
import { View, Text, SafeAreaView } from "react-native";

export function PricingScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Pricing</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Upgrade to Tuch Pro</Text>
    </SafeAreaView>
  );
}
