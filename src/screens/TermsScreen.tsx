/**
 * TermsScreen
 *
 * 13 static sections with short summaries.
 */
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By using Tuch you agree to these Terms and our Privacy Policy.",
  },
  {
    title: "2. Description of Service",
    body: "Tuch is a personal accountability and goal-coaching app with tools for goal tracking, journaling, mood logging, and AI-assisted coaching for personal use.",
  },
  {
    title: "3. Your Account",
    body: "You are responsible for keeping your credentials confidential and for all activity under your account.",
  },
  {
    title: "4. Privacy and Data",
    body: "Your use is also governed by our Privacy Policy. We protect your personal data as described there.",
  },
  {
    title: "5. Acceptable Use",
    body: "Do not use Tuch to violate laws, transmit harmful content, or interfere with the service.",
  },
  {
    title: "6. AI-Assisted Features",
    body: "AI coaching suggestions and insights are informational only and do not constitute professional advice.",
  },
  {
    title: "7. SMS and Email Communications",
    body: "By enabling reminders you consent to SMS/email messages. Opt out any time by replying STOP or adjusting settings.",
  },
  {
    title: "8. Intellectual Property",
    body: "Tuch content and software are our property. You retain ownership of content you create in the app.",
  },
  {
    title: "9. Disclaimers",
    body: "The service is provided as-is without warranties of any kind.",
  },
  {
    title: "10. Limitation of Liability",
    body: "Tuch is not liable for indirect, incidental, or consequential damages from use of the service.",
  },
  {
    title: "11. Changes to Terms",
    body: "We may modify these Terms at any time. Continued use after changes constitutes acceptance.",
  },
  {
    title: "12. Governing Law",
    body: "These Terms are governed by applicable law. Disputes shall be resolved in the appropriate courts.",
  },
  {
    title: "13. Contact",
    body: "Questions about these Terms? Contact us through the Help section of the app.",
  },
];

export function TermsScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.eyebrow}>Legal</Text>
        <Text style={s.heading}>Terms & Conditions</Text>
        <Text style={s.updated}>Last updated: March 2026</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <Text style={s.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={s.footer}>
          <Text style={s.footerText}>
            By using Tuch you acknowledge that you have read, understood, and
            agree to these Terms and Conditions.
          </Text>
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
    marginBottom: 4,
  },
  updated: {
    fontSize: 13,
    color: "#999",
    marginBottom: 20,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  sectionBody: { fontSize: 14, color: "#666", lineHeight: 21 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
    marginTop: 8,
  },
  footerText: { fontSize: 13, color: "#999", lineHeight: 20 },
});
