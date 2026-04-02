/**
 * PrivacyScreen
 *
 * 8 privacy commitment sections + danger zone link to Settings.
 */
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "../navigation/MainTabs";

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const SECTIONS = [
  {
    icon: "\u{1F512}",
    title: "End-to-End Encryption",
    description:
      "Your journal entries are encrypted in transit and at rest using industry-standard TLS and AES-256. Your private thoughts stay private.",
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "Strict Access Controls",
    description:
      "All data is protected by row-level security. Only you can access your journals, conversations, mood logs, and reflections.",
  },
  {
    icon: "\u{1F39B}\uFE0F",
    title: "Granular AI Access Tiers",
    description:
      "You control exactly what data the AI can access: Structured Only, Structured + Redacted, or Full Access with automatic PII redaction.",
  },
  {
    icon: "\u{1F6AB}",
    title: "Automatic PII Redaction",
    description:
      "Before any text is shared with the AI, a redaction pipeline strips personally identifiable information such as emails, phone numbers, and names.",
  },
  {
    icon: "\u{2699}\uFE0F",
    title: "Per-Category Data Sharing Controls",
    description:
      "Toggle whether the AI may access your mood notes, journal insights, reflection summaries, and raw journal text. All changes are audit-logged.",
  },
  {
    icon: "\u{1F9EA}",
    title: "AI Training Data \u2014 Opt-In Only",
    description:
      "None of your data is used to train AI models by default. You may opt in via Settings and withdraw consent at any time.",
  },
  {
    icon: "\u{1F5D1}\uFE0F",
    title: "Right to Delete All Data",
    description:
      "You can permanently delete all your data at any time \u2014 journal entries, conversations, mood logs, habits, reflections, insights, and AI memories.",
  },
  {
    icon: "\u{1F6AB}",
    title: "No Sale of Sensitive Data",
    description:
      "We will never sell, share, or monetise your personal data. Your mental health journey is not a product. Tuch is funded by subscriptions.",
  },
];

export function PrivacyScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <Text style={s.eyebrow}>Our commitments</Text>
        <Text style={s.heading}>How we protect your data</Text>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={s.card}>
            <Text style={s.cardIcon}>{section.icon}</Text>
            <Text style={s.cardTitle}>{section.title}</Text>
            <Text style={s.cardDesc}>{section.description}</Text>
          </View>
        ))}

        <Text style={s.updated}>
          Last updated: March 2026. Questions? Visit the Help page.
        </Text>

        {/* Danger zone */}
        <View style={s.dangerZone}>
          <Text style={s.dangerTitle}>Danger zone</Text>
          <Text style={s.dangerDesc}>
            To delete your data or account, go to Settings.
          </Text>
          <Pressable
            style={s.dangerButton}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={s.dangerButtonText}>Go to Settings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 24, paddingBottom: 48 },
  eyebrow: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7e22ce",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardIcon: { fontSize: 22, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 4 },
  cardDesc: { fontSize: 14, color: "#666", lineHeight: 21 },
  updated: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  dangerZone: {
    borderWidth: 1,
    borderColor: "rgba(180,60,60,0.25)",
    backgroundColor: "rgba(180,60,60,0.04)",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  dangerTitle: { fontSize: 16, fontWeight: "700", color: "#b43c3c" },
  dangerDesc: { fontSize: 14, color: "#666", lineHeight: 21 },
  dangerButton: {
    backgroundColor: "rgba(180,60,60,0.9)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
