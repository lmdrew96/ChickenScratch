import { clsx } from 'clsx';

export function cn(...inputs: Parameters<typeof clsx>) {
  return clsx(...inputs);
}

export function getEmailDomain(email: string) {
  const [, domain] = email.trim().toLowerCase().split('@');
  return domain ?? '';
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

/**
 * Parse a config date value for display.
 *
 * Bare YYYY-MM-DD strings (e.g. "2026-05-01") are interpreted by the JS
 * runtime as UTC midnight, which shifts one day back when rendered in any
 * UTC-offset timezone like America/New_York.  Treating them as noon UTC
 * (T12:00:00Z) keeps them on the correct calendar day in every US timezone.
 *
 * Full ISO 8601 strings that already carry a UTC offset (e.g.
 * "2026-04-18T23:59:59-04:00") are passed through to `new Date()` unchanged.
 */
export function parseConfigDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
}

/**
 * Interpret a naive `YYYY-MM-DD` + `HH:mm` pair as a wall-clock time in
 * America/New_York and return the equivalent UTC Date (DST-aware).
 *
 * Use this on the server when you have separate date/time strings that
 * were picked in ET and need to become a real instant. `new Date(dateStr
 * + 'T' + timeStr)` without this helper parses as UTC on Vercel, which
 * renders 4 hours (EDT) or 5 hours (EST) behind the intended time.
 */
export function easternWallClockToDate(dateStr: string, timeStr: string): Date {
  const asIfUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const offsetLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(asIfUtc)
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-5';
  const match = offsetLabel.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return asIfUtc;
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2] ?? '0', 10);
  const minutes = parseInt(match[3] ?? '0', 10);
  const offsetMinutes = sign * (hours * 60 + minutes);
  return new Date(asIfUtc.getTime() - offsetMinutes * 60_000);
}

/**
 * Format a date as `YYYY-MM-DD` in America/New_York.
 *
 * Use this instead of `date.toISOString().split('T')[0]`, which returns the
 * UTC day and is off-by-one for ET users in the evening. Accepts any value
 * `new Date()` accepts; defaults to the current instant.
 *
 * `en-CA` is chosen because its short-date format is already `YYYY-MM-DD`.
 */
export function toEasternDateString(date: Date | string | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Return the half-open [start, end) UTC instants for a calendar month in
 * America/New_York. Use for month-window queries on timestamps stored as ET
 * start-of-day instants.
 */
export function easternMonthBounds(year: number, month: number): { start: Date; end: Date } {
  const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return {
    start: easternWallClockToDate(startStr, '00:00'),
    end: easternWallClockToDate(endStr, '00:00'),
  };
}
