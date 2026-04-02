/**
 * Timezone-aware date/time formatting helpers.
 *
 * All functions accept an optional `timezone` parameter (IANA string,
 * e.g. "America/New_York").  When supplied the output is rendered in
 * that timezone; when omitted the browser's local timezone is used.
 *
 * This means server components can pass the user's stored timezone from
 * the DB and get consistent output regardless of the server's locale,
 * while client components fall back to the browser time zone naturally.
 *
 * Usage:
 *   formatDate("2026-03-24T14:30:00Z", user.timezone)
 *   → "Mar 24, 2026"  (in the user's timezone)
 */

function resolveOptions(
  timezone: string | null | undefined,
  extra: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  return timezone ? { timeZone: timezone, ...extra } : extra;
}

/**
 * ISO date-only strings (e.g. "2026-03-24") are parsed by the JS Date
 * constructor as UTC midnight, which causes off-by-one day errors in
 * western timezones (UTC-5 would render March 23 instead of March 24).
 *
 * We detect them and append T12:00:00 so they are treated as local noon,
 * which is safe across any UTC offset.
 */
function parseDateSafe(isoString: string): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(isoString.trim());
  return new Date(dateOnly ? `${isoString}T12:00:00` : isoString);
}

/**
 * "Mar 24, 2026"
 */
export function formatDate(
  isoString: string | null | undefined,
  timezone?: string | null,
): string {
  if (!isoString) return "";
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      resolveOptions(timezone, { year: "numeric", month: "short", day: "numeric" }),
    ).format(parseDateSafe(isoString));
  } catch {
    return isoString;
  }
}

/**
 * "3:30 PM"
 */
export function formatTime(
  isoString: string | null | undefined,
  timezone?: string | null,
): string {
  if (!isoString) return "";
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      resolveOptions(timezone, { hour: "numeric", minute: "2-digit" }),
    ).format(parseDateSafe(isoString));
  } catch {
    return isoString;
  }
}

/**
 * "Mar 24, 2026, 3:30 PM"
 */
export function formatDateTime(
  isoString: string | null | undefined,
  timezone?: string | null,
): string {
  if (!isoString) return "";
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      resolveOptions(timezone, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    ).format(parseDateSafe(isoString));
  } catch {
    return isoString;
  }
}

/**
 * "Monday, Mar 24" — useful for journal/recap headers.
 */
export function formatDayLabel(
  isoString: string | null | undefined,
  timezone?: string | null,
): string {
  if (!isoString) return "";
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      resolveOptions(timezone, { weekday: "long", month: "short", day: "numeric" }),
    ).format(parseDateSafe(isoString));
  } catch {
    return isoString;
  }
}

/**
 * Relative label: "Today", "Yesterday", or a formatted date.
 * Compares calendar dates in the given timezone.
 */
export function formatRelativeDate(
  isoString: string | null | undefined,
  timezone?: string | null,
): string {
  if (!isoString) return "";
  try {
    const tz = timezone ?? undefined;
    const targetDate = new Intl.DateTimeFormat("en-CA", tz ? { timeZone: tz } : {}).format(
      parseDateSafe(isoString),
    );
    const todayDate = new Intl.DateTimeFormat("en-CA", tz ? { timeZone: tz } : {}).format(
      new Date(),
    );
    const yesterdayDate = new Intl.DateTimeFormat("en-CA", tz ? { timeZone: tz } : {}).format(
      new Date(Date.now() - 86400000),
    );

    if (targetDate === todayDate) return "Today";
    if (targetDate === yesterdayDate) return "Yesterday";
    return formatDate(isoString, timezone);
  } catch {
    return isoString ?? "";
  }
}
