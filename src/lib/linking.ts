import * as Linking from "expo-linking";
import type { LinkingOptions } from "@react-navigation/native";

const prefix = Linking.createURL("/");

/**
 * Deep-linking configuration for React Navigation.
 *
 * Typed loosely because the app uses conditional navigator trees
 * (Auth vs Onboarding vs Main) which don't share a single param list.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const linking: LinkingOptions<any> = {
  prefixes: [prefix, "tuchapp://"],
  config: {
    screens: {
      // Auth stack
      Login: "login",
      ForgotPassword: "forgot-password",
      ResetPassword: "reset-password",
      // Main tabs
      DashboardTab: "dashboard",
      GoalsTab: {
        screens: {
          GoalsList: "goals",
          GoalDetail: "goals/:goalId",
          GoalEdit: "goals/:goalId/edit",
        },
      },
      ChatTab: "chat",
      JournalTab: "journal",
      MoreTab: {
        screens: {
          Settings: "settings",
          Profile: "profile",
          Moods: "moods",
          Habits: "habits",
          Exercises: "exercises",
          Reflections: "reflections",
          Reviews: "reviews",
          Memory: "memory",
          Notifications: "notifications",
          Pricing: "pricing",
          Privacy: "privacy",
          Help: "help",
          Terms: "terms",
        },
      },
    },
  },
};
