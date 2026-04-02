/**
 * PII obscuring utilities for display only.
 * These never modify underlying data — only the rendered string.
 */

const BULLET = "\u2022"; // •

export function obscureLastName(name: string | null | undefined): string {
  if (!name) return "\u2013\u2013"; // ––
  if (name.length === 1) return BULLET;
  return name[0] + BULLET.repeat(Math.min(name.length - 1, 6));
}

export function obscureEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return `${BULLET}${BULLET}${BULLET}@${BULLET}${BULLET}${BULLET}`;
  const [local, domain] = email.split("@");
  const parts = domain.split(".");
  const tld = parts.pop() || "";
  const domainName = parts[0] || "";
  return `${local[0]}${BULLET}${BULLET}${BULLET}@${domainName[0] || BULLET}${BULLET}${BULLET}${BULLET}.${tld}`;
}

export function obscurePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return BULLET.repeat(4);
  const last4 = digits.slice(-4);
  // Preserve country code prefix if present, mask everything between
  if (phone.startsWith("+")) {
    const countryCode = phone.match(/^\+\d{1,3}/)?.[0] || "+1";
    return `${countryCode} (${BULLET}${BULLET}${BULLET}) ${BULLET}${BULLET}${BULLET}-${last4}`;
  }
  return `(${BULLET}${BULLET}${BULLET}) ${BULLET}${BULLET}${BULLET}-${last4}`;
}
