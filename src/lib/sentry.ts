/**
 * Sentry integration for Tuch mobile app.
 *
 * Initializes crash reporting, performance tracing, and user context.
 * DSN is read from EAS / Expo config extra fields, with an env var fallback.
 * If no DSN is set, Sentry is a no-op so dev builds aren't noisy.
 */
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const DSN: string =
  Constants.expoConfig?.extra?.sentryDsn ??
  process.env.EXPO_PUBLIC_SENTRY_DSN ??
  "";

const ENV: string =
  Constants.expoConfig?.extra?.appEnv ??
  process.env.EXPO_PUBLIC_APP_ENV ??
  "development";

export function initSentry(): void {
  if (!DSN) {
    // No DSN configured — Sentry is disabled (local dev default)
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    // Capture 100% of errors; sample 10% of transactions in production
    tracesSampleRate: ENV === "production" ? 0.1 : 1.0,
    // Replay is not enabled for mobile
    enabled: true,
    // Attach JS stack frames to errors
    attachStacktrace: true,
    // Don't send PII — Tuch handles sensitive data carefully
    sendDefaultPii: false,
    // Breadcrumbs help trace what led to a crash
    maxBreadcrumbs: 50,
  });
}

/**
 * Set Sentry user context after login.
 * Only sets the user ID — no email or PII.
 */
export function setSentryUser(userId: string): void {
  if (!DSN) return;
  Sentry.setUser({ id: userId });
}

/**
 * Clear Sentry user context on logout.
 */
export function clearSentryUser(): void {
  if (!DSN) return;
  Sentry.setUser(null);
}

/**
 * Capture a handled exception manually (for try/catch blocks you want
 * reported but don't want to crash the app).
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!DSN) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

export { Sentry };
