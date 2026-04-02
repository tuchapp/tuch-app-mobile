import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type AuthState = {
  session: Session | null;
  isLoading: boolean;
  /** Whether onboarding is completed (fetched from backend after login). */
  onboardingComplete: boolean;
};

export const AuthContext = createContext<AuthState>({
  session: null,
  isLoading: true,
  onboardingComplete: false,
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
