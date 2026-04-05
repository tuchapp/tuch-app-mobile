import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import Toast from "react-native-toast-message";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "./src/lib/supabase";
import { AuthContext } from "./src/lib/auth-context";
import { apiGet, apiPost } from "./src/lib/api";
import { linking } from "./src/lib/linking";
import {
  setupNotificationHandler,
  registerForPushNotifications,
} from "./src/lib/notifications";
import { AuthStack } from "./src/navigation/AuthStack";
import { OnboardingStack } from "./src/navigation/OnboardingStack";
import { MainTabs } from "./src/navigation/MainTabs";
import type { AuthContext as AuthContextType, ApiEnvelope } from "./src/types/api-types";

// Configure notification display behaviour at module level
setupNotificationHandler();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        checkOnboarding(s);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        checkOnboarding(s);
      } else {
        setOnboardingComplete(false);
        setIsLoading(false);
      }
    });

    // Deep-link listener for OAuth / magic-link callbacks
    const linkingSub = Linking.addEventListener("url", ({ url }) => {
      handleAuthDeepLink(url);
    });

    // Check if the app was opened via a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthDeepLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  // Register push token after auth + onboarding are confirmed
  useEffect(() => {
    if (session && onboardingComplete) {
      (async () => {
        try {
          const token = await registerForPushNotifications();
          if (token) {
            await apiPost("/api/v1/users/me/push-token", {
              token,
              platform: "expo",
            });
          }
        } catch (err) {
          // Best-effort — don't block the user
          console.warn("Push token registration failed:", err);
        }
      })();
    }
  }, [session, onboardingComplete]);

  async function handleAuthDeepLink(url: string) {
    try {
      if (url.includes("auth/callback") || url.includes("type=recovery")) {
        const parsedUrl = new URL(url);

        // Handle fragment-based tokens (Supabase default)
        const fragment = parsedUrl.hash.substring(1);
        const params = new URLSearchParams(fragment || parsedUrl.search);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (type === "recovery" && accessToken) {
          await supabase.auth.verifyOtp({
            token_hash: accessToken,
            type: "recovery",
          });
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    } catch (err) {
      console.warn("Deep link auth handling failed:", err);
    }
  }

  async function checkOnboarding(s: Session) {
    try {
      const ctx = await apiGet<ApiEnvelope<AuthContextType>>("/api/v1/auth/me");
      setOnboardingComplete(ctx.data.user.onboarding_status === "completed");
    } catch {
      // If auth/me fails, assume onboarding not done
      setOnboardingComplete(false);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={{ session, isLoading, onboardingComplete }}>
        <NavigationContainer linking={linking}>
          {!session ? (
            <AuthStack />
          ) : !onboardingComplete ? (
            <OnboardingStack />
          ) : (
            <MainTabs />
          )}
        </NavigationContainer>
        <Toast />
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
