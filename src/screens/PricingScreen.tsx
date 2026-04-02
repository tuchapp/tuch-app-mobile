/**
 * PricingScreen
 *
 * Tuch Pro feature list, subscribe button that hits the Stripe checkout
 * endpoint and opens the returned URL in the device browser.
 *
 * API:
 *  - POST /api/v1/stripe/checkout
 */
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { apiPost } from "../lib/api";

type CheckoutResponse = { data: { url: string } };

const FEATURES = [
  "Unlimited AI coach conversations",
  "SMS & email accountability check-ins",
  "Behavioral momentum & risk scoring",
  "Weekly reviews & daily summaries",
  "Goal detection & smart suggestions",
];

export function PricingScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<CheckoutResponse>(
        "/api/v1/stripe/checkout",
        {},
      );
      const url = res.data?.url;
      if (url) {
        await Linking.openURL(url);
      } else {
        setError("Could not start checkout. Please try again.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Brand */}
        <Text style={s.brand}>Tuch</Text>

        {/* Title */}
        <Text style={s.title}>Tuch Pro</Text>
        <Text style={s.subtitle}>
          Full access to AI coaching, accountability reminders, behavioral
          insights, and everything Tuch offers.
        </Text>

        {/* Feature list */}
        <View style={s.featureList}>
          {FEATURES.map((feature) => (
            <View key={feature} style={s.featureRow}>
              <Text style={s.checkmark}>{"\u2713"}</Text>
              <Text style={s.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Error */}
        {error && <Text style={s.errorBanner}>{error}</Text>}

        {/* Subscribe button */}
        <Pressable
          style={[s.button, loading && s.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.buttonText}>Subscribe Now</Text>
          )}
        </Pressable>

        <Text style={s.footnote}>
          You'll be redirected to Stripe's secure checkout.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 24, paddingTop: 48, alignItems: "center" },

  brand: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    color: "#7e22ce",
    marginBottom: 32,
  },

  title: { fontSize: 26, fontWeight: "700", color: "#111", marginBottom: 8 },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  featureList: { width: "100%", gap: 14, marginBottom: 28 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkmark: { fontSize: 16, color: "#7e22ce", fontWeight: "700", marginTop: 1 },
  featureText: { fontSize: 15, color: "#555", flex: 1, lineHeight: 21 },

  errorBanner: {
    fontSize: 14,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: "100%",
    overflow: "hidden",
  },

  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },

  footnote: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 14,
  },
});
