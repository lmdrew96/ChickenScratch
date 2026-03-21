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
