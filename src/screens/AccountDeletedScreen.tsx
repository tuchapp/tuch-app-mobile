/**
 * AccountDeletedScreen
 *
 * Static confirmation after account/data deletion.
 * "Return to login" signs out via Supabase (triggers auth state change).
 */
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export function AccountDeletedScreen() {
  async function handleReturnToLogin() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.title}>Your account has been deleted</Text>

        <Text style={s.body}>
          All your data — goals, check-in history, journal entries, coach
          conversations, and personal information — has been permanently removed.
        </Text>

        <Text style={s.body}>
          A confirmation email has been sent to your address on file.
        </Text>

        <View style={s.divider} />

        <Text style={s.small}>
          If you did not request this deletion or believe it was done in error,
          please contact{" "}
          <Text
            style={s.link}
            onPress={() => Linking.openURL("mailto:support@tuch.app")}
          >
            support@tuch.app
          </Text>{" "}
          as soon as possible.
        </Text>

        <Pressable style={s.button} onPress={handleReturnToLogin}>
          <Text style={s.buttonText}>Return to login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: "#666",
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 12,
  },
  divider: {
    width: "80%",
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 16,
  },
  small: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  link: { color: "#7e22ce", textDecorationLine: "underline" },
  button: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  buttonText: { fontSize: 15, color: "#333", fontWeight: "600" },
});
