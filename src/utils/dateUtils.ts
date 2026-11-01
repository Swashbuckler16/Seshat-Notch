/**
 * Seshat Notch — Local Date & Day-Boundary Utilities
 *
 * Ensures all calendar dates (`YYYY-MM-DD`) are resolved in the user's local
 * timezone rather than UTC, with support for
 * a configurable late-night day boundary hour (default: 0 = midnight).
 */

const DAY_BOUNDARY_STORAGE_KEY = 'seshat_day_boundary_hour';

/**
 * Returns the configured day boundary hour (0..6, default 0).
 * For example, if boundaryHour = 4, then 02:00 AM Monday is still treated as Sunday's planning day.
 * When boundaryHour = 0 (default), 02:00 AM Monday is Monday in local time.
 */
export function getDayBoundaryHour(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(DAY_BOUNDARY_STORAGE_KEY);
      if (raw !== null) {
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 6) {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage errors in non-browser or restricted contexts
  }
  return 0;
}

/**
 * Persists the user's preferred day boundary hour (0..6).
 */
export function setDayBoundaryHour(hour: number): void {
  const clamped = Math.max(0, Math.min(6, Math.floor(hour)));
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DAY_BOUNDARY_STORAGE_KEY, String(clamped));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Formats a Date object as `YYYY-MM-DD` using local calendar year, month, and day.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the local `YYYY-MM-DD` date string for `date` (defaults to `new Date()`),
 * adjusted by `boundaryHour` (if omitted, reads `getDayBoundaryHour()`).
 */
export function getLocalDateString(date: Date = new Date(), boundaryHour?: number): string {
  const effectiveBoundary = boundaryHour !== undefined ? boundaryHour : getDayBoundaryHour();
  if (effectiveBoundary > 0) {
    const shifted = new Date(date.getTime() - effectiveBoundary * 3_600_000);
    return formatLocalDate(shifted);
  }
  return formatLocalDate(date);
}

/**
 * Parses a `YYYY-MM-DD` date string into a local Date at 00:00:00 local time.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

/**
 * Shifts a `YYYY-MM-DD` date string by `deltaDays` calendar days and returns the
 * resulting `YYYY-MM-DD` string without UTC drift.
 */
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return formatLocalDate(d);
}
