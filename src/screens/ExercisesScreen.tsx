/**
 * ExercisesScreen — Breathing exercises + Body Scan
 *
 * Two exercises:
 *  - Box Breathing (4-4-4-4 pattern)
 *  - Body Scan (guided steps through body regions)
 *
 * API: POST /api/v1/exercises/completions
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiPost } from "../lib/api";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type ExerciseId = "box" | "bodyscan";
type BreathingPhase = { label: string; duration: number };

const EXERCISES = [
  {
    id: "box" as ExerciseId,
    name: "Box Breathing",
    description: "4-4-4-4 pattern to calm your nervous system",
    duration: "~2 min",
    durationSeconds: 128,
    category: "breathing",
    emoji: "\uD83D\uDCA8",
  },
  {
    id: "bodyscan" as ExerciseId,
    name: "Body Scan",
    description: "Journey through your body releasing tension",
    duration: "~3 min",
    durationSeconds: 185,
    category: "body_scan",
    emoji: "\uD83E\uDDD8",
  },
];

// Box breathing technique
const BOX_PHASES: BreathingPhase[] = [
  { label: "Inhale", duration: 4 },
  { label: "Hold", duration: 4 },
  { label: "Exhale", duration: 4 },
  { label: "Hold", duration: 4 },
];
const BOX_CYCLES = 4;

// Body scan regions
const BODY_REGIONS = [
  { name: "Feet & Toes", instruction: "Bring your awareness to your feet. Notice any tension, warmth, or tingling.", duration: 20, emoji: "\uD83E\uDDB6" },
  { name: "Legs & Knees", instruction: "Move your attention up through your calves and thighs. Release any tightness.", duration: 20, emoji: "\uD83E\uDDB5" },
  { name: "Hips & Lower Back", instruction: "Feel the base of your spine. Breathe into any tension and let it dissolve.", duration: 20, emoji: "\uD83C\uDF00" },
  { name: "Belly & Core", instruction: "Notice your belly rising and falling. Soften your abdomen.", duration: 20, emoji: "\uD83C\uDF0A" },
  { name: "Chest & Heart", instruction: "Bring awareness to your chest. Allow it to expand with each breath.", duration: 20, emoji: "\uD83D\uDC9A" },
  { name: "Shoulders & Arms", instruction: "Let your shoulders drop. Let heaviness flow down through your arms.", duration: 20, emoji: "\uD83D\uDCAA" },
  { name: "Neck & Throat", instruction: "Soften your jaw. Unclench your teeth. Let your tongue rest.", duration: 20, emoji: "\uD83D\uDDE3\uFE0F" },
  { name: "Face & Head", instruction: "Relax your forehead, your eyes, your cheeks. Let your face become soft.", duration: 20, emoji: "\uD83D\uDE0C" },
  { name: "Whole Body", instruction: "Expand your awareness to your entire body. Rest here for a moment.", duration: 25, emoji: "\u2728" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function recordCompletion(category: string, name: string, durationSeconds: number) {
  try {
    await apiPost("/api/v1/exercises/completions", {
      exercise_type: category,
      exercise_name: name,
      duration_seconds: durationSeconds,
    });
  } catch {
    // Non-fatal — completion tracking should not break the exercise flow
    console.warn("Failed to record exercise completion");
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BreathingExercise({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsRunning(false);
    setCurrentPhase(0);
    setCurrentCycle(0);
    setCountdown(0);
  }, []);

  const start = () => {
    setFinished(false);
    setCurrentPhase(0);
    setCurrentCycle(0);
    setCountdown(BOX_PHASES[0].duration);
    setIsRunning(true);
  };

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCurrentPhase((phase) => {
            const nextPhase = phase + 1;
            if (nextPhase >= BOX_PHASES.length) {
              setCurrentCycle((cycle) => {
                const nextCycle = cycle + 1;
                if (nextCycle >= BOX_CYCLES) {
                  if (timerRef.current) clearInterval(timerRef.current);
                  timerRef.current = null;
                  setIsRunning(false);
                  setFinished(true);
                  onComplete();
                  return cycle;
                }
                return nextCycle;
              });
              setTimeout(() => setCountdown(BOX_PHASES[0].duration), 0);
              return 0;
            }
            setTimeout(() => setCountdown(BOX_PHASES[nextPhase].duration), 0);
            return nextPhase;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, onComplete]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const phase = BOX_PHASES[currentPhase];

  return (
    <View style={s.exerciseContainer}>
      <Pressable style={s.backButton} onPress={onBack}>
        <Text style={s.backButtonText}>Back</Text>
      </Pressable>

      <Text style={s.exerciseTitle}>Box Breathing</Text>
      <Text style={s.exerciseDesc}>
        Equal counts of inhale, hold, exhale, hold — used to calm the nervous system.
      </Text>

      {/* Breathing circle */}
      <View style={s.circleOuter}>
        <View
          style={[
            s.circleInner,
            isRunning && s.circleActive,
          ]}
        >
          {isRunning ? (
            <View style={s.circleContent}>
              <Text style={s.countdownText}>{countdown}</Text>
              <Text style={s.phaseLabel}>{phase?.label}</Text>
            </View>
          ) : finished ? (
            <View style={s.circleContent}>
              <Text style={s.countdownText}>Done</Text>
              <Text style={s.phaseLabel}>Well done</Text>
            </View>
          ) : (
            <Text style={s.readyText}>Ready</Text>
          )}
        </View>
      </View>

      {/* Cycle dots */}
      {isRunning && (
        <View style={s.dotsRow}>
          {Array.from({ length: BOX_CYCLES }).map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i < currentCycle && s.dotComplete,
                i === currentCycle && s.dotCurrent,
              ]}
            />
          ))}
        </View>
      )}

      {/* Controls */}
      <View style={s.controlsRow}>
        {isRunning ? (
          <Pressable style={s.secondaryButton} onPress={stop}>
            <Text style={s.secondaryButtonText}>Stop</Text>
          </Pressable>
        ) : (
          <Pressable style={s.primaryButton} onPress={start}>
            <Text style={s.primaryButtonText}>{finished ? "Again" : "Begin"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function BodyScanExercise({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsRunning(false);
    setCurrentRegion(0);
    setCountdown(0);
  }, []);

  const start = () => {
    setFinished(false);
    setCurrentRegion(0);
    setCountdown(BODY_REGIONS[0].duration);
    setIsRunning(true);
  };

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCurrentRegion((region) => {
            const next = region + 1;
            if (next >= BODY_REGIONS.length) {
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = null;
              setIsRunning(false);
              setFinished(true);
              onComplete();
              return region;
            }
            setTimeout(() => setCountdown(BODY_REGIONS[next].duration), 0);
            return next;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, onComplete]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const region = BODY_REGIONS[currentRegion];
  const totalRegions = BODY_REGIONS.length;
  const progress = isRunning
    ? (currentRegion + (region.duration - countdown) / region.duration) / totalRegions
    : finished
    ? 1
    : 0;

  return (
    <View style={s.exerciseContainer}>
      <Pressable style={s.backButton} onPress={onBack}>
        <Text style={s.backButtonText}>Back</Text>
      </Pressable>

      <Text style={s.exerciseTitle}>Body Scan</Text>
      <Text style={s.exerciseDesc}>
        A guided journey through your body. Notice sensations without judgement.
      </Text>

      {/* Progress bar */}
      <View style={s.progressBarTrack}>
        <View style={[s.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      {isRunning ? (
        <View style={s.regionContainer}>
          <Text style={s.regionEmoji}>{region.emoji}</Text>
          <Text style={s.regionName}>{region.name}</Text>
          <Text style={s.regionInstruction}>{region.instruction}</Text>
          <View style={s.timerCircle}>
            <Text style={s.timerText}>{countdown}</Text>
          </View>
          {/* Region dots */}
          <View style={s.dotsRow}>
            {BODY_REGIONS.map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  i < currentRegion && s.dotComplete,
                  i === currentRegion && s.dotCurrent,
                ]}
              />
            ))}
          </View>
        </View>
      ) : finished ? (
        <View style={s.finishedContainer}>
          <Text style={s.finishedEmoji}>{"\uD83E\uDDD8"}</Text>
          <Text style={s.exerciseTitle}>Scan Complete</Text>
          <Text style={s.exerciseDesc}>
            Take a moment to notice how your body feels now.
          </Text>
        </View>
      ) : (
        <View style={s.previewContainer}>
          <View style={s.regionChips}>
            {BODY_REGIONS.map((r, i) => (
              <View key={i} style={s.chip}>
                <Text style={s.chipText}>{r.emoji} {r.name}</Text>
              </View>
            ))}
          </View>
          <Text style={s.durationNote}>~3 minutes</Text>
        </View>
      )}

      {/* Controls */}
      <View style={s.controlsRow}>
        {isRunning ? (
          <Pressable style={s.secondaryButton} onPress={stop}>
            <Text style={s.secondaryButtonText}>Stop</Text>
          </Pressable>
        ) : (
          <Pressable style={s.primaryButton} onPress={start}>
            <Text style={s.primaryButtonText}>{finished ? "Again" : "Begin Scan"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ExercisesScreen() {
  const [active, setActive] = useState<ExerciseId | null>(null);

  const handleComplete = (exercise: typeof EXERCISES[number]) => {
    recordCompletion(exercise.category, exercise.name, exercise.durationSeconds);
  };

  if (active === "box") {
    return (
      <SafeAreaView style={s.safeArea}>
        <ScrollView contentContainerStyle={s.scrollContent}>
          <BreathingExercise
            onComplete={() => handleComplete(EXERCISES[0])}
            onBack={() => setActive(null)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (active === "bodyscan") {
    return (
      <SafeAreaView style={s.safeArea}>
        <ScrollView contentContainerStyle={s.scrollContent}>
          <BodyScanExercise
            onComplete={() => handleComplete(EXERCISES[1])}
            onBack={() => setActive(null)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        <Text style={s.screenTitle}>Exercises</Text>
        <Text style={s.sectionEyebrow}>MINDFULNESS</Text>
        <Text style={s.sectionTitle}>Guided exercises</Text>
        <Text style={s.introText}>
          Take a mindful pause. Choose an exercise to guide you through a few minutes of calm.
        </Text>

        {EXERCISES.map((ex) => (
          <Pressable
            key={ex.id}
            style={s.exerciseCard}
            onPress={() => setActive(ex.id)}
          >
            <View style={s.cardHeader}>
              <View style={s.iconBox}>
                <Text style={s.iconEmoji}>{ex.emoji}</Text>
              </View>
              <Text style={s.cardDuration}>{ex.duration}</Text>
            </View>
            <Text style={s.cardName}>{ex.name}</Text>
            <Text style={s.cardDesc}>{ex.description}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BRAND = "#7e22ce";
const BRAND_LIGHT = "rgba(126, 34, 206, 0.1)";

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 24, paddingBottom: 40 },
  screenTitle: { fontSize: 28, fontWeight: "700", color: "#111", marginBottom: 24 },
  sectionEyebrow: { fontSize: 12, fontWeight: "600", color: BRAND, letterSpacing: 1, marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 8 },
  introText: { fontSize: 14, color: "#666", lineHeight: 22, marginBottom: 16 },

  // Exercise cards
  exerciseCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: 20 },
  cardDuration: { fontSize: 12, color: "#999" },
  cardName: { fontSize: 16, fontWeight: "600", color: "#111", marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#666", lineHeight: 19 },

  // Exercise detail
  exerciseContainer: { alignItems: "center", gap: 16 },
  backButton: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 },
  backButtonText: { fontSize: 15, color: BRAND, fontWeight: "500" },
  exerciseTitle: { fontSize: 22, fontWeight: "700", color: "#111", textAlign: "center" },
  exerciseDesc: { fontSize: 14, color: "#666", lineHeight: 22, textAlign: "center", maxWidth: 300 },

  // Breathing circle
  circleOuter: { width: 180, height: 180, alignItems: "center", justifyContent: "center", marginVertical: 16 },
  circleInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "rgba(126, 34, 206, 0.2)",
    backgroundColor: "rgba(126, 34, 206, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {
    borderColor: "rgba(126, 34, 206, 0.6)",
    backgroundColor: "rgba(126, 34, 206, 0.1)",
  },
  circleContent: { alignItems: "center" },
  countdownText: { fontSize: 36, fontWeight: "700", color: "#111" },
  phaseLabel: { fontSize: 14, color: BRAND, marginTop: 4 },
  readyText: { fontSize: 14, color: "#999" },

  // Dots
  dotsRow: { flexDirection: "row", gap: 6, justifyContent: "center", flexWrap: "wrap" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e5e7eb" },
  dotComplete: { backgroundColor: BRAND },
  dotCurrent: { backgroundColor: "rgba(126, 34, 206, 0.5)" },

  // Body scan
  progressBarTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "#e5e7eb", overflow: "hidden", marginBottom: 16 },
  progressBarFill: { height: "100%", borderRadius: 3, backgroundColor: BRAND },
  regionContainer: { alignItems: "center", gap: 12, paddingVertical: 8 },
  regionEmoji: { fontSize: 36 },
  regionName: { fontSize: 18, fontWeight: "700", color: "#111" },
  regionInstruction: { fontSize: 14, color: "#666", lineHeight: 22, textAlign: "center", fontStyle: "italic", maxWidth: 320 },
  timerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(126, 34, 206, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: { fontSize: 15, color: "#111", fontWeight: "600" },
  finishedContainer: { alignItems: "center", gap: 8, paddingVertical: 24 },
  finishedEmoji: { fontSize: 48 },
  previewContainer: { alignItems: "center", gap: 12, paddingVertical: 16 },
  regionChips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  chipText: { fontSize: 12, color: "#666" },
  durationNote: { fontSize: 13, color: "#999" },

  // Controls
  controlsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  primaryButton: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  secondaryButtonText: { fontSize: 16, color: "#333", fontWeight: "500" },
});
