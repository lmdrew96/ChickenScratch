// Shared date formatters pinned to America/New_York so 'use client' components
// render identical strings during SSR (Vercel runs UTC) and hydration (browser
// local tz) — eliminates React error #418 hydration mismatches around dates.

const ET = 'America/New_York';

export function formatDateShortET(d: Date | string | number): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: ET,
  });
}

export function formatDateMedET(d: Date | string | number): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: ET,
  });
}

export function formatWeekdayET(d: Date | string | number): string {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: ET,
  });
}

export function formatTimeET(d: Date | string | number): string {
  return new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ET,
  });
}
