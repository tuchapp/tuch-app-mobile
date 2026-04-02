/**
 * Shared utilities for the Tuch web app.
 *
 * Keep this file free of React imports — it is used in both client and server
 * modules.  React-specific helpers (hooks) live in apps/web/app/hooks/.
 */

import type { AccountabilityFrequency } from "../types/api-types";

// ---------------------------------------------------------------------------
// Type guards / coercions
// ---------------------------------------------------------------------------

/**
 * Safely coerce an unknown value into a string[].
 * Returns [] for anything that is not a plain array of strings.
 *
 * Shared by: chat-workspace, message-item
 */
export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

// ---------------------------------------------------------------------------
// Accountability day-picker constants
// ---------------------------------------------------------------------------

export const DAYS = [
  { code: "mon", label: "Mon" },
  { code: "tue", label: "Tue" },
  { code: "wed", label: "Wed" },
  { code: "thu", label: "Thu" },
  { code: "fri", label: "Fri" },
  { code: "sat", label: "Sat" },
  { code: "sun", label: "Sun" },
] as const;

export type DayCode = (typeof DAYS)[number]["code"];

export const DAY_ORDER: Record<DayCode, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};

/** Preset frequency options shown in the day-picker fallback select. */
export const FREQUENCY_OPTIONS: Array<{ value: AccountabilityFrequency; label: string }> = [
  { value: "daily",        label: "Daily"               },
  { value: "weekdays",     label: "Weekdays (Mon – Fri)" },
  { value: "twice_weekly", label: "Twice a week"         },
  { value: "weekly",       label: "Weekly"               },
];

// ---------------------------------------------------------------------------
// Accountability schedule helpers
// ---------------------------------------------------------------------------

/**
 * Parse a comma-separated custom schedule string (e.g. "mon,wed,fri")
 * into an array of validated DayCode values.
 */
export function parseDays(schedule: string | null | undefined): DayCode[] {
  if (!schedule) return [];
  return schedule
    .split(",")
    .map((d) => d.trim() as DayCode)
    .filter((d): d is DayCode => DAYS.some((day) => day.code === d));
}

/**
 * Given a selected-day array, return the three derived accountability values
 * used everywhere in the app:
 *
 *  - `sortedDays`         — days in Mon→Sun order
 *  - `customSchedule`     — comma-joined string, or null when no days selected
 *  - `effectiveFrequency` — "custom" when days are picked, otherwise `frequency`
 */
export function deriveSchedule(
  selectedDays: DayCode[],
  frequency: AccountabilityFrequency | ""
): {
  sortedDays: DayCode[];
  customSchedule: string | null;
  effectiveFrequency: AccountabilityFrequency | "";
} {
  const sortedDays = [...selectedDays].sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
  const customSchedule = sortedDays.length > 0 ? sortedDays.join(",") : null;
  const effectiveFrequency: AccountabilityFrequency | "" =
    sortedDays.length > 0 ? "custom" : frequency;
  return { sortedDays, customSchedule, effectiveFrequency };
}

/**
 * Capitalise the first letter of a day code for display
 * (e.g. "mon" → "Mon").  Used in reminder summary lines.
 */
export function capitaliseDay(code: DayCode): string {
  return code.charAt(0).toUpperCase() + code.slice(1);
}
