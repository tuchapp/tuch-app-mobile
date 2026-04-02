/**
 * HelpScreen
 *
 * FAQ accordion + crisis resources + contact support.
 */
import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Linking,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FAQ = [
  {
    q: "How does the AI coach work?",
    a: "The AI companion uses advanced language models for supportive conversations. It helps you reflect and define goals clearly, but is not a replacement for therapy.",
  },
  {
    q: "Is my data private?",
    a: "Yes. All conversations, journal entries, and mood data are tied to your account with row-level security. We never share personal data with advertisers.",
  },
  {
    q: "Can I delete my data?",
    a: "Yes. You can permanently delete all your data from the Privacy page at any time, including journals, moods, habits, reflections, and AI memories.",
  },
  {
    q: "How do habit loops work?",
    a: "Habits use the cue-routine-reward framework. Define the trigger, action, and benefit, then log daily completions to build streaks.",
  },
  {
    q: "What are reflections?",
    a: "Reflections are structured check-ins with guided questions for daily, weekly, and monthly cadences. The AI analyses your responses and surfaces patterns.",
  },
  {
    q: "How do breathing exercises help?",
    a: "Guided exercises like box breathing and 4-7-8 activate the parasympathetic nervous system to reduce stress. Even 2\u20133 minutes makes a measurable difference.",
  },
];

const CRISIS_RESOURCES = [
  { name: "988 Suicide & Crisis Lifeline", contact: "Call or text 988 (US)", link: "tel:988" },
  { name: "Crisis Text Line", contact: "Text HOME to 741741", link: "sms:741741&body=HOME" },
  {
    name: "International Association for Suicide Prevention",
    contact: "iasp.info/resources/Crisis_Centres",
    link: "https://www.iasp.info/resources/Crisis_Centres/",
  },
  { name: "Emergency services", contact: "Call 911 (US)", link: "tel:911" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HelpScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* FAQ */}
        <Text style={s.eyebrow}>Knowledge base</Text>
        <Text style={s.heading}>Frequently asked questions</Text>

        {FAQ.map((item, i) => (
          <View key={i} style={s.faqItem}>
            <Pressable style={s.faqHeader} onPress={() => toggle(i)}>
              <Text style={s.faqQ}>{item.q}</Text>
              <Text style={s.faqToggle}>{openIndex === i ? "\u2212" : "+"}</Text>
            </Pressable>
            {openIndex === i && <Text style={s.faqA}>{item.a}</Text>}
          </View>
        ))}

        {/* Contact */}
        <View style={s.section}>
          <Text style={s.eyebrow}>Support</Text>
          <Text style={s.heading}>Contact us</Text>
          <Text style={s.body}>
            Have a question, issue, or feedback? Reach out and we will get back
            to you.
          </Text>
          <Pressable
            style={s.button}
            onPress={() => Linking.openURL("mailto:support@tuch.app?subject=Help%20Request")}
          >
            <Text style={s.buttonText}>Email support@tuch.app</Text>
          </Pressable>
        </View>

        {/* Crisis resources */}
        <View style={s.crisisBox}>
          <Text style={s.crisisTitle}>
            Tuch is not a therapist or crisis service. If you or someone you know
            is in crisis, please reach out immediately.
          </Text>
          {CRISIS_RESOURCES.map((r) => (
            <Pressable
              key={r.name}
              style={s.crisisRow}
              onPress={() => Linking.openURL(r.link)}
            >
              <Text style={s.crisisName}>{r.name}</Text>
              <Text style={s.crisisContact}>{r.contact}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    marginBottom: 16,
  },
  section: { marginTop: 32 },
  body: { fontSize: 14, color: "#666", lineHeight: 21, marginBottom: 12 },

  /* FAQ */
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 12,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQ: { fontSize: 15, fontWeight: "600", color: "#111", flex: 1, marginRight: 8 },
  faqToggle: { fontSize: 20, color: "#999" },
  faqA: { fontSize: 14, color: "#666", lineHeight: 21, marginTop: 8 },

  /* Button */
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  /* Crisis */
  crisisBox: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: "rgba(180,60,60,0.25)",
    backgroundColor: "rgba(180,60,60,0.04)",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  crisisTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    lineHeight: 21,
    marginBottom: 4,
  },
  crisisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  crisisName: { fontSize: 14, fontWeight: "600", color: "#111", flex: 1, marginRight: 8 },
  crisisContact: { fontSize: 13, color: "#7e22ce" },
});
