import type { Priority } from '../types/index.ts';
import { getLocalDateString, parseLocalDate, shiftDateString } from './dateUtils.ts';

export interface ParsedTargetMetric {
  unit: string;
  value: number;
}

export interface ParsedQuickAdd {
  rawInput: string;
  title: string;
  projectQuery?: string;
  milestoneQuery?: string;
  estimateMinutes?: number;
  priority?: Priority;
  scheduleDate?: string; // YYYY-MM-DD
  scheduleDateLabel?: string; // e.g. "Today", "Tomorrow", "Friday, Nov 6"
  targetMetric?: ParsedTargetMetric;
  tags: string[];
  tokens: {
    type: 'project' | 'milestone' | 'estimate' | 'priority' | 'date' | 'metric';
    raw: string;
    value: string;
  }[];
}

/**
 * Calculates YYYY-MM-DD for a day of week relative to today in local time
 */
function resolveWeekdayDate(dayCode: string, refDate = new Date()): { dateStr: string; label: string } {
  const dayMap: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };

  const baseDateStr = getLocalDateString(refDate);
  const targetDay = dayMap[dayCode.toLowerCase()];
  if (targetDay === undefined) {
    return { dateStr: baseDateStr, label: 'Today' };
  }

  const localBase = parseLocalDate(baseDateStr);
  const currentDay = localBase.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) {
    diff += 7; // Next upcoming occurrence
  }

  const dateStr = shiftDateString(baseDateStr, diff);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return { dateStr, label: `Next ${days[targetDay]} (${dateStr})` };
}

/**
 * Resolves a date token like @today, @tomorrow, @fri, @2026-11-14
 */
export function resolveDateToken(tokenVal: string, refDate = new Date()): { dateStr: string; label: string } {
  const clean = tokenVal.toLowerCase().trim();
  const baseDateStr = getLocalDateString(refDate);

  if (clean === 'today') {
    return { dateStr: baseDateStr, label: `Today (${baseDateStr})` };
  }

  if (clean === 'tomorrow') {
    const dateStr = shiftDateString(baseDateStr, 1);
    return { dateStr, label: `Tomorrow (${dateStr})` };
  }

  if (/^(mon|tue|wed|thu|fri|sat|sun)$/i.test(clean)) {
    return resolveWeekdayDate(clean, refDate);
  }

  // Exact date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return { dateStr: clean, label: clean };
  }

  // Fallback to today
  return { dateStr: baseDateStr, label: baseDateStr };
}

/**
 * Parses time estimate tokens like ~90m, ~1.5h, ~2h, ~45
 */
export function parseEstimateToken(raw: string): number | undefined {
  const match = raw.match(/~(\d+(?:\.\d+)?)\s*(m|min|h|hr)?/i);
  if (!match) return undefined;

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'm').toLowerCase();

  if (unit.startsWith('h')) {
    return Math.round(num * 60);
  }
  return Math.round(num);
}

/**
 * Parses priority tokens like !high, !urgent, !med, !low
 */
export function parsePriorityToken(raw: string): Priority | undefined {
  const clean = raw.toLowerCase().replace(/^!/, '');
  if (['urgent', 'p0'].includes(clean)) return 'urgent';
  if (['high', 'p1'].includes(clean)) return 'high';
  if (['med', 'medium', 'p2'].includes(clean)) return 'medium';
  if (['low', 'p3'].includes(clean)) return 'low';
  return undefined;
}

/**
 * Parses target metric tokens like +pages:25 or +3
 */
export function parseMetricToken(raw: string): ParsedTargetMetric | undefined {
  const clean = raw.replace(/^\+/, '');

  // Form: unit:value e.g. pages:25
  const unitFirst = clean.match(/^([a-zA-Z_-]+):(\d+(?:\.\d+)?)$/);
  if (unitFirst) {
    return { unit: unitFirst[1], value: parseFloat(unitFirst[2]) };
  }

  // Form: value:unit e.g. 25:pages
  const valueFirst = clean.match(/^(\d+(?:\.\d+)?):([a-zA-Z_-]+)$/);
  if (valueFirst) {
    return { unit: valueFirst[2], value: parseFloat(valueFirst[1]) };
  }

  // Form: count only e.g. +5
  const countOnly = clean.match(/^(\d+(?:\.\d+)?)$/);
  if (countOnly) {
    return { unit: 'count', value: parseFloat(countOnly[1]) };
  }

  return undefined;
}

/**
 * Main Quick-Add Grammar Parser
 */
export function parseQuickAdd(input: string, refDate = new Date()): ParsedQuickAdd {
  const tokens: ParsedQuickAdd['tokens'] = [];
  const tags: string[] = [];
  let projectQuery: string | undefined;
  let milestoneQuery: string | undefined;
  let estimateMinutes: number | undefined;
  let priority: Priority | undefined;
  let scheduleDate: string | undefined;
  let scheduleDateLabel: string | undefined;
  let targetMetric: ParsedTargetMetric | undefined;

  // Split input into words while preserving grammar prefixes
  const words = input.trim().split(/\s+/);
  const remainingTitleWords: string[] = [];

  for (const word of words) {
    // 1. #project, goal, or area
    if (word.startsWith('#') && word.length > 1) {
      const val = word.substring(1);
      if (!projectQuery) {
        projectQuery = val;
        tokens.push({ type: 'project', raw: word, value: val });
      } else {
        tags.push(val);
      }
      continue;
    }

    // 2. >milestone, phase, or week
    if (word.startsWith('>') && word.length > 1) {
      const val = word.substring(1);
      milestoneQuery = val;
      tokens.push({ type: 'milestone', raw: word, value: val });
      continue;
    }

    // 3. ~estimate time (e.g. ~90m, ~1.5h)
    if (word.startsWith('~') && word.length > 1) {
      const est = parseEstimateToken(word);
      if (est !== undefined) {
        estimateMinutes = est;
        tokens.push({ type: 'estimate', raw: word, value: `${est}m` });
        continue;
      }
    }

    // 4. !priority (e.g. !high, !urgent)
    if (word.startsWith('!') && word.length > 1) {
      const prio = parsePriorityToken(word);
      if (prio !== undefined) {
        priority = prio;
        tokens.push({ type: 'priority', raw: word, value: prio });
        continue;
      }
    }

    // 5. @date (e.g. @fri, @today, @2026-11-14)
    if (word.startsWith('@') && word.length > 1) {
      const dateVal = word.substring(1);
      const res = resolveDateToken(dateVal, refDate);
      scheduleDate = res.dateStr;
      scheduleDateLabel = res.label;
      tokens.push({ type: 'date', raw: word, value: res.dateStr });
      continue;
    }

    // 6. +metric:value (e.g. +pages:10)
    if (word.startsWith('+') && word.length > 1) {
      const metric = parseMetricToken(word);
      if (metric !== undefined) {
        targetMetric = metric;
        tokens.push({ type: 'metric', raw: word, value: `${metric.value} ${metric.unit}` });
        continue;
      }
    }

    // Normal title word
    remainingTitleWords.push(word);
  }

  const title = remainingTitleWords.join(' ');

  return {
    rawInput: input,
    title: title || 'Untitled Item',
    projectQuery,
    milestoneQuery,
    estimateMinutes,
    priority: priority || 'medium',
    scheduleDate: scheduleDate || getLocalDateString(refDate),
    scheduleDateLabel: scheduleDateLabel || 'Today',
    targetMetric,
    tags,
    tokens,
  };
}
