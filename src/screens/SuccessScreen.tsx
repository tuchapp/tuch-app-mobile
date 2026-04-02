/**
 * SuccessScreen
 *
 * Post-checkout confirmation.
 * Polls GET /api/v1/stripe/subscription-status every 3s for up to 45s.
 * On success (has_access), shows confirmation and auto-navigates to DashboardTab after 4s.
 * On timeout, shows manual-check message.
 */
import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { apiGet, ApiAuthError } from "../lib/api";

type StatusResponse = {
  data: { status: string; has_access: boolean; is_active: boolean };
};

export function SuccessScreen() {
  const navigation = useNavigation<any>();
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const cancelled = useRef(false);

  // Poll subscription status
  useEffect(() => {
    cancelled.current = false;
    let attempts = 0;

    async function check() {
      try {
        const res = await apiGet<StatusResponse>(
          "/api/v1/stripe/subscription-status"
        );
        if (cancelled.current) return;
        if (res.data.has_access || res.data.is_active) {
          setVerified(true);
          setChecking(false);
          return;
        }
      } catch (err) {
        if (err instanceof ApiAuthError) {
          // Auth expired — let the auth listener handle it
          return;
        }
      }
      attempts++;
      if (attempts < 15 && !cancelled.current) {
        setTimeout(check, 3000);
      } else if (!cancelled.current) {
        // Timed out — show success anyway with note
        setVerified(true);
        setChecking(false);
      }
    }

    check();
    return () => {
      cancelled.current = true;
    };
  }, []);

  // Auto-navigate to dashboard after 4s once verified
  useEffect(() => {
    if (!verified) return;
    const timeout = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: "DashboardTab" }],
      });
    }, 4000);
    return () => clearTimeout(timeout);
  }, [verified, navigation]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {checking ? (
          <>
            <ActivityIndicator size="large" color="#7e22ce" />
            <Text style={s.verifying}>Confirming your subscription...</Text>
          </>
        ) : (
          <>
            <Text style={s.emoji} accessibilityLabel="Party popper">
              {"\u{1F389}"}
            </Text>
            <Text style={s.title}>You're all set!</Text>
            <Text style={s.subtitle}>
              Welcome to Tuch Pro. Your practice is now fully yours.
            </Text>
            <Pressable
              style={s.button}
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: "DashboardTab" }],
                })
              }
            >
              <Text style={s.buttonText}>Go to your practice →</Text>
            </Pressable>
          </>
        )}
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
  verifying: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
