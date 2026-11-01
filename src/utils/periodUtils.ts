import type { TargetHorizon } from '../types/index.ts';
import { getLocalDateString, parseLocalDate, shiftDateString } from './dateUtils.ts';

/**
 * Multi-Horizon Period Utilities (PRD Section 6.2 & 6.3)
 * Handles ISO 8601 week calculations, month formats, and day strings cleanly.
 */

export function getCurrentPeriod(horizon: TargetHorizon, date = new Date()): string {
  const localDayStr = getLocalDateString(date);
  const [y, m] = localDayStr.split('-');

  if (horizon === 'month') {
    return `${y}-${m}`;
  }

  if (horizon === 'day') {
    return localDayStr;
  }

  // Week horizon (YYYY-Www)
  return getISOWeekString(parseLocalDate(localDayStr));
}

/**
 * Returns ISO week string, e.g. "2026-W44"
 */
export function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Human-friendly period label matching the calm product language
 */
export function formatPeriodLabel(period: string, horizon: TargetHorizon): string {
  if (horizon === 'month') {
    const parts = period.split('-');
    if (parts.length === 2) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${MONTH_NAMES[monthIdx]} ${year}`;
      }
    }
    return period;
  }

  if (horizon === 'week') {
    const match = period.match(/^(\d{4})-W(\d{2})$/);
    if (match) {
      const year = match[1];
      const weekNum = parseInt(match[2], 10);
      const range = getWeekDateRange(period);
      return `Week ${weekNum}, ${year} (${range.shortLabel})`;
    }
    return period;
  }

  // Day horizon
  if (horizon === 'day') {
    const date = new Date(`${period}T00:00:00`);
    if (!isNaN(date.getTime())) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      return `${dayName}, ${monthName} ${date.getDate()}, ${date.getFullYear()}`;
    }
  }

  return period;
}

/**
 * Calculates start and end Date for an ISO week string
 */
export function getWeekDateRange(weekStr: string): { start: Date; end: Date; shortLabel: string } {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    const now = new Date();
    return { start: now, end: now, shortLabel: weekStr };
  }

  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  // Jan 4th is always in week 1
  const simple = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = simple.getUTCDay() || 7;
  const monday = new Date(simple.getTime());
  monday.setUTCDate(simple.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);

  const sunday = new Date(monday.getTime());
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const startMonth = monday.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const endMonth = sunday.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

  let shortLabel: string;
  if (startMonth === endMonth) {
    shortLabel = `${startMonth} ${monday.getUTCDate()}–${sunday.getUTCDate()}`;
  } else {
    shortLabel = `${startMonth} ${monday.getUTCDate()} – ${endMonth} ${sunday.getUTCDate()}`;
  }

  return { start: monday, end: sunday, shortLabel };
}

/**
 * Navigate to previous or next period
 */
export function getAdjacentPeriod(
  period: string,
  horizon: TargetHorizon,
  direction: 'prev' | 'next'
): string {
  const delta = direction === 'next' ? 1 : -1;

  if (horizon === 'month') {
    const [yStr, mStr] = period.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) + delta;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  if (horizon === 'week') {
    const range = getWeekDateRange(period);
    const mid = new Date(range.start.getTime());
    mid.setUTCDate(mid.getUTCDate() + (delta * 7));
    return getISOWeekString(mid);
  }

  // Day horizon
  return shiftDateString(period, delta);
}

/**
 * Get the sub-periods for cascading (e.g. Month -> Weeks in month, Week -> Days in week)
 */
export function getSubPeriods(
  period: string,
  parentHorizon: TargetHorizon
): { period: string; label: string }[] {
  if (parentHorizon === 'month') {
    // Generate the 4-5 weeks that overlap with this month
    const [yStr, mStr] = period.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);

    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0));

    const weeks = new Map<string, string>();
    const curr = new Date(firstDay.getTime());

    while (curr <= lastDay) {
      const weekStr = getISOWeekString(curr);
      if (!weeks.has(weekStr)) {
        const range = getWeekDateRange(weekStr);
        weeks.set(weekStr, range.shortLabel);
      }
      curr.setUTCDate(curr.getUTCDate() + 3); // Jump forward
    }

    return Array.from(weeks.entries()).map(([w, label], idx) => ({
      period: w,
      label: `Week ${idx + 1} (${label})`,
    }));
  }

  if (parentHorizon === 'week') {
    // 7 days in this week: Monday through Sunday
    const range = getWeekDateRange(period);
    const days: { period: string; label: string }[] = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(range.start.getTime());
      dayDate.setUTCDate(range.start.getUTCDate() + i);
      const y = dayDate.getUTCFullYear();
      const m = String(dayDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dayDate.getUTCDate()).padStart(2, '0');
      const isoDay = `${y}-${m}-${d}`;
      const monthShort = dayDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      days.push({
        period: isoDay,
        label: `${dayNames[i]} (${monthShort} ${dayDate.getUTCDate()})`,
      });
    }

    return days;
  }

  return [];
}
