import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "./src/lib/supabase";
import { AuthContext } from "./src/lib/auth-context";
import { apiGet } from "./src/lib/api";
import { AuthStack } from "./src/navigation/AuthStack";
import { OnboardingStack } from "./src/navigation/OnboardingStack";
import { MainTabs } from "./src/navigation/MainTabs";
import type { AuthContext as AuthContextType, ApiEnvelope } from "./src/types/api-types";

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

    return () => subscription.unsubscribe();
  }, []);

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
        <NavigationContainer>
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
