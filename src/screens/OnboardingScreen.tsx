/**
 * OnboardingScreen — Multi-step wizard
 *
 * Step 1: Name + phone
 * Step 2: Goal categories
 * Step 3: Obstacles
 * Step 4: Coaching tone
 *
 * On completion, calls APIs in sequence then lets the auth state
 * listener in App.tsx re-check onboarding status and navigate.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiPatch, apiPost } from "../lib/api";
import { COACHING_TONES } from "../utils/coaching-tones";

// ── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const FOCUS_AREAS = [
  "Career growth",
  "Health and wellness",
  "Relationships",
  "Financial freedom",
  "Personal development",
  "Creativity",
];

const OBSTACLE_AREAS = [
  "Consistency",
  "Stress",
  "Time fragmentation",
  "Overwhelm",
  "Fear of failure",
  "Lack of clarity",
];

const STEP_META = [
  {
    label: "Contact",
    title: "How should we reach you?",
    hint: "Your name and phone number let Tuch send accountability check-ins via SMS.",
  },
  {
    label: "Focus areas",
    title: "What matters most right now?",
    hint: "Choose the areas you want to orient your goals and reviews around.",
  },
  {
    label: "Obstacles",
    title: "What tends to get in the way?",
    hint: "These become friction signals for interventions and coaching prompts.",
  },
  {
    label: "Coaching style",
    title: "How should your coach sound?",
    hint: "Pick the voice that will feel right when you need a nudge.",
  },
] as const;

const SETUP_MESSAGES = [
  "Saving your goals and preferences\u2026",
  "Building your personalized check-in schedule\u2026",
  "Setting up your accountability system\u2026",
  "Preparing your coach for your first conversation\u2026",
  "Getting everything ready just for you\u2026",
  "Almost there\u2026",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function toggleSetItem(set: Set<string>, item: string): Set<string> {
  const next = new Set(set);
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}

// ── Component ───────────────────────────────────────────────────────────────

export function OnboardingScreen() {
  // Wizard step (1-based)
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<"firstName" | "lastName" | "phone", string>>
  >({});

  // Step 2 & 3 selections
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [selectedObstacles, setSelectedObstacles] = useState<Set<string>>(
    new Set()
  );

  // Step 4 selection
  const [selectedTone, setSelectedTone] = useState("supportive");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [setupMessage, setSetupMessage] = useState(SETUP_MESSAGES[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, []);

  const meta = STEP_META[step - 1];

  // ── Validation ──────────────────────────────────────────────────────────

  function validateStep1(): boolean {
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!lastName.trim()) next.lastName = "Last name is required.";
    if (!phone.trim())
      next.phone = "Phone number is required for SMS check-ins.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    setErrors({});
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSetupMessage(SETUP_MESSAGES[0]);

    // Cycle through setup messages
    let msgIndex = 0;
    msgTimerRef.current = setInterval(() => {
      msgIndex = Math.min(msgIndex + 1, SETUP_MESSAGES.length - 1);
      setSetupMessage(SETUP_MESSAGES[msgIndex]);
    }, 2800);

    try {
      // 1. Update profile name
      await apiPatch("/api/v1/profiles/me", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      // 2. Update phone
      await apiPatch("/api/v1/users/me", {
        phone: phone.trim(),
      });

      // 3. Save onboarding responses
      const responses: { question_key: string; response_text: string }[] = [];

      const goalsText = Array.from(selectedGoals).join(", ");
      if (goalsText) {
        responses.push({
          question_key: "primary_goal_categories",
          response_text: goalsText,
        });
      }

      const obstaclesText = Array.from(selectedObstacles).join(", ");
      if (obstaclesText) {
        responses.push({
          question_key: "biggest_obstacles",
          response_text: obstaclesText,
        });
      }

      if (selectedTone) {
        responses.push({
          question_key: "coaching_tone",
          response_text: selectedTone,
        });
      }

      if (responses.length > 0) {
        await apiPost("/api/v1/onboarding/responses", { responses });
      }

      // 4. Save coaching tone preference
      if (selectedTone) {
        await apiPatch("/api/v1/preferences/me", {
          coaching_tone: selectedTone,
        });
      }

      // 5. Mark onboarding complete
      await apiPost("/api/v1/onboarding/complete", {});

      // Auth state listener in App.tsx will re-check and navigate
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(msg);
      setSubmitting(false);
    } finally {
      if (msgTimerRef.current) {
        clearInterval(msgTimerRef.current);
        msgTimerRef.current = null;
      }
    }
  }, [
    submitting,
    firstName,
    lastName,
    phone,
    selectedGoals,
    selectedObstacles,
    selectedTone,
  ]);

  // ── Setup / submitting overlay ──────────────────────────────────────────

  if (submitting) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.setupContainer}>
          <Text style={s.brand}>Tuch</Text>
          <ActivityIndicator
            size="large"
            color="#7e22ce"
            style={s.setupSpinner}
          />
          <Text style={s.setupHeading}>Weaving your account together</Text>
          <Text style={s.setupMessage}>{setupMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Wizard UI ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.brand}>Tuch</Text>
            <Text style={s.stepCount}>
              Step {step} of {TOTAL_STEPS}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: `${Math.round((step / TOTAL_STEPS) * 100)}%` },
              ]}
            />
          </View>

          {/* Step label + title + hint */}
          <Text style={s.stepLabel}>{meta.label}</Text>
          <Text style={s.title}>{meta.title}</Text>
          <Text style={s.hint}>{meta.hint}</Text>

          {/* Error banner */}
          {errorMessage && <Text style={s.errorBanner}>{errorMessage}</Text>}

          {/* Step 1 — Contact info */}
          {step === 1 && (
            <View style={s.form}>
              <Text style={s.label}>First name</Text>
              <TextInput
                style={[s.input, errors.firstName ? s.inputError : null]}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
                placeholder="Jane"
                placeholderTextColor="#999"
              />
              {errors.firstName && (
                <Text style={s.fieldError}>{errors.firstName}</Text>
              )}

              <Text style={s.label}>Last name</Text>
              <TextInput
                style={[s.input, errors.lastName ? s.inputError : null]}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
                placeholder="Smith"
                placeholderTextColor="#999"
              />
              {errors.lastName && (
                <Text style={s.fieldError}>{errors.lastName}</Text>
              )}

              <Text style={s.label}>
                Phone number{" "}
                <Text style={s.labelHint}>— for SMS check-ins</Text>
              </Text>
              <TextInput
                style={[s.input, errors.phone ? s.inputError : null]}
                value={phone}
                onChangeText={setPhone}
                autoComplete="tel"
                keyboardType="phone-pad"
                placeholder="+15551234567"
                placeholderTextColor="#999"
              />
              {errors.phone && (
                <Text style={s.fieldError}>{errors.phone}</Text>
              )}
            </View>
          )}

          {/* Step 2 — Focus areas */}
          {step === 2 && (
            <View style={s.choiceGrid}>
              {FOCUS_AREAS.map((area) => {
                const active = selectedGoals.has(area);
                return (
                  <Pressable
                    key={area}
                    style={[s.choiceCard, active && s.choiceCardActive]}
                    onPress={() => setSelectedGoals(toggleSetItem(selectedGoals, area))}
                  >
                    <Text
                      style={[
                        s.choiceLabel,
                        active && s.choiceLabelActive,
                      ]}
                    >
                      {area}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Step 3 — Obstacles */}
          {step === 3 && (
            <View style={s.choiceGrid}>
              {OBSTACLE_AREAS.map((area) => {
                const active = selectedObstacles.has(area);
                return (
                  <Pressable
                    key={area}
                    style={[s.choiceCard, active && s.choiceCardActive]}
                    onPress={() =>
                      setSelectedObstacles(
                        toggleSetItem(selectedObstacles, area)
                      )
                    }
                  >
                    <Text
                      style={[
                        s.choiceLabel,
                        active && s.choiceLabelActive,
                      ]}
                    >
                      {area}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Step 4 — Coaching tone */}
          {step === 4 && (
            <View style={s.toneGrid}>
              {COACHING_TONES.map((tone) => {
                const active = selectedTone === tone.value;
                return (
                  <Pressable
                    key={tone.value}
                    style={[s.toneCard, active && s.toneCardActive]}
                    onPress={() => setSelectedTone(tone.value)}
                  >
                    <Text
                      style={[s.toneLabel, active && s.toneLabelActive]}
                    >
                      {tone.label}
                    </Text>
                    <Text
                      style={[s.toneDesc, active && s.toneDescActive]}
                    >
                      {tone.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Navigation buttons */}
          <View style={s.nav}>
            {step > 1 ? (
              <Pressable style={s.backButton} onPress={handleBack}>
                <Text style={s.backButtonText}>{"\u2190"} Back</Text>
              </Pressable>
            ) : (
              <View />
            )}

            {step < TOTAL_STEPS ? (
              <Pressable style={s.button} onPress={handleNext}>
                <Text style={s.buttonText}>Continue {"\u2192"}</Text>
              </Pressable>
            ) : (
              <Pressable style={s.button} onPress={handleSubmit}>
                <Text style={s.buttonText}>Finish setup {"\u2192"}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 32 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: "#7e22ce",
  },
  stepCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },

  // Progress bar
  progressTrack: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#7e22ce",
    borderRadius: 2,
  },

  // Step content
  stepLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7e22ce",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 24,
  },

  // Error banner
  errorBanner: {
    fontSize: 14,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    overflow: "hidden",
  },

  // Form (step 1)
  form: { gap: 12 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  labelHint: {
    fontWeight: "400",
    color: "#888",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#dc2626",
  },
  fieldError: {
    fontSize: 13,
    color: "#dc2626",
    marginTop: -4,
  },

  // Choice cards (steps 2 & 3)
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  choiceCard: {
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
    minWidth: "45%",
    flexGrow: 1,
  },
  choiceCardActive: {
    borderColor: "#7e22ce",
    backgroundColor: "#f5f3ff",
  },
  choiceLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  choiceLabelActive: {
    color: "#7e22ce",
  },

  // Tone cards (step 4)
  toneGrid: {
    gap: 10,
  },
  toneCard: {
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
  },
  toneCardActive: {
    borderColor: "#7e22ce",
    backgroundColor: "#f5f3ff",
  },
  toneLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  toneLabelActive: {
    color: "#7e22ce",
  },
  toneDesc: {
    fontSize: 14,
    color: "#666",
  },
  toneDescActive: {
    color: "#6b21a8",
  },

  // Navigation
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    paddingBottom: 16,
  },
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },

  // Setup overlay
  setupContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  setupSpinner: {
    marginTop: 32,
    marginBottom: 24,
  },
  setupHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 12,
  },
  setupMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});
