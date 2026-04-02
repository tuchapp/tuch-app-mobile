/**
 * Canonical list of available coaching tones.
 *
 * Used by:
 *  - onboarding/page.tsx          — tone selection during setup
 *  - settings/page.tsx            — tone selector in preferences form
 *  - chat/components/tone-picker  — inline tone selector on the chat page
 *
 * "supportive" is the product default for new and existing users with no
 * explicit preference stored.
 */

export const COACHING_TONES = [
  {
    value: "supportive",
    label: "Supportive",
    description: "Warm, encouraging, and steady.",
  },
  {
    value: "direct",
    label: "Direct",
    description: "Honest, concise, and no-nonsense.",
  },
  {
    value: "analytical",
    label: "Analytical",
    description: "Structured and pattern-aware.",
  },
  {
    value: "motivational",
    label: "Motivational",
    description: "High-energy and momentum-focused.",
  },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  description: string;
}>;

export type CoachingToneValue = (typeof COACHING_TONES)[number]["value"];

/** Returns the full tone object for a given value, defaulting to the supportive entry. */
export function getTone(value: string | null | undefined) {
  return COACHING_TONES.find((t) => t.value === value) ?? COACHING_TONES[0];
}

/** Returns the display label for a given tone value, defaulting to "Supportive". */
export function getToneLabel(value: string | null | undefined): string {
  return getTone(value).label;
}

/** The default tone used for new users and as a fallback when no tone is set. */
export const DEFAULT_COACHING_TONE: CoachingToneValue = "supportive";
