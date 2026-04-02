/**
 * MoreScreen
 *
 * Navigation hub for all secondary screens + sign out.
 */
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "../navigation/MainTabs";
import { supabase } from "../lib/supabase";

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const menuItems: { label: string; route: keyof MoreStackParamList }[] = [
  { label: "Moods", route: "Moods" },
  { label: "Habits", route: "Habits" },
  { label: "Exercises", route: "Exercises" },
  { label: "Reflections", route: "Reflections" },
  { label: "Reviews", route: "Reviews" },
  { label: "Memory", route: "Memory" },
  { label: "Profile", route: "Profile" },
  { label: "Settings", route: "Settings" },
  { label: "Notifications", route: "Notifications" },
  { label: "Pricing", route: "Pricing" },
  { label: "Privacy", route: "Privacy" },
  { label: "Help", route: "Help" },
  { label: "Terms", route: "Terms" },
];

export function MoreScreen() {
  const navigation = useNavigation<Nav>();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>More</Text>
        {menuItems.map((item) => (
          <Pressable
            key={item.route}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route as any)}
          >
            <Text style={styles.menuLabel}>{item.label}</Text>
          </Pressable>
        ))}

        {/* Sign out */}
        <Pressable style={styles.signOutItem} onPress={handleSignOut}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#111",
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuLabel: {
    fontSize: 17,
    color: "#333",
  },
  signOutItem: {
    paddingVertical: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  signOutLabel: {
    fontSize: 17,
    color: "#dc2626",
    fontWeight: "600",
  },
});
