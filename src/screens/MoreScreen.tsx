/**
 * MoreScreen
 *
 * Navigation hub for all secondary screens.
 *
 * Links to:
 *  - Moods, Habits, Exercises, Reflections, Reviews,
 *    Memory, Profile, Settings, Notifications, Pricing,
 *    Privacy, Help, Terms
 */
import { ScrollView, Text, Pressable, SafeAreaView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "../navigation/MainTabs";

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

  return (
    <SafeAreaView style={{ flex: 1 }}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
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
});
